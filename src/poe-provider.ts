import type { LanguageModelV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createOpenAICompatible, type OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { POE_DEFAULT_BASE_URL, resolveProvider, fetchPoeModels, setRefetchFn } from "./poe-models.js";
import { withMiddlewares } from "./middlewares/index.js";

export interface PoeProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export interface PoeScopedProviderOptions {
  reasoningBudgetTokens?: number;
  reasoningEffort?: string;
  reasoningSummary?: string;
  /** Set to `false` to disable automatic Anthropic prompt caching breakpoints. Default: `true`. */
  cache?: boolean;
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
  let openaiResponsesProvider: OpenAIProvider | null = null;
  let openaiChatProvider: OpenAICompatibleProvider | null = null;

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

  /** @ai-sdk/openai — only used for /v1/responses endpoint */
  const getOpenAIResponsesProvider = () => {
    if (!openaiResponsesProvider) {
      openaiResponsesProvider = createOpenAI({
        baseURL,
        apiKey: getApiKey(),
        headers: options.headers,
        fetch: options.fetch,
      });
    }
    return openaiResponsesProvider;
  };

  /** @ai-sdk/openai-compatible — used for /v1/chat/completions.
   *  Flushes unfinished tool calls on stream end (unlike @ai-sdk/openai). */
  const getOpenAIChatProvider = () => {
    if (!openaiChatProvider) {
      openaiChatProvider = createOpenAICompatible({
        name: "openai",
        baseURL,
        apiKey: getApiKey(),
        headers: options.headers,
        fetch: options.fetch,
        supportsStructuredOutputs: true,
      });
    }
    return openaiChatProvider;
  };

  const languageModel = (modelId: string): LanguageModelV3 => {
    const { provider, model } = resolveProvider(modelId);

    switch (provider) {
      case "anthropic":
        return withMiddlewares(getAnthropicProvider()(model));
      case "openai-responses":
        return withMiddlewares(getOpenAIResponsesProvider().responses(model));
      case "openai-chat":
        return withMiddlewares(getOpenAIChatProvider().chatModel(model));
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
