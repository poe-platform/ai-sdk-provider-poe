import type { PoeModelInfo } from "../models.js";

/**
 * Workaround: xAI models report boolean reasoning effort but
 * grok-3-mini only supports ["low", "high"].
 * Source: https://docs.x.ai/docs/api-reference
 */

const EFFORT_LEVELS: Record<string, string[]> = {
  "grok-3-mini": ["low", "high"],
};

export function applyXaiEffort(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningEffort !== true) return m;
  const levels = EFFORT_LEVELS[m.rawId];
  if (!levels) return m;
  return { ...m, supportsReasoningEffort: levels };
}
