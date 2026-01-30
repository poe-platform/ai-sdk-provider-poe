import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPoe } from "../../src/poe-provider.js";

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

  it("routes openai/* to openai responses provider", () => {
    const poe = createPoe();
    const model = poe("openai/gpt-4o");
    expect(model.provider).toBe("openai.responses");
    expect(model.modelId).toBe("gpt-4o");
  });

  it("routes other/* to openai chat completions, stripping prefix", () => {
    const poe = createPoe();
    const model = poe("google/gemini-pro");
    expect(model.provider).toBe("openai.chat");
    expect(model.modelId).toBe("gemini-pro");
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

  it("throws when called with new keyword", () => {
    const poe = createPoe();
    expect(() => new (poe as any)("anthropic/claude-sonnet-4-20250514")).toThrow(
      "The Poe provider cannot be called with the new keyword."
    );
  });
});
