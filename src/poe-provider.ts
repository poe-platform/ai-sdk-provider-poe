import type { LanguageModelV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { OPENAI_MODELS } from "./openai-models.js";
import { GOOGLE_MODELS } from "./google-models.js";

const chatOnly = (models: Record<string, { route?: "chat" }>) =>
  new Set(Object.entries(models).filter(([, m]) => m.route === "chat").map(([n]) => n));

const OPENAI_CHAT_ONLY = chatOnly(OPENAI_MODELS);
const GOOGLE_CHAT_ONLY = chatOnly(GOOGLE_MODELS);

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

  const languageModel = (modelId: string): LanguageModelV3 => {
    const [prefix, ...rest] = modelId.split("/");
    const [provider, model] = rest.length ? [prefix, rest.join("/")] : [null, prefix];

    switch (provider) {
      case "anthropic":
        return getAnthropicProvider()(model);
      case "openai":
        if (OPENAI_CHAT_ONLY.has(model)) return getOpenAIProvider().chat(model);
        return getOpenAIProvider().responses(model);
      case "google":
        if (GOOGLE_CHAT_ONLY.has(model)) return getOpenAIProvider().chat(model);
        return getOpenAIProvider().responses(model);
      default:
        return getOpenAIProvider().chat(model);
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
