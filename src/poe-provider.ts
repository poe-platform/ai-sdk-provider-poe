import type { LanguageModelV1 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";

export interface PoeProviderSettings {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof globalThis.fetch;
}

export interface PoeProvider {
  (modelId: string): LanguageModelV1;
  languageModel(modelId: string): LanguageModelV1;
}

export function createPoe(options: PoeProviderSettings = {}): PoeProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? "https://api.poe.com/v1";

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
        fetch: options.fetch,
      });
    }
    return openaiProvider;
  };

  const languageModel = (modelId: string): LanguageModelV1 => {
    const [provider, ...modelParts] = modelId.split("/");
    const model = modelParts.join("/");

    switch (provider) {
      case "anthropic":
        return getAnthropicProvider()(model);
      case "openai":
        return getOpenAIProvider().responses(model);
      default:
        return getOpenAIProvider()(model);
    }
  };

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
