import { defineConfig } from "vitest/config";

const cliTags = process.argv.flatMap((a: string, i: number, arr: string[]) => a === "--tag" ? [arr[i + 1]] : []);
const isRecordMode = process.env.POE_SNAPSHOT_MODE === "record" || cliTags.includes("snapshot:record");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: isRecordMode ? 120000 : 5000,
    tags: [
      { name: "snapshot:record", description: "Record snapshot against live API", timeout: 120_000 },
      { name: "snapshot:miss-warn", description: "Warn on missing snapshots instead of erroring" },
      { name: "snapshot:miss-passthrough", description: "Silently fall back to live API on missing snapshots" },
      { name: "snapshot:miss-record", description: "Record only missing snapshots", timeout: 120_000 },
      { name: "timeout:image", description: "Extended timeout for image generation", timeout: 300_000 },
      { name: "timeout:video", description: "Extended timeout for video generation", timeout: 600_000 },
      { name: "timeout:reasoning", description: "Extended timeout for reasoning models", timeout: 180_000 },
      { name: "timeout:slow", description: "Extended timeout for slow models", timeout: 180_000 },
    ],
  },
});
