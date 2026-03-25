import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { readFileSync } from "fs";
import { createPoe } from "./poe-provider.js";
import { getStoredModels } from "./poe-models.js";
import { MODEL_OVERRIDES } from "./model-overrides.js";
import { getSnapshotFetch } from "./test/index.js";

const bannerImage = readFileSync(
  new URL("./test/fixtures/banner.jpg", import.meta.url)
);

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("openai provider", () => {
  for (const m of getStoredModels().filter(m => m.owned_by === "OpenAI")) {
    describe(m.id, () => {
      const override = MODEL_OVERRIDES[m.id];
      const run = override?.skip ? it.skip : it;
      const hasTools = (m.supported_features?.includes("tools") ?? false) && !override?.skipTools;
      const hasReasoning = !!m.reasoning_effort;
      const outputMods = m.output_modalities ?? [];
      const tags: string[] = [];
      if (outputMods.includes("video")) tags.push("timeout:video");
      else if (outputMods.includes("image") && !outputMods.includes("text")) tags.push("timeout:image");
      else if (hasReasoning) tags.push("timeout:reasoning");
      const opts = tags.length ? { tags } : {};

      run(`generates text with ${m.id}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`openai/${m.id}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (hasTools) {
        run(`handles tool calling with ${m.id}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`openai/${m.id}`),
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

      if (hasReasoning) {
        run(`uses reasoning with ${m.id}`, opts, async () => {
          const { text, reasoning } = await generateText({
            model: poe(`openai/${m.id}`),
            prompt: "What is 7 * 8?",
          });

          expect(text).toBeTruthy();
          expect(text).toContain("56");
          expect(reasoning).toBeTruthy();
        });
      }
    });
  }

  it("handles vision with gpt-5.2", async () => {
    const { text } = await generateText({
      model: poe("openai/gpt-5.2"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is on this image? Be brief." },
            { type: "image", image: bannerImage },
          ],
        },
      ],
    });

    expect(text.toLowerCase()).toContain("poe");
  });

  it("handles vision with gpt-5.2 via URL", async () => {
    const { text } = await generateText({
      model: poe("openai/gpt-5.2"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is on this image? Be brief." },
            {
              type: "image",
              image: new URL(
                "https://raw.githubusercontent.com/poe-platform/ai-sdk-provider-poe/refs/heads/main/tests/fixtures/banner.jpg"
              ),
            },
          ],
        },
      ],
    });

    expect(text.toLowerCase()).toContain("poe");
  });
});
