import type { PoeModelInfo } from "../models.js";

/**
 * Workaround: the /v1/models API does not yet return reasoning.budget
 * for Anthropic models. All Anthropic models support it except older ones.
 */

const NO_BUDGET = new Set([
  "claude-haiku-3",
  "claude-haiku-3.5",
  "claude-sonnet-3.7",
]);

export function applyAnthropicBudget(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningBudget) return m;
  if (m.ownedBy !== "Anthropic") return m;
  if (NO_BUDGET.has(m.rawId)) return m;
  return { ...m, supportsReasoningBudget: true };
}
