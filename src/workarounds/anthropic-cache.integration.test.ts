import { describe, it, expect } from "vitest";
import { generateText, type ModelMessage } from "ai";
import { createPoe } from "../poe-provider.js";
import { getSnapshotFetch } from "../test/index.js";
import { SYSTEM_PROMPT_LARGE, USER_MESSAGES } from "../test/fixtures/prompt-caching.js";

const poe = createPoe({ fetch: getSnapshotFetch() });

function cacheTokens(result: Awaited<ReturnType<typeof generateText>>) {
  const d = result.usage.inputTokenDetails;
  return { cacheRead: d.cacheReadTokens ?? 0, cacheWrite: d.cacheWriteTokens ?? 0 };
}

/** Call the same model 3 times with growing conversation — no manual cacheControl. */
async function testAutoCaching(modelId: string) {
  const model = poe(modelId);
  const history: ModelMessage[] = [];
  const results = [];

  for (let i = 0; i < 3; i++) {
    history.push({ role: "user", content: USER_MESSAGES[i] });

    const result = await generateText({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT_LARGE }, ...history],
    });

    history.push({ role: "assistant", content: result.text });
    results.push(result);
  }

  for (const r of results) {
    expect(r.text).toBeTruthy();
  }

  const tokens = results.map(cacheTokens);

  // Every call should engage the cache (either writing or reading).
  // If the cache is cold the first call writes; if warm it reads.
  for (const t of tokens) {
    expect(t.cacheRead + t.cacheWrite).toBeGreaterThan(0);
  }

  // Later calls should read from cache (system prompt reuse)
  expect(tokens[1].cacheRead).toBeGreaterThan(0);
  expect(tokens[2].cacheRead).toBeGreaterThan(0);
}

/** Manual cacheControl still works alongside the workaround. */
async function testManualCaching(modelId: string) {
  const model = poe(modelId);
  const history: ModelMessage[] = [];
  const results = [];

  for (let i = 0; i < 3; i++) {
    history.push({
      role: "user",
      content: [
        {
          type: "text",
          text: USER_MESSAGES[i],
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
      ],
    });

    const result = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT_LARGE,
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        ...history,
      ],
    });

    history.push({ role: "assistant", content: result.text });
    results.push(result);
  }

  for (const r of results) {
    expect(r.text).toBeTruthy();
  }

  const tokens = results.map(cacheTokens);

  for (const t of tokens) {
    expect(t.cacheRead + t.cacheWrite).toBeGreaterThan(0);
  }
  expect(tokens[1].cacheRead).toBeGreaterThan(0);
  expect(tokens[2].cacheRead).toBeGreaterThan(0);
}

/** Verify cache: false disables automatic breakpoints. */
async function testCacheDisabled(modelId: string) {
  const model = poe(modelId);

  const r1 = await generateText({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_LARGE },
      { role: "user", content: USER_MESSAGES[0] },
    ],
    providerOptions: { poe: { cache: false } },
  });

  const r2 = await generateText({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_LARGE },
      { role: "user", content: USER_MESSAGES[0] },
      { role: "assistant", content: r1.text },
      { role: "user", content: USER_MESSAGES[1] },
    ],
    providerOptions: { poe: { cache: false } },
  });

  expect(r1.text).toBeTruthy();
  expect(r2.text).toBeTruthy();

  const t1 = cacheTokens(r1);
  const t2 = cacheTokens(r2);
  // Without breakpoints, no cache engagement
  expect(t1.cacheWrite).toBe(0);
  expect(t1.cacheRead).toBe(0);
  expect(t2.cacheWrite).toBe(0);
  expect(t2.cacheRead).toBe(0);
}

describe("anthropic automatic cache breakpoints", () => {
  it("auto-caches with claude-sonnet-4", async () => testAutoCaching("anthropic/claude-sonnet-4-20250514"), 600_000);
  it("auto-caches with claude-haiku-3-5", async () => testAutoCaching("anthropic/claude-haiku-3-5-20241022"), 600_000);
  it("manual cacheControl still works", async () => testManualCaching("anthropic/claude-sonnet-4-20250514"), 600_000);
  it("cache: false disables breakpoints", async () => testCacheDisabled("anthropic/claude-haiku-3-5-20241022"), 600_000);
});
