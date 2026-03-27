import { describe, it, expect } from "vitest";
import { getModel, getModels } from "./models.js";

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
