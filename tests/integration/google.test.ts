import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "../../src/poe-provider.js";
import { getTestModels } from "../../src/poe-models.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("google provider", () => {
  for (const model of getTestModels("Google")) {
    describe(model.id, () => {
      const run = model.skip ? it.skip : it;
      const opts = model.tags.length ? { tags: model.tags } : {};

      run(`generates text with ${model.id}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`google/${model.id}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (model.hasTools) {
        run(`handles tool calling with ${model.id}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`google/${model.id}`),
            prompt:
              "What is the weather in San Francisco? Use the getWeather tool.",
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
      }
    });
  }
});
