import { describe, expect, it } from "vitest";
import { buildModelEntries, runCli } from "../scripts/dev-models.ts";

function capture(args: string[]) {
  let stdout = "";
  let stderr = "";

  const result = runCli(args, buildModelEntries(), {
    out: (text) => {
      stdout += text;
    },
    err: (text) => {
      stderr += text;
    },
  });

  return { result, stdout, stderr };
}

describe("dev-models cli", () => {
  it("prints full json array", () => {
    const { result, stdout, stderr } = capture(["--json"]);

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(stderr).toBe("");

    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]?.id).toBe(buildModelEntries()[0]?.id);
  });

  it("prints one model as json", () => {
    const { result, stdout, stderr } = capture(["--json", "claude-opus-4.6"]);

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(stderr).toBe("");
    expect(JSON.parse(stdout)).toMatchObject({ id: "claude-opus-4.6" });
  });

  it("prints list summaries in cli mode", () => {
    const { result, stdout, stderr } = capture(["--cli"]);

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(stderr).toBe("");
    expect(stdout).toContain("Owner:");
    expect(stdout).toContain("Route:");
    expect(stdout).toContain("Pricing:");
    expect(stdout).toContain("Fetch fix:");
  });

  it("prints one model with json blocks in cli mode", () => {
    const { result, stdout, stderr } = capture(["--cli", "claude-opus-4.6"]);

    expect(result).toEqual({ handled: true, exitCode: 0 });
    expect(stderr).toBe("");
    expect(stdout).toContain("claude-opus-4.6");
    expect(stdout).toContain("Raw JSON:");
    expect(stdout).toContain("/code JSON:");
    expect(stdout).toContain("Roo-Code JSON:");
  });

  it("fails on unknown model id", () => {
    const { result, stdout, stderr } = capture(["--json", "missing-model"]);

    expect(result).toEqual({ handled: true, exitCode: 1 });
    expect(stdout).toBe("");
    expect(stderr).toContain('Model "missing-model" not found.');
  });
});
