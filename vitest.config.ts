import { configDefaults, defineConfig } from "vitest/config";

const cliTags = process.argv.flatMap((a: string, i: number, arr: string[]) => a === "--tag" ? [arr[i + 1]] : []);
const isRecordMode = process.env.POE_SNAPSHOT_MODE === "record" || cliTags.includes("snapshot:record");
const stage = process.env.RELEASE_STAGE ?? "stable";

const stageExclude: string[] = [];
if (stage === "stable") stageExclude.push("**/*.beta.test.ts");
if (stage !== "alpha") stageExclude.push("**/*.alpha.test.ts");

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    testTimeout: isRecordMode ? 120000 : 5000,
    exclude: [...configDefaults.exclude, ...stageExclude],
    tags: [
      { name: "snapshot:record", description: "Record snapshot against live API", timeout: 120_000 },
      { name: "snapshot:miss-warn", description: "Warn on missing snapshots instead of erroring" },
      { name: "snapshot:miss-passthrough", description: "Silently fall back to live API on missing snapshots" },
      { name: "snapshot:miss-record", description: "Record only missing snapshots", timeout: 120_000 },
      { name: "stage:alpha", description: "Only runs when RELEASE_STAGE=alpha" },
      { name: "stage:beta", description: "Only runs when RELEASE_STAGE is beta or alpha" },
      { name: "timeout:image", description: "Extended timeout for image generation", timeout: 300_000 },
      { name: "timeout:video", description: "Extended timeout for video generation", timeout: 600_000 },
      { name: "timeout:reasoning", description: "Extended timeout for reasoning models", timeout: 180_000 },
      { name: "timeout:slow", description: "Extended timeout for slow models", timeout: 180_000 },
    ],
  },
});
