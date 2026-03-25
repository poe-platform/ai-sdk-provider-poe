import { describe, it, expect } from "vitest";
import { applyXaiEffort } from "./xai-effort.js";
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

const m = (rawId: string, effort: boolean | string[] = true) =>
  applyXaiEffort({ ...base, rawId, supportsReasoningEffort: effort });

describe("applyXaiEffort", () => {
  // Source: https://docs.x.ai/docs/api-reference
  describe("grok-3-mini → specific effort levels", () => {
    it("grok-3-mini boolean → [low, high]", () => {
      expect(m("grok-3-mini").supportsReasoningEffort).toEqual(["low", "high"]);
    });

    it("grok-3-mini explicit array → unchanged", () => {
      const efforts = ["low", "high"];
      expect(m("grok-3-mini", efforts).supportsReasoningEffort).toBe(efforts);
    });
  });

  describe("no reasoning budget on any xAI model", () => {
    it.each([
      "grok-4.1-fast-reasoning",
      "grok-4.1-fast-non-reasoning",
      "grok-4",
      "grok-4-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-3",
      "grok-3-mini",
      "grok-code-fast-1",
    ])("%s → no supportsReasoningBudget", (id) => {
      const result = applyXaiEffort({ ...base, rawId: id });
      expect(result.supportsReasoningBudget).toBeUndefined();
    });
  });

  describe("other grok models unchanged", () => {
    it.each([
      "grok-4.1-fast-reasoning",
      "grok-4.1-fast-non-reasoning",
      "grok-4",
      "grok-4-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-3",
      "grok-code-fast-1",
    ])("%s → effort unchanged", (id) => {
      expect(m(id).supportsReasoningEffort).toBe(true);
    });
  });

  it("does not touch models without effort", () => {
    const result = applyXaiEffort({ ...base, rawId: "grok-3-mini" });
    expect(result.supportsReasoningEffort).toBeUndefined();
  });
});
