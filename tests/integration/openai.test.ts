import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { readFileSync } from "fs";
import { createPoe } from "../../src/poe-provider.js";
import { getTestModels } from "../../src/poe-models.js";
import { getSnapshotFetch } from "../helpers/index.js";

const bannerImage = readFileSync(
  new URL("../fixtures/banner.jpg", import.meta.url)
);

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

describe("openai provider", () => {
  for (const model of getTestModels("OpenAI")) {
    describe(model.id, () => {
      const run = model.skip ? it.skip : it;
      const opts = model.tags.length ? { tags: model.tags } : {};

      run(`generates text with ${model.id}`, opts, async () => {
        const { text } = await generateText({
          model: poe(`openai/${model.id}`),
          prompt: "Say hello in exactly 3 words",
        });
        expect(text).toBeTruthy();
      });

      if (model.hasTools) {
        run(`handles tool calling with ${model.id}`, opts, async () => {
          const { toolCalls } = await generateText({
            model: poe(`openai/${model.id}`),
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

      if (model.hasReasoning) {
        run(`uses reasoning with ${model.id}`, opts, async () => {
          const { text, reasoning } = await generateText({
            model: poe(`openai/${model.id}`),
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
