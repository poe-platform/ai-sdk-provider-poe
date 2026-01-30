import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  apiKey: "test-key",
  fetch: getSnapshotFetch(),
});

describe("anthropic provider", () => {
  it("generates text with claude-sonnet-4", async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-sonnet-4-20250514"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });
});
