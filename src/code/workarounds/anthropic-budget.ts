import type { PoeModelInfo } from "../models.js";
import { getStoredModel } from "../../poe-models.js";

/**
 * Workaround: the /v1/models API does not yet return reasoning.budget
 * for Anthropic models that support it.
 */

export function applyAnthropicBudget(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningBudget) return m;
  if (m.ownedBy !== "Anthropic") return m;
  if (!getStoredModel(m.rawId)?.reasoning) return m;
  return { ...m, supportsReasoningBudget: true };
}
