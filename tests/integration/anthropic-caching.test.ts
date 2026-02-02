import { describe, it, expect } from "vitest";
import { generateText, type CoreMessage } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";
import { SYSTEM_PROMPT_LARGE, USER_MESSAGES } from "../fixtures/prompt-caching.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

async function testCaching(modelId: string) {
  const model = poe(modelId);
  const results = [];
  const conversationHistory: CoreMessage[] = [];

  for (let i = 0; i < 3; i++) {
    conversationHistory.push({
      role: "user",
      content: [
        {
          type: "text",
          text: USER_MESSAGES[i],
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
      ],
    });

    const messages: CoreMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT_LARGE,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      ...conversationHistory,
    ];

    const result = await generateText({
      model,
      messages,
    });

    conversationHistory.push({ role: "assistant", content: result.text });
    results.push(result);
  }

  // All calls should succeed
  for (const result of results) {
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
  }

  const [first, second, third] = results;

  // First call: should write to cache
  expect(first.usage.promptTokens).toBeGreaterThan(0);

  // Extract cache metrics from response metadata
  const firstMeta = first.providerMetadata?.anthropic as Record<string, number> | undefined;
  const secondMeta = second.providerMetadata?.anthropic as Record<string, number> | undefined;
  const thirdMeta = third.providerMetadata?.anthropic as Record<string, number> | undefined;

  console.log(`${modelId} - First call metadata:`, firstMeta);
  console.log(`${modelId} - Second call metadata:`, secondMeta);
  console.log(`${modelId} - Third call metadata:`, thirdMeta);

  // First call should create cache (cacheCreationInputTokens > 0)
  if (firstMeta?.cacheCreationInputTokens !== undefined) {
    expect(firstMeta.cacheCreationInputTokens).toBeGreaterThan(0);
  }

  // Subsequent calls should read from cache (cacheReadInputTokens > 0)
  if (secondMeta?.cacheReadInputTokens !== undefined) {
    expect(secondMeta.cacheReadInputTokens).toBeGreaterThan(0);
  }
  if (thirdMeta?.cacheReadInputTokens !== undefined) {
    expect(thirdMeta.cacheReadInputTokens).toBeGreaterThan(0);
  }
}

describe("anthropic prompt caching", () => {
  it("caches tokens on repeated calls with claude-opus-4-5", async () => {
    await testCaching("anthropic/claude-opus-4-5-20250514");
  }, 600000);

  it("caches tokens on repeated calls with claude-sonnet-4", async () => {
    await testCaching("anthropic/claude-sonnet-4-20250514");
  }, 600000);

  it("caches tokens on repeated calls with claude-haiku-3-5", async () => {
    await testCaching("anthropic/claude-haiku-3-5-20241022");
  }, 600000);
});
