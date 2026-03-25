import type { PoeModelInfo } from "../models.js";

/**
 * Workaround: infer reasoning effort from /v1/responses endpoint support
 * for models that don't explicitly declare it.
 */

export function applyReasoningFallbacks(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningEffort) return m;
  if (!(m.supportedEndpoints?.includes("/v1/responses") ?? false)) return m;
  return { ...m, supportsReasoningEffort: true };
}
