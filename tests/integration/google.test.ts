import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const makePoe = () => createPoe({ fetch: getSnapshotFetch() });

describe("google provider (responses)", () => {
  it("generates text with Nano-Banana", { timeout: 300_000, tags: ["stage:alpha"] }, async () => {
    const { text } = await generateText({
      model: makePoe()("google/Nano-Banana"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });

  // Image generation returns as a provider-executed tool result, not in `files`.
  // The base64 image data is in toolResults[0].output.result
  it("generates image with Nano-Banana", { timeout: 300_000, tags: ["stage:alpha" ] }, async () => {
    const { toolResults } = await generateText({
      model: makePoe()("google/Nano-Banana"),
      prompt: "Generate an image of a cute cat",
    });

    expect(toolResults).toBeDefined();
    expect(toolResults.length).toBeGreaterThan(0);
    expect(toolResults[0].toolName).toBe("image_generation");
    expect((toolResults[0].output as { result: string }).result).toBeTruthy();
  });

  it("generates image with Nano-Banana-Pro", { timeout: 300_000, tags: ["stage:alpha"], skip: true }, async () => {
    const { toolResults } = await generateText({
      model: makePoe()("google/Nano-Banana-Pro"),
      prompt: "Generate an image of a sunset over mountains",
    });

    expect(toolResults).toBeDefined();
    expect(toolResults.length).toBeGreaterThan(0);
    expect(toolResults[0].toolName).toBe("image_generation");
    expect((toolResults[0].output as { result: string }).result).toBeTruthy();
  });
});
