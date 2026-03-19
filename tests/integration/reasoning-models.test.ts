import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../../src/poe-provider.js";
import { getSnapshotFetch } from "../helpers/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

/**
 * Integration tests for models from the reasoning investigation table.
 * Covers models not already exercised by openai/google/anthropic test suites.
 * Tagged snapshot:record so first run records real API responses.
 */

const OPTS = { tags: ["snapshot:record"] };
const SLOW = { tags: ["snapshot:record", "timeout:slow"], timeout: 180_000 };

// --- XAI ---

describe("xai models", () => {
  for (const name of [
    "grok-4.1-fast-non-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-3",
    "grok-3-mini",
    "grok-code-fast-1",
  ]) {
    it(`generates text with ${name}`, OPTS, async () => {
      const { text } = await generateText({
        model: poe(name),
        prompt: "Say hello in exactly 3 words",
      });
      expect(text).toBeTruthy();
    });
  }

  it("grok-3-mini produces reasoning", OPTS, async () => {
    const { text, reasoning } = await generateText({
      model: poe("grok-3-mini"),
      prompt: "What is 7 * 8?",
    });
    expect(text).toContain("56");
    expect(reasoning).toBeTruthy();
  });
});

// --- Novita AI ---

describe("novita models", () => {
  for (const name of [
    "glm-5",
    "glm-4.7-flash",
    "glm-4.6",
    "qwen3.5-397b-a17b",
    "kimi-k2-thinking",
    "minimax-m2.1",
  ]) {
    it(`generates text with ${name}`, OPTS, async () => {
      const { text } = await generateText({
        model: poe(name),
        prompt: "Say hello in exactly 3 words",
      });
      expect(text).toBeTruthy();
    });
  }
});

// --- Empirio Labs AI (Bedrock / Mistral) ---

describe("empirio models", () => {
  for (const name of [
    "nova-premier-1.0",
    "nova-lite-1.0",
    "nova-lite-2",
    "magistral-medium-2509-thinking",
  ]) {
    it(`generates text with ${name}`, SLOW, async () => {
      const { text } = await generateText({
        model: poe(name),
        prompt: "Say hello in exactly 3 words",
      });
      expect(text).toBeTruthy();
    });
  }
});

// --- CerebrasAI ---

describe("cerebras models", () => {
  for (const name of [
    "gpt-oss-120b-cs",
    "llama-3.1-8b-cs",
  ]) {
    it(`generates text with ${name}`, OPTS, async () => {
      const { text } = await generateText({
        model: poe(name),
        prompt: "Say hello in exactly 3 words",
      });
      expect(text).toBeTruthy();
    });
  }
});

// --- Anthropic (missing from anthropic.test.ts) ---

describe("anthropic additional models", () => {
  it("generates text with claude-haiku-3", OPTS, async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-haiku-3"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  for (const name of [
    "claude-haiku-4.5",
    "claude-sonnet-4.5",
    "claude-opus-4.1",
  ]) {
    it(`generates text with ${name}`, OPTS, async () => {
      const { text } = await generateText({
        model: poe(`anthropic/${name}`),
        prompt: "Say hello in exactly 3 words",
      });
      expect(text).toBeTruthy();
    });

    it(`uses thinking with ${name}`, OPTS, async () => {
      const { text, reasoning } = await generateText({
        model: poe(`anthropic/${name}`),
        prompt: "What is 7 * 8?",
        providerOptions: {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 5000 },
          },
        },
      });
      expect(text).toContain("56");
      expect(reasoning).toBeTruthy();
    });
  }
});

// --- Google (gemini-3.1-pro not in GOOGLE_MODELS) ---

describe("google additional models", () => {
  it("generates text with gemini-3.1-pro", SLOW, async () => {
    const { text } = await generateText({
      model: poe("google/gemini-3.1-pro"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });
});
