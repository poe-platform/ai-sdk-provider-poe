import { describe, it, expect, vi, afterEach } from "vitest";
import { createSnapshotFetch, SnapshotMissingError } from "../helpers/snapshot-fetch.js";

describe("SnapshotMissingError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes a record hint based on the current npm command", async () => {
    vi.stubEnv(
      "npm_config_argv",
      JSON.stringify({ original: ["test", "--", "--run", "tests/integration/other.test.ts"] })
    );
    vi.stubEnv("npm_config_user_agent", "npm/10.0.0 node/v20.0.0 darwin x64");

    const snapshotFetch = createSnapshotFetch({
      mode: "playback",
      snapshotDir: "__snapshots__/__missing__",
      onMiss: "error"
    });

    try {
      await snapshotFetch("https://example.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ model: "Nano-Banana" })
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SnapshotMissingError);
      expect((error as Error).message).toContain(
        "POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/other.test.ts"
      );
    }
  });

  it("falls back to npm lifecycle env when npm_config_argv is unavailable", async () => {
    vi.stubEnv("npm_lifecycle_event", "test");
    vi.stubEnv("npm_lifecycle_script", "vitest run");
    vi.stubEnv("npm_config_user_agent", "npm/10.0.0 node/v20.0.0 darwin x64");

    const originalArgv = process.argv;
    process.argv = ["node", "/path/to/vitest.mjs", "run", "--run", "tests/integration/google.test.ts"];

    try {
      const snapshotFetch = createSnapshotFetch({
        mode: "playback",
        snapshotDir: "__snapshots__/__missing__",
        onMiss: "error"
      });

      await snapshotFetch("https://example.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ model: "Nano-Banana" })
      });
    } catch (error) {
      expect(error).toBeInstanceOf(SnapshotMissingError);
      expect((error as Error).message).toContain(
        "POE_SNAPSHOT_MODE=record npm test -- --run tests/integration/google.test.ts"
      );
    } finally {
      process.argv = originalArgv;
    }
  });
});
