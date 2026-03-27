import type { LanguageModelV3 } from "@ai-sdk/provider";

export type ModelMiddleware = (model: LanguageModelV3) => LanguageModelV3;
export type ProviderOptionsRecord = Record<string, Record<string, unknown>>;
