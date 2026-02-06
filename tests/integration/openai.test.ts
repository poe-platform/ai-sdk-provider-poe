import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "../../src/poe-provider.js";
import { OPENAI_MODELS } from "../../src/openai-models.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("openai provider", () => {
  for (const [name, def] of Object.entries(OPENAI_MODELS)) {
    describe(name, () => {
      const run = def.skip ? it.skip : it;
      const opts = {
        ...(def.timeout && { timeout: def.timeout }),
        ...(def.tags && { tags: def.tags }),
      };

      run(`generates text with ${name}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`openai/${name}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (def.tools !== false) {
        run(`handles tool calling with ${name}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`openai/${name}`),
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

      if (def.reasoning) {
        run(`uses reasoning with ${name}`, opts, async () => {
          const { text, reasoning } = await generateText({
            model: poe(`openai/${name}`),
            prompt: "What is 7 * 8?",
          });

          expect(text).toBeTruthy();
          expect(text).toContain("56");
          expect(reasoning).toBeTruthy();
        });
      }
    });
  }
});
