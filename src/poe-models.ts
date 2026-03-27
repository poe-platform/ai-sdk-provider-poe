import { loadApiKey } from "@ai-sdk/provider-utils";
import bundledRouting from "./data/bundled-routing.json" with { type: "json" };
import { applyWorkarounds } from "./model-definition-workarounds/index.js";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawApiModel = Record<string, any>;

interface PoeApiModelsResponse {
  data: RawApiModel[];
}

/** Convert per-token price string to per-million-token number. */
function toPerMillion(v?: string | number | null): number | undefined {
  if (v == null) return undefined;
  const n = (typeof v === "number" ? v : parseFloat(v)) * 1_000_000;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

/** Normalize a raw API model into the canonical PoeApiModel shape. Returns null if excluded by workarounds. */
function normalizeModel(raw: RawApiModel): PoeApiModel | null {
  const patched = applyWorkarounds(raw);
  if (patched === null) return null;
  raw = patched;
  const cw = raw.context_window;
  const contextWindow = typeof cw === "object" && cw ? cw.context_length : (typeof cw === "number" ? cw : undefined);
  const maxOutput = typeof cw === "object" && cw ? (cw.max_output_tokens ?? undefined) : raw.max_output_tokens;

  const p = raw.pricing;
  // Fields named *_per_million are already per-million-token prices;
  // legacy per-token fields (prompt, completion, …) need conversion.
  const inputPerMillion = p?.input_per_million ?? toPerMillion(p?.prompt);
  const outputPerMillion = p?.output_per_million ?? toPerMillion(p?.completion);
  const cacheReadPerMillion = p?.cache_read_per_million ?? toPerMillion(p?.input_cache_read);
  const cacheWritePerMillion = p?.cache_write_per_million ?? toPerMillion(p?.input_cache_write);

  return {
    id: raw.id,
    ...(raw.object && { object: raw.object }),
    ...(raw.created && { created: raw.created }),
    ...(raw.owned_by && { owned_by: raw.owned_by }),
    ...(raw.display_name && { display_name: raw.display_name }),
    ...(contextWindow && { context_window: contextWindow }),
    ...(maxOutput && { max_output_tokens: maxOutput }),
    ...((raw.supports_images || raw.architecture?.input_modalities?.includes("image")) && { supports_images: true }),
    ...((raw.supports_prompt_cache || cacheReadPerMillion != null) && { supports_prompt_cache: true }),
    ...(raw.supported_endpoints?.length && { supported_endpoints: raw.supported_endpoints }),
    ...(raw.supported_features?.length && { supported_features: raw.supported_features }),
    ...(() => {
      const om: string[] | undefined = raw.output_modalities?.length
        ? raw.output_modalities
        : raw.architecture?.output_modalities?.length ? raw.architecture.output_modalities : undefined;
      return om?.length ? { output_modalities: om } : {};
    })(),
    ...(raw.reasoning && { reasoning: raw.reasoning }),
    ...((inputPerMillion != null || outputPerMillion != null) && {
      pricing: {
        ...(inputPerMillion != null && { input_per_million: inputPerMillion }),
        ...(outputPerMillion != null && { output_per_million: outputPerMillion }),
        ...(cacheReadPerMillion != null && { cache_read_per_million: cacheReadPerMillion }),
        ...(cacheWritePerMillion != null && { cache_write_per_million: cacheWritePerMillion }),
      },
    }),
  };
}

// --- Model store ---

function loadBundled(): Map<string, PoeApiModel> {
  const map = new Map<string, PoeApiModel>();
  for (const m of bundledRouting) {
    const n = normalizeModel(m as RawApiModel);
    if (n) map.set(n.id, n);
  }
  return map;
}

let models: Map<string, PoeApiModel> = loadBundled();

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

/** @internal — for tests only. Optionally clears vs restores bundled data. */
export function _resetModelCache(clear = false): void {
  models = new Map();
  if (!clear) models = loadBundled();
  refetchInFlight = false;
  refetchFn = null;
}

// --- Routing ---

export type EffectiveProvider = "anthropic" | "openai-responses" | "openai-chat";

function resolveFromStore(model: string): { provider: EffectiveProvider; model: string } | undefined {
  const stored = models.get(model);
  const endpoint = stored?.supported_endpoints?.[0];
  if (!endpoint) return undefined;
  if (endpoint === "/v1/messages") return { provider: "anthropic", model };
  if (endpoint === "/v1/responses") return { provider: "openai-responses", model };
  return { provider: "openai-chat", model };
}

/** Rule-based fallback when model is not in the store. */
const RULES: [RegExp, EffectiveProvider][] = [
  [/^claude-(sonnet|opus|haiku)/, "anthropic"],
  [/^gpt-\d/, "openai-responses"],
  [/^o\d/, "openai-responses"],
  [/^gemini-/, "openai-chat"],
];

export function resolveByRule(model: string): EffectiveProvider {
  for (const [re, provider] of RULES) {
    if (re.test(model)) return provider;
  }
  return "openai-chat";
}

export function resolveProvider(modelId: string): { provider: EffectiveProvider; model: string } {
  const [prefix, ...rest] = modelId.split("/");
  const model = rest.length ? rest.join("/") : prefix;

  const hit = resolveFromStore(model);
  if (hit) return hit;

  // Model not in store → background refetch, fall back to rules
  if (models.size > 0 && !models.has(model)) triggerBackgroundRefetch();

  return { provider: resolveByRule(model), model };
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
  const normalized: PoeApiModel[] = [];
  models = new Map();
  for (const raw of body.data) {
    const m = normalizeModel(raw);
    if (m) { normalized.push(m); models.set(m.id, m); }
  }
  return normalized;
}
