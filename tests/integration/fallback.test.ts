import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("fallback provider (chat completions)", () => {
  it("generates text with gemini-2.0-flash", async () => {
    const { text } = await generateText({
      model: poe("google/gemini-2.0-flash"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });
});
