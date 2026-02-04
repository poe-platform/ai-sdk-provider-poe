import "dotenv/config";
import { vi, afterAll, beforeEach, afterEach } from "vitest";
import { getSnapshotFetch, parseTagOverrides, persistAccessedKeys } from "./helpers/index.js";

const state = vi.hoisted(() => ({ record: false }));

vi.mock("@ai-sdk/provider-utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@ai-sdk/provider-utils")>();
  return {
    ...original,
    loadApiKey: vi.fn((...args: Parameters<typeof original.loadApiKey>) =>
      state.record ? original.loadApiKey(...args) : "test-api-key"
    ),
  };
});

const cliTags = process.argv.flatMap((a: string, i: number, arr: string[]) => a === "--tag" ? [arr[i + 1]] : []);
const isGlobalRecordMode = process.env.POE_SNAPSHOT_MODE === "record" || cliTags.includes("snapshot:record");
if (isGlobalRecordMode) {
  if (!process.env.POE_API_KEY) {
    throw new Error("POE_API_KEY is required for snapshot recording. Set it in .env or as an environment variable.");
  }
  state.record = true;
}
const stage = process.env.RELEASE_STAGE ?? "stable";
const stageLevels: Record<string, number> = { stable: 0, beta: 1, alpha: 2 };
const stageLevel = stageLevels[stage] ?? 0;

beforeEach(({ task, skip }) => {
  const tags: string[] = [task.tags ?? []].flat();

  // Stage gating: skip tests tagged for a higher stage
  if (tags.includes("stage:alpha") && stageLevel < 2) { skip(); return; }
  if (tags.includes("stage:beta") && stageLevel < 1) { skip(); return; }

  const overrides = parseTagOverrides(tags);
  const sf = getSnapshotFetch();

  if (overrides.mode === "record") {
    if (!process.env.POE_API_KEY) {
      throw new Error("POE_API_KEY is required for snapshot recording. Set it in .env or as an environment variable.");
    }
    state.record = true;
    sf.setModeOverride("record");
  }
  if (overrides.onMiss) {
    sf.setMissOverride(overrides.onMiss);
  }
});

afterEach(() => {
  state.record = isGlobalRecordMode;
  getSnapshotFetch().clearAllOverrides();
});

afterAll(async () => {
  await persistAccessedKeys();
});
