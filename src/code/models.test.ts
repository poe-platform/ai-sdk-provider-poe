import { describe, it, expect } from "vitest";
import { getModels } from "./models.js";

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
    expect(ids).toContain("assistant");
  });
});
