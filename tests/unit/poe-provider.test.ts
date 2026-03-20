import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPoe } from "../../src/poe-provider.js";
import { updateRoutingMap, _resetRoutingCache, setRefetchFn, resolveProvider } from "../../src/poe-models.js";

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
    _resetRoutingCache();
    const poe = createPoe();
    const model = poe("openai/gpt-5.2");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gpt-5.2");
  });

  it.skip("routes google/* to openai responses provider, stripping prefix", () => {
    const poe = createPoe();
    const model = poe("google/gemini-pro");
    expect(model.provider).toBe("openai.responses");
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

describe("resolveProvider with routing cache", () => {
  beforeEach(() => {
    _resetRoutingCache();
  });

  afterEach(() => {
    _resetRoutingCache();
  });

  it("routes via /v1/responses when cache says so", () => {
    updateRoutingMap([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("openai/gpt-5.2")).toEqual({ provider: "openai-responses", model: "gpt-5.2" });
  });

  it("routes via /v1/chat/completions only", () => {
    updateRoutingMap([
      { id: "gpt-4o", supported_endpoints: ["/v1/chat/completions"] },
    ]);
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-chat", model: "gpt-4o" });
  });

  it("routes empty supported_endpoints to chat completions", () => {
    updateRoutingMap([
      { id: "gpt-old", supported_endpoints: [] },
    ]);
    expect(resolveProvider("openai/gpt-old")).toEqual({ provider: "openai-chat", model: "gpt-old" });
  });

  it("uses first endpoint when both are supported", () => {
    updateRoutingMap([
      { id: "model-a", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
      { id: "model-b", supported_endpoints: ["/v1/chat/completions", "/v1/responses"] },
    ]);
    expect(resolveProvider("openai/model-a")).toEqual({ provider: "openai-responses", model: "model-a" });
    expect(resolveProvider("openai/model-b")).toEqual({ provider: "openai-chat", model: "model-b" });
  });

  it("API overrides hardcoded set", () => {
    // gpt-4o is in OPENAI_CHAT_ONLY, but API says /v1/responses
    updateRoutingMap([
      { id: "gpt-4o", supported_endpoints: ["/v1/responses"] },
    ]);
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-responses", model: "gpt-4o" });
  });

  it("anthropic prefix always routes to anthropic regardless of endpoints", () => {
    updateRoutingMap([
      { id: "claude-sonnet-4", supported_endpoints: ["/v1/responses", "/v1/chat/completions"] },
    ]);
    expect(resolveProvider("anthropic/claude-sonnet-4")).toEqual({ provider: "anthropic", model: "claude-sonnet-4" });
  });

  it("falls back to chat completions when cache is cold", () => {
    // No updateRoutingMap called — cache is null, everything defaults to chat
    expect(resolveProvider("openai/gpt-4o")).toEqual({ provider: "openai-chat", model: "gpt-4o" });
    expect(resolveProvider("openai/gpt-5.2")).toEqual({ provider: "openai-chat", model: "gpt-5.2" });
  });

  it("triggers background refetch on cache miss", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    setRefetchFn(refetch);
    updateRoutingMap([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses"] },
    ]);

    // Unknown model — not in cache
    resolveProvider("openai/brand-new-model");
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });

  it("does not trigger refetch when cache is cold", () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    setRefetchFn(refetch);
    // No cache populated
    resolveProvider("openai/gpt-5.2");
    expect(refetch).not.toHaveBeenCalled();
  });

  it("falls back to chat completions when model missing from cache and refetch fails", async () => {
    const refetch = vi.fn().mockRejectedValue(new Error("API down"));
    setRefetchFn(refetch);
    updateRoutingMap([
      { id: "gpt-5.2", supported_endpoints: ["/v1/responses"] },
    ]);

    // Unknown model — not in bundled or API cache, and refetch will fail
    const result = resolveProvider("openai/totally-new-model");
    expect(result).toEqual({ provider: "openai-chat", model: "totally-new-model" });

    // Refetch fires but its failure doesn't break anything
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });

  it("dedupes concurrent refetches", async () => {
    let resolve: () => void;
    const refetch = vi.fn().mockImplementation(() => new Promise<void>(r => { resolve = r; }));
    setRefetchFn(refetch);
    updateRoutingMap([]);

    resolveProvider("openai/unknown-1");
    resolveProvider("openai/unknown-2");
    resolveProvider("openai/unknown-3");

    resolve!();
    await vi.waitFor(() => expect(refetch).toHaveBeenCalledOnce());
  });
});
