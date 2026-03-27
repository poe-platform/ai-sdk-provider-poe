import { describe, it, expect, beforeEach } from "vitest";
import { applyAnthropicBudget } from "./anthropic-budget.js";
import { _resetModelCache, fetchPoeModels } from "../../poe-models.js";
import type { PoeModelInfo } from "../models.js";

const base: PoeModelInfo = {
  id: "test",
  rawId: "test",
  created: 0,
  contextWindow: 0,
  maxOutputTokens: 0,
  supportsImages: false,
  supportsPromptCache: false,
};

async function seedModels(data: Record<string, unknown>[]) {
  await fetchPoeModels({
    apiKey: "test",
    fetch: async () => new Response(JSON.stringify({ data })),
  });
}

describe("applyAnthropicBudget", () => {
  beforeEach(() => _resetModelCache(true));

  describe("budget models (Anthropic + reasoning declared)", () => {
    it.each([
      "claude-opus-4.6",
      "claude-sonnet-4.6",
      "claude-sonnet-4.5",
      "claude-sonnet-4",
      "claude-opus-4.5",
      "claude-opus-4",
      "claude-opus-4.1",
      "claude-haiku-4.5",
    ])("%s → supportsReasoningBudget", async (id) => {
      await seedModels([{ id, owned_by: "Anthropic", reasoning: { supports_reasoning_effort: true } }]);
      const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "Anthropic" });
      expect(m.supportsReasoningBudget).toBe(true);
    });
  });

  describe("no reasoning field → no budget", () => {
    it.each([
      "claude-haiku-3.5",
      "claude-haiku-3",
    ])("%s → no budget", async (id) => {
      await seedModels([{ id, owned_by: "Anthropic", reasoning: null }]);
      const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "Anthropic" });
      expect(m.supportsReasoningBudget).toBeUndefined();
    });
  });

  describe("non-Anthropic unchanged", () => {
    it.each(["gpt-5.4", "o3", "gemini-3-flash"])
      ("%s → unchanged", async (id) => {
        await seedModels([{ id, owned_by: "OpenAI", reasoning: { supports_reasoning_effort: true } }]);
        const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "OpenAI" });
        expect(m.supportsReasoningBudget).toBeUndefined();
      });
  });

  it("does not override existing value", async () => {
    await seedModels([{ id: "claude-opus-4.6", owned_by: "Anthropic", reasoning: { supports_reasoning_effort: true } }]);
    const m = applyAnthropicBudget({ ...base, rawId: "claude-opus-4.6", ownedBy: "Anthropic", supportsReasoningBudget: true });
    expect(m.supportsReasoningBudget).toBe(true);
  });
});
