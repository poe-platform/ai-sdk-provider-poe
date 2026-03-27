import { describe, it, expect } from "vitest";
import { getModel, getModels } from "./models.js";
import { poeDefaultModelId, getPoeDefaultModelInfo } from "./index.js";

describe("getModels", () => {
  const models = getModels();
  const ids = models.map((m) => m.rawId);

  it("excludes image-only models", () => {
    expect(ids).not.toContain("dall-e-3");
    expect(ids).not.toContain("gpt-image-1");
  });

  it("excludes video-only models", () => {
    expect(ids).not.toContain("veo-3");
    expect(ids).not.toContain("sora-2");
  });

  it("excludes models without tool support", () => {
    expect(ids).not.toContain("mistral-medium");
    expect(ids).not.toContain("solar-pro-2");
  });

  it("includes text+tools models", () => {
    expect(ids).toContain("claude-opus-4.6");
    expect(ids).toContain("glm-5");
  });
});

describe("getPoeDefaultModelInfo", () => {
  it("resolves default model from bundled data", () => {
    const info = getPoeDefaultModelInfo();
    expect(info.contextWindow).toBeGreaterThan(0);
    expect(info.maxTokens).toBeGreaterThan(0);
    expect(info.supportsImages).toBe(true);
  });

  it("accepts a custom model id", () => {
    const info = getPoeDefaultModelInfo("claude-sonnet-4.6");
    expect(info.contextWindow).toBe(983_040);
  });

  it("throws for unknown model", () => {
    expect(() => getPoeDefaultModelInfo("nonexistent")).toThrow("Unknown model");
  });
});

describe("getModel", () => {
  it("returns normalized reasoning capabilities for effort models", () => {
    const model = getModel("o3");
    expect(model?.supportsReasoningEffort).toBeTruthy();
  });

  it("returns normalized reasoning capabilities for budget models", () => {
    const model = getModel("claude-sonnet-4");
    expect(model?.supportsReasoningBudget).toBe(true);
  });
});
