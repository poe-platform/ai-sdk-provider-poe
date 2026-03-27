import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateText } from "ai";
import { createPoe } from "./poe-provider.js";
import { fetchPoeModels, _resetModelCache, setRefetchFn, resolveProvider } from "./poe-models.js";
import { expectReasoningText } from "./test/index.js";

const mockFetch = (data: unknown[]) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data }),
  }) as unknown as typeof globalThis.fetch;

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** Populate model store with given endpoint mappings. */
async function seedModels(entries: { id: string; owned_by?: string; supported_endpoints?: string[] }[]) {
  const data = entries.map(e => ({ ...e, object: "model", created: 1 }));
  await fetchPoeModels({ fetch: mockFetch(data) });
}

describe("createPoe", () => {
  beforeEach(() => {
    vi.stubEnv("POE_API_KEY", "test-key");
  });

  it("returns a callable provider", () => {
    const poe = createPoe();
    expect(typeof poe).toBe("function");
    expect(typeof poe.languageModel).toBe("function");
  });

  it("routes anthropic/* to anthropic provider", () => {
    const poe = createPoe();
    const model = poe("anthropic/claude-sonnet-4-20250514");
    expect(model.provider).toBe("anthropic.messages");
    expect(model.modelId).toBe("claude-sonnet-4-20250514");
  });

  it("routes openai/* to chat completions when cache is cold", () => {
    _resetModelCache(true);
    try {
      const poe = createPoe();
      const model = poe("openai/gpt-5.2");
      expect(model.provider).toBe("openai.chat");
      expect(model.modelId).toBe("gpt-5.2");
    } finally {
      _resetModelCache();
    }
  });

  it("routes google/* to chat completions, stripping prefix", () => {
    const poe = createPoe();
    const model = poe("google/gemini-pro");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gemini-pro");
  });

  it("routes openai/ multimedia models to chat completions", () => {
    const poe = createPoe();
    const model = poe("openai/gpt-image-1.5");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gpt-image-1.5");
  });

  it("routes openai/ completions-only models to chat completions", () => {
    const poe = createPoe();
    const model = poe("openai/gpt-4-turbo");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gpt-4-turbo");
  });

  it("strips prefix for default fallback route", () => {
    const poe = createPoe();
    const model = poe("custom/my-model");
    expect(model.modelId).toBe("my-model");
  });

  it("routes models without / to chat completions with full name", () => {
    const poe = createPoe();
    const model = poe("Kimi-K2.5");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("Kimi-K2.5");
  });

  it("uses custom baseURL", () => {
    const poe = createPoe({ baseURL: "https://custom.api.com/v1" });
    const model = poe("anthropic/claude-sonnet-4-20250514");
    expect(model).toBeDefined();
  });

  it("routes unknown model to chat completions even when /v1/models fails", () => {
    const poe = createPoe({
      fetch: () => Promise.reject(new Error("network error")),
    });
    const model = poe("brand-new-model-not-in-bundled");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("brand-new-model-not-in-bundled");
  });

  it("throws when called with new keyword", () => {
    const poe = createPoe();
    expect(() => new (poe as any)("anthropic/claude-sonnet-4-20250514")).toThrow(
      "The Poe provider cannot be called with the new keyword."
    );
  });
});

describe("resolveProvider with model store", () => {
  beforeEach(() => {
    _resetModelCache(true);
  });

  afterEach(() => {
    _resetModelCache();
  });

  it("routes via /v1/responses when store says so", async () => {
    await seedModels([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("openai/gpt-5.2")).toEqual({ provider: "openai-responses", model: "gpt-5.2" });
  });

  it("routes via /v1/chat/completions only", async () => {
    await seedModels([
      { id: "gpt-4o", supported_endpoints: ["/v1/chat/completions"] },
    ]);
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-chat", model: "gpt-4o" });
  });

  it("routes google/* to chat completions even when store has /v1/responses", async () => {
    await seedModels([
      { id: "gemini-3.1-pro", owned_by: "Google", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("google/gemini-3.1-pro")).toEqual({ provider: "openai-chat", model: "gemini-3.1-pro" });
  });

  it("routes Google-owned models without prefix to chat completions", async () => {
    await seedModels([
      { id: "gemini-3.1-pro", owned_by: "Google", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("gemini-3.1-pro")).toEqual({ provider: "openai-chat", model: "gemini-3.1-pro" });
  });

  it("routes google/* to chat completions when store only has /v1/chat/completions", async () => {
    await seedModels([
      { id: "gemini-old", owned_by: "Google", supported_endpoints: ["/v1/chat/completions"] },
    ]);
    expect(resolveProvider("google/gemini-old")).toEqual({ provider: "openai-chat", model: "gemini-old" });
  });

  it("routes google/* prefix to chat completions when cache is cold", () => {
    expect(resolveProvider("google/gemini-unknown")).toEqual({ provider: "openai-chat", model: "gemini-unknown" });
  });

  it("routes empty supported_endpoints to chat completions", async () => {
    await seedModels([
      { id: "gpt-old", supported_endpoints: [] },
    ]);
    expect(resolveProvider("openai/gpt-old")).toEqual({ provider: "openai-chat", model: "gpt-old" });
  });

  it("prefers responses over chat completions regardless of order", async () => {
    await seedModels([
      { id: "model-a", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
      { id: "model-b", supported_endpoints: ["/v1/chat/completions", "/v1/responses"] },
    ]);
    expect(resolveProvider("openai/model-a")).toEqual({ provider: "openai-responses", model: "model-a" });
    expect(resolveProvider("openai/model-b")).toEqual({ provider: "openai-responses", model: "model-b" });
  });

  it("API overrides bundled data", async () => {
    await seedModels([
      { id: "gpt-4o", supported_endpoints: ["/v1/responses"] },
    ]);
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-responses", model: "gpt-4o" });
  });

  it("routes via /v1/messages to anthropic provider", async () => {
    await seedModels([
      { id: "claude-sonnet-4", supported_endpoints: ["/v1/messages", "/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("claude-sonnet-4")).toEqual({ provider: "anthropic", model: "claude-sonnet-4" });
  });

  it("anthropic prefix always routes to anthropic regardless of endpoints", async () => {
    await seedModels([
      { id: "claude-sonnet-4", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("anthropic/claude-sonnet-4")).toEqual({ provider: "anthropic", model: "claude-sonnet-4" });
  });

  it("falls back to chat completions when cache is cold", () => {
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-chat", model: "gpt-4o" });
    expect(resolveProvider("openai/gpt-5.2")).toEqual({ provider: "openai-chat", model: "gpt-5.2" });
  });

  it("triggers background refetch on cache miss", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    setRefetchFn(refetch);
    await seedModels([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses"] },
    ]);

    resolveProvider("openai/brand-new-model");
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });

  it("does not trigger refetch when cache is cold", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    setRefetchFn(refetch);
    resolveProvider("openai/gpt-5.2");
    expect(refetch).not.toHaveBeenCalled();
  });

  it("falls back to chat completions when model missing and refetch fails", async () => {
    const refetch = vi.fn().mockRejectedValue(new Error("API down"));
    setRefetchFn(refetch);
    await seedModels([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses"] },
    ]);

    const result = resolveProvider("openai/totally-new-model");
    expect(result).toEqual({ provider: "openai-chat", model: "totally-new-model" });
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });

  it("dedupes concurrent refetches", async () => {
    let resolve: () => void;
    const refetch = vi.fn().mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    setRefetchFn(refetch);
    await seedModels([{ id: "existing", supported_endpoints: ["/v1/chat/completions"] }]);

    resolveProvider("openai/unknown-1");
    resolveProvider("openai/unknown-2");
    resolveProvider("openai/unknown-3");

    resolve!();
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });
});

describe("reasoning passthrough", () => {
  beforeEach(() => {
    vi.stubEnv("POE_API_KEY", "test-key");
    _resetModelCache(true);
  });

  afterEach(() => {
    _resetModelCache();
  });

  it("maps poe reasoning budget tokens to anthropic thinking and returns reasoning text", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.endsWith("/models")) {
        return jsonResponse({ data: [] });
      }

      expect(url).toBe("https://api.poe.com/v1/messages");

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("claude-sonnet-4");
      expect(body.thinking).toEqual({
        type: "enabled",
        budget_tokens: 5000,
      });

      return jsonResponse({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4",
        content: [
          { type: "thinking", thinking: "reasoning here", signature: "sig" },
          { type: "text", text: "56" },
        ],
        stop_reason: "end_turn",
        usage: {
          input_tokens: 1,
          output_tokens: 1,
        },
      });
    }) as typeof globalThis.fetch;

    const poe = createPoe({ fetch });
    const result = await generateText({
      model: poe("anthropic/claude-sonnet-4"),
      prompt: "What is 7 * 8?",
      providerOptions: {
        poe: {
          reasoningBudgetTokens: 5000,
        },
      },
    });

    expect(result.text).toBe("56");
    expect(expectReasoningText(result.reasoning)).toContain("reasoning here");
  });

  it("maps poe reasoning params to responses reasoning config and returns reasoning text", async () => {
    await fetchPoeModels({
      fetch: mockFetch([
        {
          id: "o3",
          object: "model",
          created: 1,
          supported_endpoints: ["/v1/responses"],
        },
      ]),
    });

    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.endsWith("/models")) {
        return jsonResponse({
          data: [
            {
              id: "o3",
              object: "model",
              created: 1,
              supported_endpoints: ["/v1/responses"],
            },
          ],
        });
      }

      expect(url).toBe("https://api.poe.com/v1/responses");

      const body = JSON.parse(String(init?.body));
      expect(body.model).toBe("o3");
      expect(body.reasoning).toEqual({
        effort: "high",
        summary: "auto",
      });

      return jsonResponse({
        id: "resp_1",
        object: "response",
        created_at: 1,
        model: "o3",
        status: "completed",
        output: [
          {
            id: "rs_1",
            type: "reasoning",
            summary: [{ type: "summary_text", text: "reasoning here" }],
          },
          {
            id: "msg_1",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: "56",
                annotations: [],
                logprobs: [],
              },
            ],
          },
        ],
        text: { format: { type: "text" } },
        usage: {
          input_tokens: 1,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 2,
          output_tokens_details: { reasoning_tokens: 1 },
          total_tokens: 3,
        },
        reasoning: { effort: "high", summary: null },
        tool_choice: "auto",
        tools: [],
        parallel_tool_calls: true,
        truncation: "disabled",
        temperature: 1,
        top_p: 1,
        metadata: {},
      });
    }) as typeof globalThis.fetch;

    const poe = createPoe({ fetch });
    const result = await generateText({
      model: poe("openai/o3"),
      prompt: "What is 7 * 8?",
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(result.text).toBe("56");
    expect(expectReasoningText(result.reasoning)).toContain("reasoning here");
  });

  it("keeps explicit anthropic thinking over poe reasoning budget tokens", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.endsWith("/models")) {
        return jsonResponse({ data: [] });
      }

      expect(url).toBe("https://api.poe.com/v1/messages");

      const body = JSON.parse(String(init?.body));
      expect(body.thinking).toEqual({
        type: "enabled",
        budget_tokens: 7000,
      });

      return jsonResponse({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4",
        content: [{ type: "text", text: "56" }],
        stop_reason: "end_turn",
        usage: {
          input_tokens: 1,
          output_tokens: 1,
        },
      });
    }) as typeof globalThis.fetch;

    const poe = createPoe({ fetch });
    const result = await generateText({
      model: poe("anthropic/claude-sonnet-4"),
      prompt: "What is 7 * 8?",
      providerOptions: {
        poe: {
          reasoningBudgetTokens: 5000,
        },
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 7000 },
        },
      },
    });

    expect(result.text).toBe("56");
  });

  it("keeps explicit openai reasoning config over poe reasoning params", async () => {
    await fetchPoeModels({
      fetch: mockFetch([
        {
          id: "o3",
          object: "model",
          created: 1,
          supported_endpoints: ["/v1/responses"],
        },
      ]),
    });

    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (url.endsWith("/models")) {
        return jsonResponse({
          data: [
            {
              id: "o3",
              object: "model",
              created: 1,
              supported_endpoints: ["/v1/responses"],
            },
          ],
        });
      }

      expect(url).toBe("https://api.poe.com/v1/responses");

      const body = JSON.parse(String(init?.body));
      expect(body.reasoning).toEqual({
        effort: "low",
        summary: "auto",
      });

      return jsonResponse({
        id: "resp_1",
        object: "response",
        created_at: 1,
        model: "o3",
        status: "completed",
        output: [
          {
            id: "msg_1",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: "56",
                annotations: [],
                logprobs: [],
              },
            ],
          },
        ],
        text: { format: { type: "text" } },
        usage: {
          input_tokens: 1,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 2,
          output_tokens_details: { reasoning_tokens: 1 },
          total_tokens: 3,
        },
        reasoning: { effort: "low", summary: null },
        tool_choice: "auto",
        tools: [],
        parallel_tool_calls: true,
        truncation: "disabled",
        temperature: 1,
        top_p: 1,
        metadata: {},
      });
    }) as typeof globalThis.fetch;

    const poe = createPoe({ fetch });
    const result = await generateText({
      model: poe("openai/o3"),
      prompt: "What is 7 * 8?",
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "detailed",
        },
        openai: {
          reasoningEffort: "low",
          reasoningSummary: "auto",
        },
      },
    });

    expect(result.text).toBe("56");
  });
});
