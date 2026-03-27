import { describe, it, expect } from "vitest";
import { mapToolChoice, extractUsageMetrics, type LanguageModelUsageLike } from "./ai-sdk-helpers.js";

describe("mapToolChoice", () => {
  it("returns undefined for falsy input", () => {
    expect(mapToolChoice(null)).toBeUndefined();
    expect(mapToolChoice(undefined)).toBeUndefined();
  });

  it.each(["auto", "none", "required"] as const)("maps string '%s'", (v) => {
    expect(mapToolChoice(v)).toBe(v);
  });

  it("maps unknown string to auto", () => {
    expect(mapToolChoice("something")).toBe("auto");
  });

  it("maps function tool choice", () => {
    expect(mapToolChoice({ type: "function", function: { name: "myTool" } }))
      .toEqual({ type: "tool", toolName: "myTool" });
  });

  it("returns undefined for non-function object", () => {
    expect(mapToolChoice({ type: "other" })).toBeUndefined();
  });
});

describe("extractUsageMetrics", () => {
  const baseUsage: LanguageModelUsageLike = {
    inputTokens: 100,
    outputTokens: 50,
    inputTokenDetails: {},
    outputTokenDetails: {},
  };

  it("returns basic token counts", () => {
    expect(extractUsageMetrics(baseUsage)).toEqual({
      inputTokens: 100,
      outputTokens: 50,
    });
  });

  it("extracts cache tokens from inputTokenDetails", () => {
    const usage: LanguageModelUsageLike = {
      ...baseUsage,
      inputTokenDetails: { cacheReadTokens: 10, cacheWriteTokens: 5 },
    };
    const result = extractUsageMetrics(usage);
    expect(result.cacheReadTokens).toBe(10);
    expect(result.cacheWriteTokens).toBe(5);
  });

  it("extracts reasoning tokens from outputTokenDetails", () => {
    const usage: LanguageModelUsageLike = {
      ...baseUsage,
      outputTokenDetails: { reasoningTokens: 20 },
    };
    expect(extractUsageMetrics(usage).reasoningTokens).toBe(20);
  });

  it("falls back to cachedInputTokens", () => {
    const usage: LanguageModelUsageLike = {
      ...baseUsage,
      cachedInputTokens: 7,
    };
    expect(extractUsageMetrics(usage).cacheReadTokens).toBe(7);
  });

  it("deep-searches providerMetadata for cache tokens", () => {
    const meta = { anthropic: { cache_read_input_tokens: 42 } };
    expect(extractUsageMetrics(baseUsage, meta).cacheReadTokens).toBe(42);
  });

  it("deep-searches raw usage for reasoning tokens", () => {
    const usage: LanguageModelUsageLike = {
      ...baseUsage,
      raw: { completion_tokens_details: { reasoning_tokens: 15 } },
    };
    expect(extractUsageMetrics(usage).reasoningTokens).toBe(15);
  });

  it("handles sparse usage objects", () => {
    expect(
      extractUsageMetrics({
        inputTokens: 3,
        outputTokens: 4,
      }),
    ).toEqual({
      inputTokens: 3,
      outputTokens: 4,
    });
  });
});
