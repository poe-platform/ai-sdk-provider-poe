import { describe, it, expect } from "vitest";
import { generateText } from "ai";
import { createPoe } from "../poe-provider.js";
import { _resetModelCache } from "../poe-models.js";
import { expectReasoningText, getSnapshotFetch } from "../test/index.js";

// Ensure bundled routing is loaded (guards against shared-thread cache clearing)
_resetModelCache();

const poe = createPoe({
  fetch: getSnapshotFetch(),
});

const REASONING_PROMPT =
  "Solve this step by step. First explain your reasoning, then give the final answer on a separate line: What is 17 * 19?";

async function expectAnthropicBudgetReasoning(modelId: string) {
  const { text, reasoning } = await generateText({
    model: poe(modelId),
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

describe("reasoning: budget (anthropic thinking)", () => {
  it("claude-opus-4.6 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-opus-4.6");
  });

  it("claude-sonnet-4.6 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-sonnet-4.6");
  });

  it("claude-haiku-4.5 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-haiku-4.5");
  });

  it("claude-sonnet-4.5 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-sonnet-4.5");
  });

  it("claude-opus-4.5 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-opus-4.5");
  });

  it("claude-opus-4.1 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-opus-4.1");
  });

  it("claude-sonnet-4 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-sonnet-4");
  });

  it("claude-opus-4 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-opus-4");
  });

  it("claude-sonnet-3.7 produces reasoning with budget", { tags: ["timeout:reasoning"] }, async () => {
    await expectAnthropicBudgetReasoning("anthropic/claude-sonnet-3.7");
  });
});
