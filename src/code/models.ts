import { getStoredModel, getStoredModels, type PoeApiModel } from "../poe-models.js";
import { withCodeWorkarounds } from "./workarounds/index.js";

export interface PoeModelInfo {
  id: string;
  rawId: string;
  ownedBy?: string;
  displayName?: string;
  created: number;

  contextWindow: number;
  maxOutputTokens: number;

  supportsImages: boolean;
  supportsPromptCache: boolean;
  supportsReasoningBudget?: boolean;
  supportsReasoningEffort?: boolean | string[];
  supportedEndpoints?: string[];

  pricing?: {
    inputPerMillion?: number;
    outputPerMillion?: number;
    cacheReadPerMillion?: number;
    cacheWritePerMillion?: number;
  };
}

function toModelInfo(m: PoeApiModel): PoeModelInfo {

  const budget = m.reasoning?.budget != null;
  const effort = m.reasoning?.supports_reasoning_effort;

  return {
    id: m.id,
    rawId: m.id,
    ownedBy: m.owned_by,
    displayName: m.display_name,
    created: m.created ?? 0,
    contextWindow: m.context_window ?? 0,
    maxOutputTokens: m.max_output_tokens ?? 0,
    supportsImages: m.supports_images ?? false,
    supportsPromptCache: m.supports_prompt_cache ?? false,
    ...(budget && { supportsReasoningBudget: true }),
    ...(effort && { supportsReasoningEffort: effort }),
    ...(m.supported_endpoints?.length && { supportedEndpoints: m.supported_endpoints }),
    ...(m.pricing && {
      pricing: {
        ...(m.pricing.input_per_million != null && { inputPerMillion: m.pricing.input_per_million }),
        ...(m.pricing.output_per_million != null && { outputPerMillion: m.pricing.output_per_million }),
        ...(m.pricing.cache_read_per_million != null && { cacheReadPerMillion: m.pricing.cache_read_per_million }),
        ...(m.pricing.cache_write_per_million != null && { cacheWritePerMillion: m.pricing.cache_write_per_million }),
      },
    }),
  };
}

/** Look up a model by raw ID and return enriched info. */
export function getModel(id: string): PoeModelInfo | undefined {
  const raw = getStoredModel(id);
  return raw ? withCodeWorkarounds(toModelInfo(raw)) : undefined;
}

function isCodeCapable(m: PoeApiModel): boolean {
  return (
    m.output_modalities?.includes("text") === true &&
    m.supported_features?.includes("tools") === true
  );
}

/** Return enriched info for all code-capable models (text I/O + tool use). */
export function getModels(): PoeModelInfo[] {
  return getStoredModels().filter(isCodeCapable).map(toModelInfo).map(withCodeWorkarounds);
}
