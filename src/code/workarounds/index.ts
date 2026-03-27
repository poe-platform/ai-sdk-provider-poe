import type { PoeModelInfo } from "../models.js";
import { applyAnthropicBudget } from "./anthropic-budget.js";
import { applyGeminiReasoning } from "./gemini-reasoning.js";
import { applyXaiEffort } from "./xai-effort.js";
import { applyXhighEffort } from "./xhigh-effort.js";

type ModelTransform = (m: PoeModelInfo) => PoeModelInfo;

const workarounds: ModelTransform[] = [
  applyAnthropicBudget,
  applyGeminiReasoning,
  applyXaiEffort,
  applyXhighEffort,
];

export function withCodeWorkarounds(m: PoeModelInfo): PoeModelInfo {
  return workarounds.reduce((acc, w) => w(acc), m);
}
