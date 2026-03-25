import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "./poe-provider.js";
import { getStoredModels } from "./poe-models.js";
import { MODEL_OVERRIDES } from "./model-overrides.js";
import { getSnapshotFetch } from "./test/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("google provider", () => {
  for (const m of getStoredModels().filter(m => m.owned_by === "Google")) {
    describe(m.id, () => {
      const override = MODEL_OVERRIDES[m.id];
      const run = override?.skip ? it.skip : it;
      const hasTools = (m.supported_features?.includes("tools") ?? false) && !override?.skipTools;
      const outputMods = m.output_modalities ?? [];
      const tags: string[] = [];
      if (outputMods.includes("video")) tags.push("timeout:video");
      else if (outputMods.includes("image") && !outputMods.includes("text")) tags.push("timeout:image");
      const opts = tags.length ? { tags } : {};

      run(`generates text with ${m.id}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`google/${m.id}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (hasTools) {
        run(`handles tool calling with ${m.id}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`google/${m.id}`),
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
