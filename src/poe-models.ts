import { loadApiKey } from "@ai-sdk/provider-utils";
import { OPENAI_MODELS } from "./openai-models.js";
import { GOOGLE_MODELS } from "./google-models.js";

export const POE_DEFAULT_BASE_URL = "https://api.poe.com/v1";

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

  pricing?: {
    inputPerMillion?: number;
    outputPerMillion?: number;
    cacheReadPerMillion?: number;
    cacheWritePerMillion?: number;
  };
}

interface PoeApiModel {
  id: string;
  object: string;
  created: number;
  owned_by?: string;
  display_name?: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_images?: boolean;
  supports_prompt_cache?: boolean;
  supports_reasoning_budget?: boolean;
  supports_reasoning_effort?: boolean | string[];
  pricing?: {
    input_per_million?: number;
    output_per_million?: number;
    cache_read_per_million?: number;
    cache_write_per_million?: number;
  };
}

interface PoeApiModelsResponse {
  data: PoeApiModel[];
}

// --- Routing ---

export type PoeRoute = "anthropic" | "openai" | "google" | "default";
export type EffectiveProvider = "anthropic" | "openai-responses" | "openai-chat";

const chatOnly = (models: Record<string, { route?: "chat" }>) =>
  new Set(Object.entries(models).filter(([, m]) => m.route === "chat").map(([n]) => n));

const OPENAI_CHAT_ONLY = chatOnly(OPENAI_MODELS);
const GOOGLE_CHAT_ONLY = chatOnly(GOOGLE_MODELS);

export function resolveRoute(modelId: string): { route: PoeRoute; model: string } {
  const [prefix, ...rest] = modelId.split("/");
  if (!rest.length) return { route: "default", model: prefix };
  const model = rest.join("/");
  switch (prefix) {
    case "anthropic": return { route: "anthropic", model };
    case "openai": return { route: "openai", model };
    case "google": return { route: "google", model };
    default: return { route: "default", model };
  }
}

export function resolveProvider(modelId: string): { provider: EffectiveProvider; model: string } {
  const { route, model } = resolveRoute(modelId);
  switch (route) {
    case "anthropic":
      return { provider: "anthropic", model };
    case "openai":
      if (OPENAI_CHAT_ONLY.has(model)) return { provider: "openai-chat", model };
      return { provider: "openai-responses", model };
    case "google":
      if (GOOGLE_CHAT_ONLY.has(model)) return { provider: "openai-chat", model };
      return { provider: "openai-responses", model };
    default:
      return { provider: "openai-chat", model };
  }
}

// --- Model info ---

const OWNER_PREFIX: Record<string, string> = {
  Anthropic: "anthropic",
  OpenAI: "openai",
  Google: "google",
};

// Models that deviate from provider-based reasoning defaults
const NO_BUDGET = new Set(["claude-haiku-3"]);
const EXTRA_BUDGET = new Set(["gemini-2.5-flash-lite"]);
const EXTRA_EFFORT = new Set(["grok-3-mini"]);

function prefixId(rawId: string, ownedBy?: string): string {
  const prefix = ownedBy ? OWNER_PREFIX[ownedBy] : undefined;
  return prefix ? `${prefix}/${rawId}` : rawId;
}

function toModelInfo(m: PoeApiModel): PoeModelInfo {
  const id = prefixId(m.id, m.owned_by);
  const { provider } = resolveProvider(id);

  // API response is authoritative; provider heuristic + overrides are fallback
  const budget = m.supports_reasoning_budget
    ?? (EXTRA_BUDGET.has(m.id) || (provider === "anthropic" && !NO_BUDGET.has(m.id)));
  const effort = m.supports_reasoning_effort
    ?? (EXTRA_EFFORT.has(m.id) || provider === "openai-responses");

  return {
    id,
    rawId: m.id,
    ownedBy: m.owned_by,
    displayName: m.display_name,
    created: m.created,
    contextWindow: m.context_window ?? 0,
    maxOutputTokens: m.max_output_tokens ?? 0,
    supportsImages: m.supports_images ?? false,
    supportsPromptCache: m.supports_prompt_cache ?? false,
    ...(budget && { supportsReasoningBudget: true }),
    ...(effort && { supportsReasoningEffort: effort }),
    ...(m.pricing && {
      pricing: {
        ...(m.pricing.input_per_million != null && {
          inputPerMillion: m.pricing.input_per_million,
        }),
        ...(m.pricing.output_per_million != null && {
          outputPerMillion: m.pricing.output_per_million,
        }),
        ...(m.pricing.cache_read_per_million != null && {
          cacheReadPerMillion: m.pricing.cache_read_per_million,
        }),
        ...(m.pricing.cache_write_per_million != null && {
          cacheWritePerMillion: m.pricing.cache_write_per_million,
        }),
      },
    }),
  };
}

export async function fetchPoeModels(options: {
  apiKey?: string;
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
} = {}): Promise<PoeModelInfo[]> {
  const apiKey = loadApiKey({
    apiKey: options.apiKey,
    environmentVariableName: "POE_API_KEY",
    description: "Poe",
  });
  const baseURL = options.baseURL ?? POE_DEFAULT_BASE_URL;
  const fetchFn = options.fetch ?? globalThis.fetch;

  const response = await fetchFn(`${baseURL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Poe API error: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as PoeApiModelsResponse;
  return body.data.map(toModelInfo);
}
