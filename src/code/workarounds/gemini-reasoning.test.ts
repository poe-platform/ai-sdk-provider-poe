import { describe, it, expect } from "vitest";
import { applyGeminiReasoning } from "./gemini-reasoning.js";
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

describe("applyGeminiReasoning", () => {
  // Source: https://ai.google.dev/gemini-api/docs/models/gemini

  describe("budget: gemini 2.5 models", () => {
    it.each([
      // gemini-2.5-pro — supportsReasoningBudget + requiredReasoningBudget
      "gemini-2.5-pro",
      // gemini-2.5-flash — supportsReasoningBudget, maxThinkingTokens: 24576
      "gemini-2.5-flash",
      // gemini-flash-lite-latest / gemini-2.5-flash-lite — supportsReasoningBudget
      "gemini-2.5-flash-lite",
    ])("%s → supportsReasoningBudget", (id) => {
      const m = applyGeminiReasoning({ ...base, rawId: id });
      expect(m.supportsReasoningBudget).toBe(true);
    });
  });

  describe("no budget: gemini 3.x and 2.0 models", () => {
    it.each([
      // gemini-3.1-pro-preview — effort only, no budget
      "gemini-3.1-pro",
      // gemini-3.1-flash-lite — not in Google's list yet
      "gemini-3.1-flash-lite",
      // gemini-3-flash-preview — effort only, no budget
      "gemini-3-flash",
      // older models
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ])("%s → no budget", (id) => {
      const m = applyGeminiReasoning({ ...base, rawId: id });
      expect(m.supportsReasoningBudget).toBeUndefined();
    });
  });

  describe("effort levels: gemini 3.x models", () => {
    it("gemini-3.1-pro boolean → [low, medium, high]", () => {
      const m = applyGeminiReasoning({ ...base, rawId: "gemini-3.1-pro", supportsReasoningEffort: true });
      expect(m.supportsReasoningEffort).toEqual(["low", "medium", "high"]);
    });

    it("gemini-3-flash boolean → [minimal, low, medium, high]", () => {
      const m = applyGeminiReasoning({ ...base, rawId: "gemini-3-flash", supportsReasoningEffort: true });
      expect(m.supportsReasoningEffort).toEqual(["minimal", "low", "medium", "high"]);
    });
  });

  describe("effort unchanged for non-mapped models", () => {
    it.each([
      "gemini-3.1-flash-lite",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ])("%s boolean effort → unchanged", (id) => {
      const m = applyGeminiReasoning({ ...base, rawId: id, supportsReasoningEffort: true });
      expect(m.supportsReasoningEffort).toBe(true);
    });
  });

  it("does not override explicit effort array from API", () => {
    const efforts = ["low", "high"];
    const m = applyGeminiReasoning({ ...base, rawId: "gemini-3.1-pro", supportsReasoningEffort: efforts });
    expect(m.supportsReasoningEffort).toBe(efforts);
  });

  it("does not override existing budget", () => {
    const m = applyGeminiReasoning({ ...base, rawId: "gemini-2.5-pro", supportsReasoningBudget: true });
    expect(m.supportsReasoningBudget).toBe(true);
  });
});
