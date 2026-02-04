import { describe, it, expect, vi, beforeEach } from "vitest";

describe("release-stage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports RELEASE_STAGE, isAlphaStage, and isBetaStage", async () => {
    const mod = await import("../../src/release-stage.js");
    expect(mod.RELEASE_STAGE).toBeDefined();
    expect(typeof mod.isAlphaStage).toBe("function");
    expect(typeof mod.isBetaStage).toBe("function");
  });

  it("RELEASE_STAGE is a valid stage", async () => {
    const mod = await import("../../src/release-stage.js");
    expect(["stable", "beta", "alpha"]).toContain(mod.RELEASE_STAGE);
  });

  it("isAlphaStage matches current stage", async () => {
    const mod = await import("../../src/release-stage.js");
    expect(mod.isAlphaStage()).toBe(mod.RELEASE_STAGE === "alpha");
  });

  it("isBetaStage matches current stage", async () => {
    const mod = await import("../../src/release-stage.js");
    expect(mod.isBetaStage()).toBe(mod.RELEASE_STAGE === "beta" || mod.RELEASE_STAGE === "alpha");
  });
});
