import { describe, it, expect } from "vitest";
import { generateText, type ModelMessage } from "ai";
import { createPoe } from "./poe-provider.js";
import { getSnapshotFetch } from "./test/index.js";
import { SYSTEM_PROMPT_LARGE, USER_MESSAGES } from "./test/fixtures/prompt-caching.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

async function testCaching(modelId: string) {
  const model = poe(modelId);
  const results = [];
  const conversationHistory: ModelMessage[] = [];

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

    const messages: ModelMessage[] = [
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
  expect(first.usage.inputTokens).toBeGreaterThan(0);

  // Cache metrics via inputTokenDetails (structured usage)
  const tokens = [first, second, third].map((r) => {
    const d = r.usage.inputTokenDetails;
    return { cacheRead: d.cacheReadTokens ?? 0, cacheWrite: d.cacheWriteTokens ?? 0 };
  });

  // Every call should engage the cache (write or read depending on warm/cold state)
  for (const t of tokens) {
    expect(t.cacheRead + t.cacheWrite).toBeGreaterThan(0);
  }

  // Subsequent calls should read from cache
  expect(tokens[1].cacheRead).toBeGreaterThan(0);
  expect(tokens[2].cacheRead).toBeGreaterThan(0);
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
