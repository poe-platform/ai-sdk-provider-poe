import { defineConfig } from "vitest/config";

const isRecordMode = process.env.POE_SNAPSHOT_MODE === "record";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    testTimeout: isRecordMode ? 120000 : 5000,
  },
});
