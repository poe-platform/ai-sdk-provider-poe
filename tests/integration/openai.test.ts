import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("openai provider", () => {
  it("generates text with gpt-4o-mini", async () => {
    const { text } = await generateText({
      model: poe("openai/gpt-4o-mini"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });
});
