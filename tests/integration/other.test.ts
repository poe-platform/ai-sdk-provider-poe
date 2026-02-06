import { describe, it, expect } from "vitest";
import { generateText, Output, tool } from "ai";
import { z } from "zod";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("models without prefix (chat completions)", () => {
  it("generates text with Kimi-K2.5", async () => {
    const { text } = await generateText({
      model: poe("Kimi-K2.5"),
      prompt: "Say hello in exactly 3 words",
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });

  it("handles tool calls with Kimi-K2.5", async () => {
    const { toolCalls } = await generateText({
      model: poe("Kimi-K2.5"),
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

  it("supports enable_thinking with Kimi-K2.5", async () => {
    const { text } = await generateText({
      model: poe("Kimi-K2.5"),
      prompt: "Create a nutritious, high-protein recipe using chicken, broccoli, and sweet potatoes",
      experimental_providerMetadata: {
        openai: {
          enable_thinking: true,
        },
      },
    });

    expect(text).toBeTruthy();
    expect(typeof text).toBe("string");
  });

  it("supports thinking_level and web_search with gemini-3-pro", async () => {
    const { text, usage } = await generateText({
      model: poe("gemini-3-pro"),
      prompt:
        "Write a Python function where given an int array, it returns the length of the longest strictly increasing subsequence. Give the naive solution and an optimal solution.",
      experimental_providerMetadata: {
        openai: {
          thinking_level: "high",
          web_search: true,
        },
      },
    });

    expect(text).toBeTruthy();
    expect(text).toContain("def");
    expect(usage.outputTokens).toBeGreaterThan(1);
  });

  it("generates structured output with xai/grok-4", async () => {
    const { output } = await generateText({
      model: poe("xai/grok-4"),
      prompt: `Parse this recipe:

Banana Smoothie

Ingredients:
- 2 bananas
- 1 cup milk
- 1 tbsp honey

Steps:
1. Peel bananas
2. Blend all ingredients
3. Serve cold`,
      output: Output.object({
        schema: z.object({
          name: z.string(),
          ingredients: z.array(z.string()),
          steps: z.array(z.string()),
        }),
      }),
    });

    expect(output!.name).toBe("Banana Smoothie");
    expect(output!.ingredients).toEqual(["2 bananas", "1 cup milk", "1 tbsp honey"]);
    expect(output!.steps).toEqual(["Peel bananas", "Blend all ingredients", "Serve cold"]);
  });
});
