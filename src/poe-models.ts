import { loadApiKey } from "@ai-sdk/provider-utils";
import bundledRouting from "./data/bundled-routing.json" with { type: "json" };
import { MODEL_OVERRIDES } from "./model-overrides.js";

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
  supportedEndpoints?: string[];

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
  supported_endpoints?: string[];
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

// --- Owner prefix ---

const OWNER_PREFIX: Record<string, string> = {
  Anthropic: "anthropic",
  OpenAI: "openai",
  Google: "google",
};

function prefixId(rawId: string, ownedBy?: string): string {
  const prefix = ownedBy ? OWNER_PREFIX[ownedBy] : undefined;
  return prefix ? `${prefix}/${rawId}` : rawId;
}

// --- Bundled model lookup (keyed by raw ID) ---

export type BundledModel = (typeof bundledRouting)[number];
const bundledById = new Map<string, BundledModel>();
for (const m of bundledRouting) bundledById.set(m.id, m);

/** Look up bundled model data by raw ID (e.g. "gpt-5.2"). */
export function getBundledModel(rawId: string): BundledModel | undefined {
  return bundledById.get(rawId);
}

// --- Routing cache (keyed by raw ID) ---

// Seed from bundled data (shipped with package, no network needed)
let routingMap: Map<string, string[]> | null = (() => {
  const map = new Map<string, string[]>();
  for (const m of bundledRouting) {
    if (m.supported_endpoints) map.set(m.id, m.supported_endpoints);
  }
  return map;
})();
let refetchInFlight = false;
let refetchFn: (() => Promise<void>) | null = null;

/** Update in-memory routing map from API model data. */
export function updateRoutingMap(models: { id: string; supported_endpoints?: string[] }[]): void {
  routingMap = new Map();
  for (const m of models) {
    if (m.supported_endpoints) routingMap.set(m.id, m.supported_endpoints);
  }
}

/** Read routing map (sync). Returns null when cache is cold. */
export function getRoutingMap(): Map<string, string[]> | null {
  return routingMap;
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
export function _resetRoutingCache(): void {
  routingMap = null;
  refetchInFlight = false;
  refetchFn = null;
}

// --- Routing ---

export type EffectiveProvider = "anthropic" | "openai-responses" | "openai-chat";

export function resolveProvider(modelId: string): { provider: EffectiveProvider; model: string } {
  const [prefix, ...rest] = modelId.split("/");
  const model = rest.length ? rest.join("/") : prefix;

  if (prefix === "anthropic" && rest.length) return { provider: "anthropic", model };

  // Cache-first: use API-driven routing via supported_endpoints (keyed by raw ID)
  const endpoints = routingMap?.get(model);
  if (endpoints !== undefined) {
    if (endpoints[0] === "/v1/responses") return { provider: "openai-responses", model };
    return { provider: "openai-chat", model };
  }

  // Cache exists but model missing → background refetch
  if (routingMap !== null) triggerBackgroundRefetch();

  // Fallback: chat completions
  return { provider: "openai-chat", model };
}

// --- Model info ---

// Models that deviate from provider-based reasoning defaults
const NO_BUDGET = new Set(["claude-haiku-3"]);
const EXTRA_BUDGET = new Set(["gemini-2.5-flash-lite"]);
const EXTRA_EFFORT = new Set(["grok-3-mini"]);

function toModelInfo(m: PoeApiModel): PoeModelInfo {
  const id = prefixId(m.id, m.owned_by);
  const ownerPrefix = m.owned_by ? OWNER_PREFIX[m.owned_by] : undefined;
  const hasResponses = m.supported_endpoints?.includes("/v1/responses") ?? false;

  // API response is authoritative; heuristics are fallback
  const budget = m.supports_reasoning_budget
    ?? (EXTRA_BUDGET.has(m.id) || (ownerPrefix === "anthropic" && !NO_BUDGET.has(m.id)));
  const effort = m.supports_reasoning_effort
    ?? (EXTRA_EFFORT.has(m.id) || hasResponses);

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
    ...(m.supported_endpoints?.length && { supportedEndpoints: m.supported_endpoints }),
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
  const models = body.data.map(toModelInfo);
  updateRoutingMap(body.data);
  return models;
}

// --- Test models (derived from bundled data + overrides) ---

export interface TestModel {
  id: string;
  owner: string;
  hasTools: boolean;
  hasReasoning: boolean;
  skip?: string;
  tags: string[];
}

export function getTestModels(owner?: string): TestModel[] {
  const models: TestModel[] = [];
  for (const m of bundledRouting) {
    if (owner && m.owned_by !== owner) continue;
    const override = MODEL_OVERRIDES[m.id];
    const hasTools = (m.supported_features?.includes("tools") ?? false) && !override?.skipTools;
    const outputMods = m.output_modalities ?? [];
    const hasReasoning = !!("reasoning_effort" in m && m.reasoning_effort) || !!("reasoning_required" in m && m.reasoning_required);
    const tags: string[] = [];
    if (outputMods.includes("video")) tags.push("timeout:video");
    else if (outputMods.includes("image") && !outputMods.includes("text")) tags.push("timeout:image");
    else if (hasReasoning) tags.push("timeout:reasoning");

    models.push({
      id: m.id,
      owner: m.owned_by ?? "unknown",
      hasTools,
      hasReasoning,
      skip: override?.skip,
      tags,
    });
  }
  return models;
}
