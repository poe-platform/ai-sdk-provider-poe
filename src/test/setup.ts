import "dotenv/config";
import { vi, afterAll, beforeEach, afterEach } from "vitest";
import { getSnapshotFetch, parseTagOverrides, persistAccessedKeys } from "./index.js";

// Use real API key when available (.env or env var), mock key only for CI playback
vi.mock("@ai-sdk/provider-utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@ai-sdk/provider-utils")>();
  return {
    ...original,
    loadApiKey: vi.fn((...args: Parameters<typeof original.loadApiKey>) =>
      process.env.POE_API_KEY ? original.loadApiKey(...args) : "test-api-key"
    ),
  };
});

// Routing cache is seeded from src/data/bundled-routing.json at module load

beforeEach(({ task }) => {
  const tags: string[] = [task.tags ?? []].flat();

  const overrides = parseTagOverrides(tags);
  const sf = getSnapshotFetch();

  if (overrides.mode === "record") sf.setModeOverride("record");
  if (overrides.onMiss) sf.setMissOverride(overrides.onMiss);
});

afterEach(() => {
  getSnapshotFetch().clearAllOverrides();
});

afterAll(async () => {
  await persistAccessedKeys();
});
