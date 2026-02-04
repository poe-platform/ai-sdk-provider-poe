import { describe, it, expect } from "vitest";
import { generateText, generateObject, tool } from "ai";
import { z } from "zod";
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

  it("handles tool calling with gpt-5", async () => {
    const { toolCalls } = await generateText({
      model: poe("openai/gpt-5"),
      prompt:
        "Get the weather in San Francisco and New York, and also calculate 15 * 7.",
      tools: {
        getWeather: tool({
          description: "Get the current weather for a location",
          inputSchema: z.object({
            location: z.string().describe("The city to get weather for"),
          }),
        }),
        calculate: tool({
          description: "Perform a mathematical calculation",
          inputSchema: z.object({
            expression: z.string().describe("The math expression to evaluate"),
          }),
        }),
      },
    });

    expect(toolCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("generates structured output with gpt-5", async () => {
    const { object } = await generateObject({
      model: poe("openai/gpt-5"),
      schema: z.object({
        recipe: z.object({
          name: z.string(),
          ingredients: z.array(
            z.object({
              name: z.string(),
              amount: z.string(),
            })
          ),
          steps: z.array(z.string()),
        }),
      }),
      prompt: "Generate a simple recipe for scrambled eggs.",
    });

    expect(object.recipe).toBeDefined();
    expect(object.recipe.name).toBeTruthy();
    expect(object.recipe.ingredients.length).toBeGreaterThan(0);
    expect(object.recipe.steps.length).toBeGreaterThan(0);
  });

  it("generates video with Sora-2-Pro", { skip: true, timeout: 300_000 }, async () => {
    const { text } = await generateText({
      model: poe("openai/Sora-2-Pro"),
      prompt: "Generate a 5 second video of a cat playing with a ball",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });

  it("generates image with GPT-Image-1.5", { skip: true, timeout: 300_000 }, async () => {
    const { text } = await generateText({
      model: poe("openai/GPT-Image-1.5"),
      prompt: "Generate an image of a sunset over mountains",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });
});
