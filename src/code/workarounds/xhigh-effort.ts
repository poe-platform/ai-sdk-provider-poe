import type { PoeModelInfo } from "../models.js";

/**
 * OpenAI reasoning effort levels vary by model generation.
 * Source: OpenAI native model definitions (api pricing page).
 *
 * Only applied when the API returns `supportsReasoningEffort: true`
 * (boolean) — explicit arrays from the API are never overridden.
 */

// gpt-5.2+  (including codex/mini/nano variants, but not chat-only)
const XHIGH_WITH_NONE = /^gpt-5\.[2-9](?!.*chat)/;
// gpt-5.1-codex-max, gpt-5.2-codex, gpt-5.3-codex+
const XHIGH_CODEX = /^gpt-5\.(?:[1-9]\d*)-codex-max$|^gpt-5\.[2-9]\d*-codex$/;
// gpt-5.3-codex-spark
const XHIGH_SPARK = /^gpt-5\.[3-9]\d*-codex-spark$/;

const EFFORTS_XHIGH_NONE: string[] = ["none", "low", "medium", "high", "xhigh"];
const EFFORTS_XHIGH: string[] = ["low", "medium", "high", "xhigh"];

function effortsFor(rawId: string): string[] | undefined {
  if (XHIGH_CODEX.test(rawId) || XHIGH_SPARK.test(rawId)) return EFFORTS_XHIGH;
  if (XHIGH_WITH_NONE.test(rawId)) return EFFORTS_XHIGH_NONE;
  return undefined;
}

/** Expand boolean `supportsReasoningEffort` to precise effort arrays for gpt-5.2+ models. */
export function applyXhighEffort(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningEffort !== true) return m;
  const efforts = effortsFor(m.rawId);
  if (!efforts) return m;
  return { ...m, supportsReasoningEffort: efforts };
}
