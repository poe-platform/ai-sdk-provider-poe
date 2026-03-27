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

const REASONING_PROMPT =
  "Solve this step by step. First explain your reasoning, then give the final answer on a separate line: What is 17 * 19?";

async function expectGoogleReasoningOptions(modelId: string) {
  const { text } = await generateText({
    model: poe(`google/${modelId}`),
    prompt: REASONING_PROMPT,
    providerOptions: {
      poe: {
        reasoningEffort: "high",
        reasoningSummary: "auto",
      },
    },
  });

  expect(text).toContain("323");
}

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

  it("returns text with reasoning options for google/gemini-2.5-flash", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-2.5-flash");
  });

  it("returns text with reasoning options for google/gemini-2.5-pro", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-2.5-pro");
  });

  it("returns text with reasoning options for google/gemini-2.5-flash-lite", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-2.5-flash-lite");
  });

  it("returns text with reasoning options for google/gemini-3-flash", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-3-flash");
  });

  it("returns text with reasoning options for google/gemini-3.1-pro", { tags: ["timeout:reasoning", "timeout:slow"], timeout: 180_000 }, async () => {
    await expectGoogleReasoningOptions("gemini-3.1-pro");
  });

  it("returns text with reasoning options for google/gemini-3.1-flash-lite", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-3.1-flash-lite");
  });

  it("returns text with reasoning options for google/gemini-2.0-flash", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-2.0-flash");
  });

  it("returns text with reasoning options for google/gemini-2.0-flash-lite", { tags: ["timeout:reasoning"] }, async () => {
    await expectGoogleReasoningOptions("gemini-2.0-flash-lite");
  });
});
