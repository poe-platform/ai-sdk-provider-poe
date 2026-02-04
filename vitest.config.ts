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
      { name: "stage:alpha", description: "Only runs when RELEASE_STAGE=alpha" },
      { name: "stage:beta", description: "Only runs when RELEASE_STAGE is beta or alpha" },
    ],
  },
});
