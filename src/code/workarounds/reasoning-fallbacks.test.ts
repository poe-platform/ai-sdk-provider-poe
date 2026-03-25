import { describe, it, expect } from "vitest";
import { applyReasoningFallbacks } from "./reasoning-fallbacks.js";
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

describe("applyReasoningFallbacks", () => {
  it("model with /v1/responses → supportsReasoningEffort", () => {
    const m = applyReasoningFallbacks({
      ...base,
      rawId: "some-model",
      supportedEndpoints: ["/v1/responses", "/v1/chat/completions"],
    });
    expect(m.supportsReasoningEffort).toBe(true);
  });

  it("model without /v1/responses → unchanged", () => {
    const m = applyReasoningFallbacks({
      ...base,
      rawId: "some-model",
      supportedEndpoints: ["/v1/chat/completions"],
    });
    expect(m.supportsReasoningEffort).toBeUndefined();
  });

  it("does not override existing effort", () => {
    const m = applyReasoningFallbacks({
      ...base,
      rawId: "some-model",
      supportedEndpoints: ["/v1/responses"],
      supportsReasoningEffort: ["low", "high"],
    });
    expect(m.supportsReasoningEffort).toEqual(["low", "high"]);
  });
});
