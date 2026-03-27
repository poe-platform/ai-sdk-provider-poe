import type { LanguageModelV3 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { withAnthropicCache } from "./anthropic-cache.js";

type ModelTransform = (model: LanguageModelV3) => LanguageModelV3;

export type ProviderOptionsRecord = Record<string, Record<string, unknown>>;

function withPoeProviderOptions(model: LanguageModelV3): LanguageModelV3 {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => {
        const providerOptions = (params.providerOptions ?? {}) as ProviderOptionsRecord;
        const poe = providerOptions?.poe as Record<string, unknown> | undefined;
        if (!poe) return params;

        const nextProviderOptions: ProviderOptionsRecord = { ...providerOptions };
        delete nextProviderOptions.poe;

        if (model.provider === "anthropic.messages") {
          const budgetTokens = poe.reasoningBudgetTokens;
          const anthropic = { ...(nextProviderOptions.anthropic ?? {}) };
          if (anthropic.thinking == null && typeof budgetTokens === "number") {
            anthropic.thinking = { type: "enabled", budgetTokens };
          }
          if (Object.keys(anthropic).length > 0) {
            nextProviderOptions.anthropic = anthropic;
          }
        }

        if (model.provider === "openai.responses" || model.provider === "openai.chat") {
          const openai = { ...(nextProviderOptions.openai ?? {}) };
          if (openai.reasoningEffort == null && typeof poe.reasoningEffort === "string") {
            openai.reasoningEffort = poe.reasoningEffort;
          }
          if (model.provider === "openai.responses" && openai.reasoningSummary == null && typeof poe.reasoningSummary === "string") {
            openai.reasoningSummary = poe.reasoningSummary;
          }
          if (Object.keys(openai).length > 0) {
            nextProviderOptions.openai = openai;
          }
        }

        return {
          ...params,
          ...(Object.keys(nextProviderOptions).length > 0 ? { providerOptions: nextProviderOptions as typeof params.providerOptions } : {}),
        };
      },
    },
  });
}

const workarounds: ModelTransform[] = [withAnthropicCache, withPoeProviderOptions];

export function withWorkarounds(model: LanguageModelV3): LanguageModelV3 {
  return workarounds.reduce((m, w) => w(m), model);
}
