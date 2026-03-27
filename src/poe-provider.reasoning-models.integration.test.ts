import { describe, it, expect } from "vitest";
import { generateText, tool } from "ai";
import { z } from "zod";
import { createPoe } from "./poe-provider.js";
import { expectReasoningText, getSnapshotFetch } from "./test/index.js";

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

/**
 * Integration tests for models from the reasoning investigation table.
 * Covers models not already exercised by openai/google/anthropic test suites.
 */

const OPTS = {};
const SLOW = { tags: ["timeout:slow"], timeout: 180_000 };
const REASONING_PROMPT =
  "Solve this step by step. First explain your reasoning, then give the final answer on a separate line: What is 17 * 19?";

async function expectAnthropicReasoning(modelId: string) {
  const { text, reasoning } = await generateText({
    model: poe(`anthropic/${modelId}`),
    prompt: REASONING_PROMPT,
    providerOptions: {
      poe: {
        reasoningBudgetTokens: 5000,
      },
    },
  });

  expect(text).toContain("323");
  expectReasoningText(reasoning);
}

// --- XAI ---

describe("xai models", () => {
  for (const name of [
    "grok-4.1-fast-non-reasoning",
    "grok-4.1-fast-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-4-fast-reasoning",
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

  it("handles tool calling with grok-4.1-fast-non-reasoning", OPTS, async () => {
    const { toolCalls } = await generateText({
      model: poe("grok-4.1-fast-non-reasoning"),
      prompt: "What is the weather in San Francisco? Use the getWeather tool.",
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

  it("handles tool calling with grok-4-fast-non-reasoning", OPTS, async () => {
    const { toolCalls } = await generateText({
      model: poe("grok-4-fast-non-reasoning"),
      prompt: "What is the weather in San Francisco? Use the getWeather tool.",
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

  it("returns text with grok-3-mini when reasoning_effort is provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("grok-3-mini"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
        },
      },
    });
    expect(text).toContain("323");
  });

  it("returns text with grok-4-fast-reasoning when reasoning_effort is provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("grok-4-fast-reasoning"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
        },
      },
    });
    expect(text).toContain("323");
  });

  it("returns text with grok-4.1-fast-reasoning when reasoning_effort is provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("grok-4.1-fast-reasoning"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
        },
      },
    });
    expect(text).toContain("323");
  });
});

// --- Novita AI ---

describe("novita models", () => {
  for (const name of [
    "glm-5",
    // "glm-4.7-flash", // API unresponsive — skipped until endpoint recovers
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

  it.skip("uses thinking with claude-haiku-3", OPTS, async () => {
    await expectAnthropicReasoning("claude-haiku-3"); // does not support thinking
  });

  it("generates text with claude-haiku-3.5", OPTS, async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-haiku-3.5"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  it.skip("uses thinking with claude-haiku-3.5", OPTS, async () => {
    await expectAnthropicReasoning("claude-haiku-3.5"); // does not support thinking
  });

  it("generates text with claude-haiku-4.5", OPTS, async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-haiku-4.5"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  it("uses thinking with claude-haiku-4.5", OPTS, async () => {
    await expectAnthropicReasoning("claude-haiku-4.5");
  });

  it("generates text with claude-sonnet-4.5", OPTS, async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-sonnet-4.5"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  it("uses thinking with claude-sonnet-4.5", OPTS, async () => {
    await expectAnthropicReasoning("claude-sonnet-4.5");
  });

  it("generates text with claude-opus-4.1", OPTS, async () => {
    const { text } = await generateText({
      model: poe("anthropic/claude-opus-4.1"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  it("uses thinking with claude-opus-4.1", OPTS, async () => {
    await expectAnthropicReasoning("claude-opus-4.1");
  });
});

// --- Google ---

describe("google additional models", () => {
  it("generates text with gemini-3.1-pro", SLOW, async () => {
    const { text } = await generateText({
      model: poe("google/gemini-3.1-pro"),
      prompt: "Say hello in exactly 3 words",
    });
    expect(text).toBeTruthy();
  });

  it("returns text with gemini-3.1-pro when reasoning options are provided", SLOW, async () => {
    const { text } = await generateText({
      model: poe("google/gemini-3.1-pro"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(text).toContain("323");
  });

  it("returns text with nano-banana when reasoning options are provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("nano-banana"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(text).toContain("323");
  });

  it.skip("returns text with nano-banana-pro when reasoning options are provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("nano-banana-pro"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(text).toContain("323");
  });

  it.skip("returns text with nano-banana-2 when reasoning options are provided", SLOW, async () => {
    const { text } = await generateText({
      model: poe("nano-banana-2"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(text).toContain("323");
  });
});

describe("prefixless reasoning models", () => {
  it("returns text with assistant when reasoning options are provided", OPTS, async () => {
    const { text } = await generateText({
      model: poe("assistant"),
      prompt: REASONING_PROMPT,
      providerOptions: {
        poe: {
          reasoningEffort: "high",
          reasoningSummary: "auto",
        },
      },
    });

    expect(text).toContain("323");
  });
});
