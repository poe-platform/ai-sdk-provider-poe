import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { readFileSync } from "fs";
import { createPoe } from "./poe-provider.js";
import { getStoredModels } from "./poe-models.js";
import { MODEL_OVERRIDES } from "./model-overrides.js";
import { expectReasoningText, getSnapshotFetch } from "./test/index.js";

const bannerImage = readFileSync(
  new URL("./test/fixtures/banner.jpg", import.meta.url)
);

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

const REASONING_PROMPT =
  "Solve this step by step. First explain your reasoning, then give the final answer on a separate line: What is 17 * 19?";

async function expectOpenAIReasoning(modelId: string) {
  const { text, reasoning } = await generateText({
    model: poe(`openai/${modelId}`),
    prompt: REASONING_PROMPT,
    providerOptions: {
      poe: {
        reasoningEffort: "high",
        reasoningSummary: "auto",
      },
    },
  });

  expect(text).toContain("323");
  expectReasoningText(reasoning);
}

describe("openai provider", () => {
  for (const m of getStoredModels().filter(m => m.owned_by === "OpenAI")) {
    describe(m.id, () => {
      const override = MODEL_OVERRIDES[m.id];
      const run = override?.skip ? it.skip : it;
      const hasTools = (m.supported_features?.includes("tools") ?? false) && !override?.skipTools;
      const outputMods = m.output_modalities ?? [];
      const tags: string[] = [];
      if (outputMods.includes("video")) tags.push("timeout:video");
      else if (outputMods.includes("image") && !outputMods.includes("text")) tags.push("timeout:image");
      const opts = tags.length ? { tags } : {};

      run(`generates text with ${m.id}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`openai/${m.id}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (hasTools) {
        run(`handles tool calling with ${m.id}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`openai/${m.id}`),
            prompt:
              "What is the weather in San Francisco? Use the getWeather tool.",
            tools: {
              getWeather: tool({
                description: "Get the current weather for a location",
                inputSchema: z.object({
                  location: z.string().describe("The city to get weather for"),
                }),
              }),
            },
          });
          expect(toolCalls.length).toBeGreaterThan(0);
          expect(toolCalls[0].toolName).toBe("getWeather");
        });
      }
    });
  }

  it("returns reasoning text with openai/gpt-5.4", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.4");
  });

  it.skip("returns reasoning text with openai/gpt-5.4-nano", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.4-nano"); // upstream: summary frequently empty
  });

  it("returns reasoning text with openai/gpt-5.4-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.4-mini");
  });

  it.skip("returns reasoning text with openai/gpt-5.4-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.4-pro");
  });

  it.skip("returns reasoning text with openai/gpt-5.3-codex", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.3-codex"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/gpt-5.3-instant", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.3-instant"); // upstream: only supports medium effort
  });

  it("returns reasoning text with openai/gpt-5.2", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.2");
  });

  it.skip("returns reasoning text with openai/gpt-5.2-instant", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.2-instant"); // upstream: only supports medium effort
  });

  it("returns reasoning text with openai/gpt-5.2-codex", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.2-codex");
  });

  it.skip("returns reasoning text with openai/gpt-5.3-codex-spark", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.3-codex-spark"); // upstream: summary not supported
  });

  it.skip("returns reasoning text with openai/gpt-5.2-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.2-pro");
  });

  it.skip("returns reasoning text with openai/gpt-5.1-codex", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.1-codex"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/gpt-5.1-instant", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.1-instant"); // upstream: only supports medium effort
  });

  it.skip("returns reasoning text with openai/gpt-5.1", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.1"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/gpt-5-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5-pro");
  });

  it.skip("returns reasoning text with openai/gpt-5.1-codex-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.1-codex-mini"); // upstream: summary frequently empty
  });

  it("returns reasoning text with openai/gpt-5.1-codex-max", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5.1-codex-max");
  });

  it("returns reasoning text with openai/gpt-5", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5");
  });

  it.skip("returns reasoning text with openai/gpt-5-chat", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5-chat"); // upstream: reasoning array empty
  });

  it("returns reasoning text with openai/gpt-5-nano", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5-nano");
  });

  it("returns reasoning text with openai/gpt-5-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5-mini");
  });

  it.skip("returns reasoning text with openai/gpt-5-codex", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-5-codex"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/o4-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o4-mini"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/o4-mini-deep-research", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o4-mini-deep-research");
  });

  it.skip("returns reasoning text with openai/o3-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o3-pro");
  });

  it.skip("returns reasoning text with openai/o3", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o3"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/o3-deep-research", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o3-deep-research");
  });

  it("returns reasoning text with openai/o1", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o1");
  });

  it.skip("returns reasoning text with openai/o1-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o1-pro");
  });

  it.skip("returns reasoning text with openai/o3-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o3-mini"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/o3-mini-high", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("o3-mini-high"); // upstream: summary frequently empty
  });

  it.skip("returns reasoning text with openai/gpt-4o", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4o"); // non-reasoning model
  });

  it.skip("returns reasoning text with openai/gpt-4o-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4o-mini"); // non-reasoning model
  });

  it.skip("returns reasoning text with openai/gpt-4o-aug", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4o-aug"); // non-reasoning model
  });

  it.skip("returns reasoning text with openai/gpt-4.1", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4.1"); // non-reasoning model
  });

  it.skip("returns reasoning text with openai/gpt-4.1-mini", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4.1-mini"); // non-reasoning model
  });

  it.skip("returns reasoning text with openai/gpt-4.1-nano", { tags: ["timeout:reasoning"] }, async () => {
    await expectOpenAIReasoning("gpt-4.1-nano"); // non-reasoning model
  });

  it("handles vision with gpt-5.2", async () => {
    const { text } = await generateText({
      model: poe("openai/gpt-5.2"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is on this image? Be brief." },
            { type: "image", image: bannerImage },
          ],
        },
      ],
    });

    expect(text.toLowerCase()).toContain("poe");
  });

  it("handles vision with gpt-5.2 via URL", async () => {
    const { text } = await generateText({
      model: poe("openai/gpt-5.2"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is on this image? Be brief." },
            {
              type: "image",
              image: new URL(
                "https://raw.githubusercontent.com/poe-platform/ai-sdk-provider-poe/refs/heads/main/tests/fixtures/banner.jpg"
              ),
            },
          ],
        },
      ],
    });

    expect(text.toLowerCase()).toContain("poe");
  });
});
