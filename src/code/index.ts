import { getModel, getModels } from "./models.js";

export { fetchPoeModels, POE_DEFAULT_BASE_URL } from "../poe-models.js";
export type { PoeApiModel } from "../poe-models.js";
export { getModel, getModels };
export type { PoeModelInfo } from "./models.js";
export { extractUsageMetrics, mapToolChoice } from "./ai-sdk-helpers.js";
export type { AiSdkToolChoice, UsageMetrics, LanguageModelUsageLike } from "./ai-sdk-helpers.js";

export const poeDefaultModelId = "claude-sonnet-4.6";

export interface PoeDefaultModelInfo {
  maxTokens: number;
  contextWindow: number;
  supportsImages: boolean;
  supportsPromptCache: boolean;
  inputPrice: number;
  outputPrice: number;
  cacheReadsPrice?: number;
  cacheWritesPrice?: number;
}

export function getPoeDefaultModelInfo(modelId: string = poeDefaultModelId): PoeDefaultModelInfo {
  const m = getModel(modelId);
  if (!m) throw new Error(`Unknown model: ${modelId}`);
  return {
    maxTokens: m.maxOutputTokens,
    contextWindow: m.contextWindow,
    supportsImages: m.supportsImages,
    supportsPromptCache: m.supportsPromptCache,
    inputPrice: m.pricing?.inputPerMillion ?? 0,
    outputPrice: m.pricing?.outputPerMillion ?? 0,
    ...(m.pricing?.cacheReadPerMillion != null && { cacheReadsPrice: m.pricing.cacheReadPerMillion }),
    ...(m.pricing?.cacheWritePerMillion != null && { cacheWritesPrice: m.pricing.cacheWritePerMillion }),
  };
}
