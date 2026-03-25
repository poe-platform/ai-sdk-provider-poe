import { describe, it, expect } from "vitest";
import { applyXhighEffort } from "./xhigh-effort.js";
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
  applyXhighEffort({ ...base, rawId, supportsReasoningEffort: effort });

const XHIGH_NONE = ["none", "low", "medium", "high", "xhigh"];
const XHIGH = ["low", "medium", "high", "xhigh"];

describe("applyXhighEffort", () => {
  describe("xhigh + none (gpt-5.2+ non-codex)", () => {
    it.each([
      "gpt-5.2",
      "gpt-5.2-instant",
      "gpt-5.2-pro",
      "gpt-5.3-instant",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
    ])("%s → none..xhigh", (id) => {
      expect(m(id).supportsReasoningEffort).toEqual(XHIGH_NONE);
    });
  });

  describe("xhigh without none (codex/spark models)", () => {
    it.each([
      "gpt-5.1-codex-max",
      "gpt-5.2-codex",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
    ])("%s → low..xhigh", (id) => {
      expect(m(id).supportsReasoningEffort).toEqual(XHIGH);
    });
  });

  describe("unchanged (older gpt-5, o-series, non-openai, etc.)", () => {
    it.each([
      // gpt-5.0 generation
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-codex",
      "gpt-5-chat",
      "gpt-5-pro",
      // gpt-5.1 (no xhigh)
      "gpt-5.1",
      "gpt-5.1-instant",
      "gpt-5.1-codex",
      "gpt-5.1-codex-mini",
      // o-series
      "o3",
      "o3-mini",
      "o3-mini-high",
      "o3-pro",
      "o3-deep-research",
      "o4-mini",
      "o4-mini-deep-research",
      "o1",
      "o1-pro",
      // gpt-4
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4o-aug",
      // non-openai
      "claude-opus-4.6",
      "claude-sonnet-4.5",
      "gemini-3.1-pro",
      "grok-3-mini",
      // misc
      "assistant",
      "nano-banana",
      "nano-banana-pro",
    ])("%s → unchanged", (id) => {
      expect(m(id).supportsReasoningEffort).toBe(true);
    });
  });

  describe("chat models excluded", () => {
    it.each(["gpt-5.2-chat-latest", "gpt-5.3-chat-latest"])
      ("%s → unchanged", (id) => {
        expect(m(id).supportsReasoningEffort).toBe(true);
      });
  });

  it("does not override explicit array from API", () => {
    const efforts = ["low", "high"];
    expect(m("gpt-5.2", efforts).supportsReasoningEffort).toBe(efforts);
  });

  it("does not touch models without effort support", () => {
    const result = applyXhighEffort({ ...base, rawId: "gpt-5.4" });
    expect(result.supportsReasoningEffort).toBeUndefined();
  });
});
