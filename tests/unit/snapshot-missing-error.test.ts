import { describe, it, expect, vi, afterEach } from "vitest";
import { createSnapshotFetch, SnapshotMissingError } from "../helpers/snapshot-fetch.js";
import { parseTagOverrides } from "../helpers/snapshot-config.js";

describe("parseTagOverrides", () => {
  it("returns empty overrides for unrecognized tags", () => {
    expect(parseTagOverrides(["foo", "bar"])).toEqual({});
  });

  it("parses snapshot:record", () => {
    expect(parseTagOverrides(["snapshot:record"])).toEqual({ mode: "record" });
  });

  it("parses snapshot:miss-warn", () => {
    expect(parseTagOverrides(["snapshot:miss-warn"])).toEqual({ onMiss: "warn" });
  });

  it("parses snapshot:miss-passthrough", () => {
    expect(parseTagOverrides(["snapshot:miss-passthrough"])).toEqual({ onMiss: "passthrough" });
  });

  it("merges multiple tags", () => {
    expect(parseTagOverrides(["snapshot:record", "snapshot:miss-warn"])).toEqual({
      mode: "record",
      onMiss: "warn"
    });
  });
});

describe("snapshot fetch overrides", () => {
  it("setModeOverride switches playback to record", async () => {
    const fetched: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetched.push(input.toString());
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof globalThis.fetch;

    try {
      const snapshotFetch = createSnapshotFetch({
        mode: "playback",
        snapshotDir: "__snapshots__/__missing__",
        onMiss: "error"
      });

      snapshotFetch.setModeOverride("record");

      const res = await snapshotFetch("https://example.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ model: "override-test" })
      });

      expect(res.status).toBe(200);
      expect(fetched).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("setMissOverride switches error to passthrough", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ live: true }), { status: 200 })
    ) as typeof globalThis.fetch;

    try {
      const snapshotFetch = createSnapshotFetch({
        mode: "playback",
        snapshotDir: "__snapshots__/__missing__",
        onMiss: "error"
      });

      snapshotFetch.setMissOverride("passthrough");

      const res = await snapshotFetch("https://example.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ model: "miss-test" })
      });

      expect(res.status).toBe(200);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("clearAllOverrides reverts to config defaults", async () => {
    const snapshotFetch = createSnapshotFetch({
      mode: "playback",
      snapshotDir: "__snapshots__/__missing__",
      onMiss: "error"
    });

    snapshotFetch.setModeOverride("record");
    snapshotFetch.setMissOverride("passthrough");
    snapshotFetch.clearAllOverrides();

    await expect(
      snapshotFetch("https://example.com/v1/responses", {
        method: "POST",
        body: JSON.stringify({ model: "revert-test" })
      })
    ).rejects.toThrow(SnapshotMissingError);
  });
});

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
