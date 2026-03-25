import type { PoeModelInfo } from "../models.js";

/**
 * Workaround: Gemini reasoning capabilities not fully reported by /v1/models.
 * Source: https://ai.google.dev/gemini-api/docs/models/gemini
 */

const BUDGET_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

const EFFORT_LEVELS: Record<string, string[]> = {
  "gemini-3.1-pro":       ["low", "medium", "high"],
  "gemini-3-flash":       ["minimal", "low", "medium", "high"],
};

export function applyGeminiReasoning(m: PoeModelInfo): PoeModelInfo {
  const budget = m.supportsReasoningBudget || BUDGET_MODELS.has(m.rawId);

  let effort = m.supportsReasoningEffort;
  if (effort === true) {
    effort = EFFORT_LEVELS[m.rawId] ?? effort;
  }

  if (budget === (m.supportsReasoningBudget ?? false) && effort === m.supportsReasoningEffort) return m;

  return {
    ...m,
    ...(budget && { supportsReasoningBudget: true }),
    ...(effort && { supportsReasoningEffort: effort }),
  };
}
