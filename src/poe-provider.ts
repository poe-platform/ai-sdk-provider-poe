import type { LanguageModelV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { POE_DEFAULT_BASE_URL, resolveProvider, fetchPoeModels, setRefetchFn } from "./poe-models.js";

import { withWorkarounds } from "./workarounds/index.js";
import { patchingFetch } from "./workarounds/patch-output-text.js";

export interface PoeProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export interface PoeProvider {
  (modelId: string): LanguageModelV3;
  languageModel(modelId: string): LanguageModelV3;
}

export function createPoe(options: PoeProviderSettings = {}): PoeProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? POE_DEFAULT_BASE_URL;

  const getApiKey = () =>
    loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "POE_API_KEY",
      description: "Poe",
    });

  let anthropicProvider: AnthropicProvider | null = null;
  let openaiProvider: OpenAIProvider | null = null;

  const getAnthropicProvider = () => {
    if (!anthropicProvider) {
      anthropicProvider = createAnthropic({
        baseURL,
        apiKey: getApiKey(),
        headers: options.headers,
        fetch: options.fetch,
      });
    }
    return anthropicProvider;
  };

  const getOpenAIProvider = () => {
    if (!openaiProvider) {
      openaiProvider = createOpenAI({
        baseURL,
        apiKey: getApiKey(),
        headers: options.headers,
        fetch: patchingFetch(options.fetch ?? globalThis.fetch),
      });
    }
    return openaiProvider;
  };

  const languageModel = (modelId: string): LanguageModelV3 => {
    const { provider, model } = resolveProvider(modelId);

    switch (provider) {
      case "anthropic":
        return getAnthropicProvider()(model);
      case "openai-responses":
        return withWorkarounds(getOpenAIProvider().responses(model));
      case "openai-chat":
        return getOpenAIProvider().chat(model);
    }
  };

  // Register refetch function for cache-miss background refresh
  const doRefetch = () => fetchPoeModels({ apiKey: options.apiKey, baseURL, fetch: options.fetch }).then(() => {});
  setRefetchFn(doRefetch);

  // Background warm: populate routing cache from /v1/models
  doRefetch().catch(() => {});

  const provider = function (modelId: string) {
    if (new.target) {
      throw new Error("The Poe provider cannot be called with the new keyword.");
    }
    return languageModel(modelId);
  } as PoeProvider;

  provider.languageModel = languageModel;

  return provider;
}

export const poe = createPoe();
