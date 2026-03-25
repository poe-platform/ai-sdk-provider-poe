import { createOpenAI } from "@ai-sdk/openai";
import { createPoe } from "../../index.js";
import { generateText, tool } from "ai";
import { z } from "zod";
import type { Probe } from "./index.js";

/**
 * Upstream bug: output_text missing text field on Gemini tool calls.
 * https://github.com/poe-platform/ai-sdk-provider-poe/issues/3
 *
 * Uses raw @ai-sdk/openai.responses() — no workarounds.
 * When this stops throwing, the workaround can be removed.
 */
export const geminiToolsProbe: Probe = {
  id: "gemini-tools",
  issue: "https://github.com/poe-platform/ai-sdk-provider-poe/issues/3",
  description: "output_text missing text field on Gemini tool calls via /v1/responses",
  models: [
    "gemini-3.1-pro",
    "gemini-3-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-3.1-flash-lite",
  ],
  check: async (modelId, { apiKey, baseURL }) => {
    const rawModel = createOpenAI({ apiKey, baseURL }).responses(modelId);

    const { toolCalls } = await generateText({
      model: rawModel,
      prompt: "What is the weather in San Francisco? Use the getWeather tool.",
      tools: {
        getWeather: tool({
          description: "Get the current weather for a location",
          parameters: z.object({
            location: z.string().describe("The city to get weather for"),
          }),
        }),
      },
    });

    if (toolCalls.length === 0) {
      throw new Error("Model did not produce any tool calls");
    }
  },
};

/**
 * Same scenario but via createPoe() — our workaround must handle it.
 * expect: "pass" — if this throws, the workaround is broken.
 */
export const geminiToolsWorkaroundProbe: Probe = {
  id: "gemini-tools-workaround",
  issue: "https://github.com/poe-platform/ai-sdk-provider-poe/issues/3",
  description: "Gemini tool calls work through poe provider workaround",
  expect: "pass",
  models: [
    "gemini-3.1-pro",
    "gemini-3-flash",
    "gemini-3.1-flash-lite",
  ],
  check: async (modelId, { apiKey, baseURL }) => {
    const poe = createPoe({ apiKey, baseURL });

    const { toolCalls } = await generateText({
      model: poe(modelId),
      prompt: "What is the weather in San Francisco? Use the getWeather tool.",
      tools: {
        getWeather: tool({
          description: "Get the current weather for a location",
          parameters: z.object({
            location: z.string().describe("The city to get weather for"),
          }),
        }),
      },
    });

    if (toolCalls.length === 0) {
      throw new Error("Model did not produce any tool calls");
    }
  },
};
