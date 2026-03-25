import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "./poe-provider.js";
import { getSnapshotFetch } from "./test/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("poe-bots (chat completions)", () => {
  it("generates text with Nano-Banana-Pro", async () => {
    const { text } = await generateText({
      model: poe("Nano-Banana-Pro"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
  });

  it("generates text with Nano-Banana", async () => {
    const { text } = await generateText({
      model: poe("Nano-Banana"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
  });

  it("generates text with Grok-4", async () => {
    const { text } = await generateText({
      model: poe("Grok-4"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
  });

  it("handles tool calls with Grok-4", async () => {
    const { toolCalls } = await generateText({
      model: poe("Grok-4"),
      prompt: "What is the weather in San Francisco? Use the getWeather tool.",
      tools: {
        getWeather: tool({
          description: "Get the current weather for a location",
          inputSchema: z.object({
            location: z.string().describe("The city to get weather for"),
          }),
        }),
      },
    });

    expect(toolCalls.length).toBeGreaterThan(0);
    expect(toolCalls[0].toolName).toBe("getWeather");
  });

  it("generates text with Web-Search", async () => {
    const { text } = await generateText({
      model: poe("Web-Search"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
  });

  it(
    "generates text with ElevenLabs-v2.5-Turbo",
    { tags: ["timeout:slow"] },
    async () => {
      const { text } = await generateText({
        model: poe("ElevenLabs-v2.5-Turbo"),
        prompt: "Say hello in exactly 3 words",
      });

      expect(text).toBeTruthy();
    },
  );

  it(
    "generates text with GPT-Image-1.5",
    { tags: ["timeout:image"] },
    async () => {
      const { text } = await generateText({
        model: poe("GPT-Image-1.5"),
        prompt: "Say hello in exactly 3 words",
      });

      expect(text).toBeTruthy();
    },
  );

  it(
    "generates text with Imagen-4-Ultra",
    { tags: ["timeout:image"] },
    async () => {
      const { text } = await generateText({
        model: poe("Imagen-4-Ultra"),
        prompt: "Say hello in exactly 3 words",
      });

      expect(text).toBeTruthy();
    },
  );

  it(
    "generates text with Grok-4.1-Fast-Reasoning",
    { tags: ["timeout:reasoning"] },
    async () => {
      const { text } = await generateText({
        model: poe("Grok-4.1-Fast-Reasoning"),
        prompt: "Say hello in exactly 3 words",
      });

      expect(text).toBeTruthy();
    },
  );

  it(
    "generates text with GPT-Image-1",
    { tags: ["timeout:image"] },
    async () => {
      const { text } = await generateText({
        model: poe("GPT-Image-1"),
        prompt: "Say hello in exactly 3 words",
      });

      expect(text).toBeTruthy();
    },
  );

  it("generates text with Python", async () => {
    const { text } = await generateText({
      model: poe("Python"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
  });
});
