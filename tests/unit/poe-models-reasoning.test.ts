import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPoeModels } from "../../src/poe-models.js";

/**
 * Each model's expected reasoning support, derived from the model investigation table.
 * "partial" effort is mapped to false (not reliably available via Poe).
 */
const MODELS: {
  id: string;
  owned_by: string;
  effort: boolean;
  budget: boolean;
}[] = [
  // Google
  { id: "nano-banana-cc", owned_by: "Google", effort: false, budget: false },
  { id: "gemini-3-flash", owned_by: "Google", effort: true, budget: false },
  { id: "gemini-3.1-pro", owned_by: "Google", effort: true, budget: false },
  { id: "gemini-3.1-pro", owned_by: "Google", effort: true, budget: false },
  { id: "gemini-2.5-flash-lite", owned_by: "Google", effort: false, budget: true },
  { id: "nano-banana-pro-cc", owned_by: "Google", effort: false, budget: false },

  // Anthropic
  { id: "claude-haiku-3", owned_by: "Anthropic", effort: false, budget: false },
  { id: "claude-haiku-4.5", owned_by: "Anthropic", effort: false, budget: true },
  { id: "claude-sonnet-4.5", owned_by: "Anthropic", effort: false, budget: true },
  { id: "claude-opus-4.5", owned_by: "Anthropic", effort: false, budget: true },
  { id: "claude-opus-4.1", owned_by: "Anthropic", effort: false, budget: true },
  { id: "claude-sonnet-4", owned_by: "Anthropic", effort: false, budget: true },

  // OpenAI
  { id: "gpt-5.2", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5.2-codex", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5.2-pro", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5.1-instant", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5.1-codex", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5.1-codex-mini", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5-chat", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-5-nano", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-5-codex", owned_by: "OpenAI", effort: true, budget: false },
  { id: "gpt-4o", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4o-search", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4o-aug", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4.1", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4.1-mini", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4.1-nano", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4-classic", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-4-turbo", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-3.5-turbo", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-3.5-turbo-raw", owned_by: "OpenAI", effort: false, budget: false },
  { id: "gpt-3.5-turbo-instruct", owned_by: "OpenAI", effort: false, budget: false },
  { id: "o3-pro", owned_by: "OpenAI", effort: true, budget: false },
  { id: "o3", owned_by: "OpenAI", effort: true, budget: false },
  { id: "o3-mini", owned_by: "OpenAI", effort: true, budget: false },
  { id: "o3-mini-high", owned_by: "OpenAI", effort: true, budget: false },
  { id: "o4-mini-deep-research", owned_by: "OpenAI", effort: true, budget: false },
  { id: "o1-pro", owned_by: "OpenAI", effort: true, budget: false },

  // XAI
  { id: "grok-4", owned_by: "XAI", effort: false, budget: false },
  { id: "grok-4.1-fast-reasoning", owned_by: "XAI", effort: false, budget: false },
  { id: "grok-4.1-fast-non-reasoning", owned_by: "XAI", effort: false, budget: false },
  { id: "grok-4-fast-non-reasoning", owned_by: "XAI", effort: false, budget: false },
  { id: "grok-3", owned_by: "XAI", effort: false, budget: false },
  { id: "grok-3-mini", owned_by: "XAI", effort: true, budget: false },
  { id: "grok-code-fast-1", owned_by: "XAI", effort: false, budget: false },

  // Novita AI
  { id: "glm-5", owned_by: "Novita AI", effort: false, budget: false },
  { id: "glm-4.7-flash", owned_by: "Novita AI", effort: false, budget: false },
  { id: "glm-4.6", owned_by: "Novita AI", effort: false, budget: false },
  { id: "qwen3.5-397b-a17b", owned_by: "Novita AI", effort: false, budget: false },
  { id: "kimi-k2-thinking", owned_by: "Novita AI", effort: false, budget: false },
  { id: "minimax-m2.1", owned_by: "Novita AI", effort: false, budget: false },

  // Empirio Labs AI (upstream: Amazon Bedrock)
  { id: "nova-premier-1.0", owned_by: "Empirio Labs AI", effort: false, budget: false },
  { id: "nova-lite-1.0", owned_by: "Empirio Labs AI", effort: false, budget: false },
  { id: "nova-lite-2", owned_by: "Empirio Labs AI", effort: false, budget: false },

  // Empirio Labs AI (upstream: Mistral)
  { id: "magistral-medium-2509-thinking", owned_by: "Empirio Labs AI", effort: false, budget: false },

  // CerebrasAI
  { id: "gpt-oss-120b-cs", owned_by: "CerebrasAI", effort: false, budget: false },
  { id: "llama-3.1-8b-cs", owned_by: "CerebrasAI", effort: false, budget: false },
];

describe("fetchPoeModels reasoning capabilities", () => {
  beforeEach(() => {
    vi.stubEnv("POE_API_KEY", "test-key");
  });

  const mockFetch = (data: unknown[]) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data }),
    }) as unknown as typeof globalThis.fetch;

  it.each(MODELS)(
    "$id ($owned_by): effort=$effort, budget=$budget",
    async ({ id, owned_by, effort, budget }) => {
      // Mock API returns only basic fields — no reasoning hints.
      // fetchPoeModels must derive reasoning support from heuristics.
      const fetch = mockFetch([
        { id, object: "model", created: 1, owned_by },
      ]);

      const [model] = await fetchPoeModels({ fetch });

      if (effort) {
        expect(model.supportsReasoningEffort).toBeTruthy();
      } else {
        expect(model.supportsReasoningEffort).toBeFalsy();
      }

      if (budget) {
        expect(model.supportsReasoningBudget).toBe(true);
      } else {
        expect(model.supportsReasoningBudget).toBeFalsy();
      }
    },
  );
});
