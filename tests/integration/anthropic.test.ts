import { describe, it, expect } from "vitest";
import { generateText, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";
import { SYSTEM_PROMPT_LARGE } from "../fixtures/prompt-caching.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

const MODELS = [
  "anthropic/claude-opus-4-6",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-haiku-3-5",
] as const;

const THINKING_MODELS = [
  "anthropic/claude-opus-4-6",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4",
] as const;

describe("anthropic provider", () => {
  for (const modelId of MODELS) {
    describe(modelId, () => {
      it("generates text", async () => {
        const { text } = await generateText({
          model: poe(modelId),
          prompt: "Say hello in exactly 3 words",
        });

        expect(text).toBeTruthy();
        expect(typeof text).toBe("string");
      });

      it("handles tool calls", async () => {
        const { toolCalls } = await generateText({
          model: poe(modelId),
          prompt:
            "What is the weather in San Francisco? Use the getWeather tool.",
          tools: {
            getWeather: tool({
              description: "Get the current weather for a location",
              inputSchema: z.object({
                location: z
                  .string()
                  .describe("The city to get weather for"),
              }),
            }),
          },
        });

        expect(toolCalls.length).toBeGreaterThan(0);
        expect(toolCalls[0].toolName).toBe("getWeather");
      });
    });
  }

  for (const modelId of THINKING_MODELS) {
    it(`uses extended thinking with ${modelId}`, async () => {
      const { text, reasoning } = await generateText({
        model: poe(modelId),
        prompt: "What is 7 * 8?",
        providerOptions: {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 5000 },
          },
        },
      });

      expect(text).toBeTruthy();
      expect(text).toContain("56");
      expect(reasoning).toBeTruthy();
    });
  }

  it.skip("opus 4.6 1 million context", {
    timeout: 3600000,
    tags: ["stage:alpha", "snapshot:record"],
  }, async () => {
    const model = poe("anthropic/claude-opus-4-6");
    const userContents: string[] = [];

    // Phase 1: Build up to ~945k with large chunks
    const LARGE_CHUNK = SYSTEM_PROMPT_LARGE.repeat(10); // ~45k tokens
    const SMALL_CHUNK = SYSTEM_PROMPT_LARGE; // ~4.5k tokens

    let iteration = 0;
    let lastTokenCount = 0;

    while (true) {
      iteration++;

      // Use large chunks until ~900k, then small chunks for fine-grained testing
      const newContent = lastTokenCount < 900000 ? LARGE_CHUNK : SMALL_CHUNK;
      userContents.push(newContent);

      // Build messages with cache control only on system + last user message
      const messages: ModelMessage[] = [
        {
          role: "system",
          content: SYSTEM_PROMPT_LARGE,
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        ...userContents.slice(0, -1).map((text) => ({
          role: "user" as const,
          content: text,
        })),
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: userContents[userContents.length - 1],
              providerOptions: {
                anthropic: { cacheControl: { type: "ephemeral" } },
              },
            },
          ],
        },
      ];

      try {
        const result = await generateText({
          model,
          messages,
        });

        lastTokenCount = result.usage.totalTokens ?? 0;
        const meta = result.providerMetadata?.anthropic as { usage?: { cache_read_input_tokens?: number }; cacheCreationInputTokens?: number } | undefined;
        console.log(`Iteration ${iteration} - tokens: ${lastTokenCount}, cacheRead: ${meta?.usage?.cache_read_input_tokens ?? 0}, cacheWrite: ${meta?.cacheCreationInputTokens ?? 0}`);
      } catch (error) {
        expect(error).toBeDefined();
        const errorMessage = String(error);
        expect(
          errorMessage.toLowerCase().includes("context") ||
          errorMessage.toLowerCase().includes("token") ||
          errorMessage.toLowerCase().includes("length") ||
          errorMessage.toLowerCase().includes("limit") ||
          errorMessage.toLowerCase().includes("too long")
        ).toBe(true);
        console.log(`Context limit reached after ${iteration} iterations at ~${lastTokenCount} tokens`);
        console.log(`Error: ${errorMessage}`);
        return;
      }
    }
  });
});
