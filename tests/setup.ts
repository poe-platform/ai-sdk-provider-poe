import "dotenv/config";
import { vi, afterAll } from "vitest";
import { persistAccessedKeys } from "./helpers/index.js";

const isRecordMode = process.env.POE_SNAPSHOT_MODE === "record";

vi.mock("@ai-sdk/provider-utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@ai-sdk/provider-utils")>();
  return {
    ...original,
    loadApiKey: isRecordMode
      ? original.loadApiKey
      : vi.fn(() => "test-api-key"),
  };
});

afterAll(async () => {
  await persistAccessedKeys();
});
