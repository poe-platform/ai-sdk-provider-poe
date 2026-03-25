import { describe, it, expect } from "vitest";
import { applyAnthropicBudget } from "./anthropic-budget.js";
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

describe("applyAnthropicBudget", () => {
  // Source: Anthropic pricing / model docs
  // Models with supportsReasoningBudget: true
  describe("budget models", () => {
    it.each([
      // claude-sonnet-4-6
      "claude-sonnet-4.6",
      // claude-sonnet-4-5, claude-sonnet-4-20250514
      "claude-sonnet-4.5",
      "claude-sonnet-4",
      // claude-opus-4-6
      "claude-opus-4.6",
      // claude-opus-4-5-20251101, claude-opus-4-20250514
      "claude-opus-4.5",
      "claude-opus-4",
      // claude-opus-4-1-20250805
      "claude-opus-4.1",
      // claude-haiku-4-5-20251001
      "claude-haiku-4.5",
    ])("%s → supportsReasoningBudget", (id) => {
      const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "Anthropic" });
      expect(m.supportsReasoningBudget).toBe(true);
    });
  });

  // Models WITHOUT supportsReasoningBudget
  describe("no budget", () => {
    it.each([
      // claude-3-7-sonnet-20250219 (only :thinking variant supports it)
      "claude-sonnet-3.7",
      // claude-3-5-haiku-20241022
      "claude-haiku-3.5",
      // claude-3-haiku-20240307
      "claude-haiku-3",
    ])("%s → no budget", (id) => {
      const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "Anthropic" });
      expect(m.supportsReasoningBudget).toBeUndefined();
    });
  });

  describe("non-Anthropic unchanged", () => {
    it.each(["gpt-5.4", "o3", "gemini-3-flash"])
      ("%s → unchanged", (id) => {
        const m = applyAnthropicBudget({ ...base, rawId: id, ownedBy: "OpenAI" });
        expect(m.supportsReasoningBudget).toBeUndefined();
      });
  });

  it("does not override existing value", () => {
    const m = applyAnthropicBudget({ ...base, rawId: "claude-opus-4.6", ownedBy: "Anthropic", supportsReasoningBudget: true });
    expect(m.supportsReasoningBudget).toBe(true);
  });
});
