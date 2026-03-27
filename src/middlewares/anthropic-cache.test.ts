import { describe, it, expect, vi } from "vitest";
import type { LanguageModelV3, LanguageModelV3Prompt } from "@ai-sdk/provider";
import { withAnthropicCache } from "./anthropic-cache.js";

function fakeModel(provider: string): LanguageModelV3 {
  return { provider } as unknown as LanguageModelV3;
}

async function transform(model: LanguageModelV3, prompt: LanguageModelV3Prompt, providerOptions?: Record<string, unknown>) {
  const wrapped = withAnthropicCache(model);
  // Access the middleware via the internal wrapLanguageModel structure
  // We test by calling doGenerate and inspecting what the middleware produces
  const params = { prompt, providerOptions } as any;
  // The middleware is applied via wrapLanguageModel, so we need to extract the transformParams
  // Instead, let's test the exported function's behavior end-to-end via a simpler approach
  return params;
}

// To properly test middleware, we intercept the model's doGenerate
function captureTransformedParams(provider: string) {
  let capturedParams: any;
  const baseModel = {
    provider,
    specificationVersion: "v3",
    modelId: "test",
    defaultObjectGenerationMode: undefined,
    doGenerate: vi.fn(async (params: any) => {
      capturedParams = params;
      return {
        text: "hello",
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0 },
        rawCall: { rawPrompt: "", rawSettings: {} },
      };
    }),
    doStream: vi.fn(),
  } as unknown as LanguageModelV3;

  const wrapped = withAnthropicCache(baseModel);
  return {
    wrapped,
    getCaptured: () => capturedParams,
    baseModel,
  };
}

describe("withAnthropicCache", () => {
  it("returns model unchanged for non-anthropic providers", () => {
    const model = fakeModel("openai.chat");
    expect(withAnthropicCache(model)).toBe(model);
  });

  it("adds cache control to system message", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: [{ type: "text", text: "Hi" }] },
      ],
    } as any);

    const params = getCaptured();
    expect(params.prompt[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("adds cache control to last text part of last 2 user messages", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        { role: "system", content: "System" },
        { role: "user", content: [{ type: "text", text: "First" }] },
        { role: "assistant", content: [{ type: "text", text: "Reply" }] },
        { role: "user", content: [{ type: "text", text: "Second" }] },
        { role: "assistant", content: [{ type: "text", text: "Reply2" }] },
        { role: "user", content: [{ type: "text", text: "Third" }] },
      ],
    } as any);

    const params = getCaptured();
    // First user message should NOT have cache control (only last 2)
    expect(params.prompt[1].content[0].providerOptions).toBeUndefined();
    // Second user message (index 3) should have it
    expect(params.prompt[3].content[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
    // Third user message (index 5) should have it
    expect(params.prompt[5].content[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });

  it("does not override existing cache control on system message", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        {
          role: "system",
          content: "System",
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } } },
        },
        { role: "user", content: [{ type: "text", text: "Hi" }] },
      ],
    } as any);

    const params = getCaptured();
    expect(params.prompt[0].providerOptions.anthropic.cacheControl).toEqual({ type: "ephemeral", ttl: "1h" });
  });

  it("does not override existing cache control on user text part", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        { role: "system", content: "System" },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hi",
              providerOptions: { anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } } },
            },
          ],
        },
      ],
    } as any);

    const params = getCaptured();
    expect(params.prompt[1].content[0].providerOptions.anthropic.cacheControl).toEqual({ type: "ephemeral", ttl: "1h" });
  });

  it("skips when poe.cache is false", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        { role: "system", content: "System" },
        { role: "user", content: [{ type: "text", text: "Hi" }] },
      ],
      providerOptions: { poe: { cache: false } },
    } as any);

    const params = getCaptured();
    expect(params.prompt[0].providerOptions).toBeUndefined();
    expect(params.prompt[1].content[0].providerOptions).toBeUndefined();
  });

  it("marks last text part when user message has multiple parts", async () => {
    const { wrapped, getCaptured } = captureTransformedParams("anthropic.messages");
    await wrapped.doGenerate({
      inputFormat: "prompt",
      mode: { type: "regular" },
      prompt: [
        { role: "system", content: "System" },
        {
          role: "user",
          content: [
            { type: "text", text: "Part 1" },
            { type: "file", data: new Uint8Array(), mediaType: "image/png" },
            { type: "text", text: "Part 2" },
          ],
        },
      ],
    } as any);

    const params = getCaptured();
    // First text part should NOT have cache control
    expect(params.prompt[1].content[0].providerOptions).toBeUndefined();
    // Last text part (index 2) should have it
    expect(params.prompt[1].content[2].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
  });
});
