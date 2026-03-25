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

const OWNER_PREFIX: Record<string, string> = {
  Anthropic: "anthropic",
  OpenAI: "openai",
  Google: "google",
};

function prefixId(rawId: string, ownedBy?: string): string {
  const prefix = ownedBy ? OWNER_PREFIX[ownedBy] : undefined;
  return prefix ? `${prefix}/${rawId}` : rawId;
}

function toModelInfo(m: PoeApiModel): PoeModelInfo {
  const id = prefixId(m.id, m.owned_by);

  const budget = m.reasoning?.budget != null;
  const effort = m.reasoning?.supports_reasoning_effort;

  return {
    id,
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

/** Return enriched info for all stored models. */
export function getModels(): PoeModelInfo[] {
  return getStoredModels().map(toModelInfo).map(withCodeWorkarounds);
}
