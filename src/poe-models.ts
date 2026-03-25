import { loadApiKey } from "@ai-sdk/provider-utils";
import bundledRouting from "./data/bundled-routing.json" with { type: "json" };

export const POE_DEFAULT_BASE_URL = "https://api.poe.com/v1";

export interface PoeApiModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  display_name?: string;
  context_window?: number;
  max_output_tokens?: number;
  supports_images?: boolean;
  supports_prompt_cache?: boolean;
  supported_endpoints?: string[];
  supported_features?: string[];
  output_modalities?: string[];
  reasoning?: {
    budget?: { max_tokens: number; min_tokens: number } | null;
    required?: boolean;
    supports_reasoning_effort?: boolean | string[];
  };
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

// --- Model store ---

let models: Map<string, PoeApiModel> = new Map();
for (const m of bundledRouting) models.set(m.id, m as PoeApiModel);

let refetchInFlight = false;
let refetchFn: (() => Promise<void>) | null = null;

/** All stored models (bundled or fetched). */
export function getStoredModels(): PoeApiModel[] {
  return [...models.values()];
}

/** Look up a stored model by raw ID. */
export function getStoredModel(id: string): PoeApiModel | undefined {
  return models.get(id);
}

/** Register the function used for background refetch. */
export function setRefetchFn(fn: () => Promise<void>): void {
  refetchFn = fn;
}

function triggerBackgroundRefetch(): void {
  if (refetchInFlight || !refetchFn) return;
  refetchInFlight = true;
  refetchFn().catch(() => {}).finally(() => { refetchInFlight = false; });
}

/** @internal — for tests only */
export function _resetModelCache(): void {
  models = new Map();
  refetchInFlight = false;
  refetchFn = null;
}

// --- Routing ---

export type EffectiveProvider = "anthropic" | "openai-responses" | "openai-chat";

export function resolveProvider(modelId: string): { provider: EffectiveProvider; model: string } {
  const [prefix, ...rest] = modelId.split("/");
  const model = rest.length ? rest.join("/") : prefix;

  if (prefix === "anthropic" && rest.length) return { provider: "anthropic", model };

  const stored = models.get(model);
  const endpoints = stored?.supported_endpoints;
  if (endpoints?.length) {
    if (endpoints[0] === "/v1/messages") return { provider: "anthropic", model };
    if (endpoints[0] === "/v1/responses") return { provider: "openai-responses", model };
    return { provider: "openai-chat", model };
  }

  // Model not in store → background refetch
  if (models.size > 0 && !stored) triggerBackgroundRefetch();

  return { provider: "openai-chat", model };
}

// --- Fetch ---

export async function fetchPoeModels(options: {
  apiKey?: string;
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
} = {}): Promise<PoeApiModel[]> {
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
  models = new Map();
  for (const m of body.data) models.set(m.id, m);
  return body.data;
}
