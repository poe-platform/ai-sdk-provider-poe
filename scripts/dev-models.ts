import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

type RawApiModel = Record<string, any>;

function toPerMillion(v?: string | number | null): number | undefined {
  if (v == null) return undefined;
  const n = (typeof v === "number" ? v : parseFloat(v)) * 1_000_000;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

export function normalizeModel(raw: RawApiModel): PoeApiModel {
  const cw = raw.context_window;
  const contextWindow =
    typeof cw === "object" && cw
      ? cw.context_length
      : typeof cw === "number"
        ? cw
        : undefined;
  const maxOutput =
    typeof cw === "object" && cw ? (cw.max_output_tokens ?? undefined) : raw.max_output_tokens;

  const p = raw.pricing;
  const inputPerMillion = p?.input_per_million ?? toPerMillion(p?.prompt);
  const outputPerMillion = p?.output_per_million ?? toPerMillion(p?.completion);
  const cacheReadPerMillion = p?.cache_read_per_million ?? toPerMillion(p?.input_cache_read);
  const cacheWritePerMillion = p?.cache_write_per_million ?? toPerMillion(p?.input_cache_write);

  return {
    id: raw.id,
    ...(raw.object && { object: raw.object }),
    ...(raw.created && { created: raw.created }),
    ...(raw.owned_by && { owned_by: raw.owned_by }),
    ...((raw.display_name || raw.metadata?.display_name) && {
      display_name: raw.display_name ?? raw.metadata.display_name,
    }),
    ...(contextWindow && { context_window: contextWindow }),
    ...(maxOutput && { max_output_tokens: maxOutput }),
    ...((raw.supports_images || raw.architecture?.input_modalities?.includes("image")) && {
      supports_images: true,
    }),
    ...((raw.supports_prompt_cache || cacheReadPerMillion != null) && { supports_prompt_cache: true }),
    ...(raw.supported_endpoints?.length && { supported_endpoints: raw.supported_endpoints }),
    ...(raw.supported_features?.length && { supported_features: raw.supported_features }),
    ...(raw.output_modalities?.length
      ? { output_modalities: raw.output_modalities }
      : raw.architecture?.output_modalities?.length && { output_modalities: raw.architecture.output_modalities }),
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

export function loadBundledModels(): Map<string, PoeApiModel> {
  const raw = JSON.parse(
    readFileSync(new URL("../src/data/bundled-routing.json", import.meta.url), "utf8"),
  ) as RawApiModel[];

  return new Map(raw.map((model) => {
    const normalized = normalizeModel(model);
    return [normalized.id, normalized] as const;
  }));
}

export const models = loadBundledModels();

export function resolveProvider(
  modelId: string,
): { provider: "anthropic" | "openai-responses" | "openai-chat"; model: string } {
  const [prefix, ...rest] = modelId.split("/");
  const model = rest.length ? rest.join("/") : prefix;
  const stored = models.get(model);

  if (prefix === "anthropic" && rest.length) return { provider: "anthropic", model };

  const endpoints = stored?.supported_endpoints;
  if (endpoints?.length) {
    if (endpoints.includes("/v1/messages")) return { provider: "anthropic", model };
    if (endpoints.includes("/v1/responses")) return { provider: "openai-responses", model };
    return { provider: "openai-chat", model };
  }

  if (prefix === "google" && rest.length) return { provider: "openai-chat", model };

  return { provider: "openai-chat", model };
}

export function endpointPath(
  provider: "anthropic" | "openai-responses" | "openai-chat",
): string {
  switch (provider) {
    case "anthropic":
      return "/v1/messages";
    case "openai-responses":
      return "/v1/responses";
    case "openai-chat":
      return "/v1/chat/completions";
  }
}

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

export function toModelInfo(m: PoeApiModel): PoeModelInfo {
  const budget = m.reasoning?.budget != null;
  const effort = m.reasoning?.supports_reasoning_effort;

  return {
    id: m.id,
    rawId: m.id,
    ownedBy: m.owned_by,
    displayName: m.display_name,
    created: m.created ?? 0,
    contextWindow: m.context_window ?? 0,
    maxOutputTokens: m.max_output_tokens ?? 0,
    supportsImages: m.supports_images ?? false,
    supportsPromptCache: m.supports_prompt_cache ?? false,
    ...(budget && { supportsReasoningBudget: true }),
    ...(effort && { supportsReasoningEffort: effort }),
    ...(m.supported_endpoints?.length && { supportedEndpoints: m.supported_endpoints }),
    ...(m.pricing && {
      pricing: {
        ...(m.pricing.input_per_million != null && { inputPerMillion: m.pricing.input_per_million }),
        ...(m.pricing.output_per_million != null && { outputPerMillion: m.pricing.output_per_million }),
        ...(m.pricing.cache_read_per_million != null && { cacheReadPerMillion: m.pricing.cache_read_per_million }),
        ...(m.pricing.cache_write_per_million != null && { cacheWritePerMillion: m.pricing.cache_write_per_million }),
      },
    }),
  };
}

export function isCodeCapable(m: PoeApiModel): boolean {
  return (
    m.output_modalities?.includes("text") === true &&
    m.supported_features?.includes("tools") === true
  );
}

export function applyAnthropicBudget(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningBudget) return m;
  if (m.ownedBy !== "Anthropic") return m;
  if (!models.get(m.rawId)?.reasoning) return m;
  return { ...m, supportsReasoningBudget: true };
}

const BUDGET_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

const GEMINI_EFFORT_LEVELS: Record<string, string[]> = {
  "gemini-3.1-pro": ["low", "medium", "high"],
  "gemini-3-flash": ["minimal", "low", "medium", "high"],
};

export function applyGeminiReasoning(m: PoeModelInfo): PoeModelInfo {
  const budget = m.supportsReasoningBudget || BUDGET_MODELS.has(m.rawId);

  let effort = m.supportsReasoningEffort;
  if (effort === true) {
    effort = GEMINI_EFFORT_LEVELS[m.rawId] ?? effort;
  }

  if (budget === (m.supportsReasoningBudget ?? false) && effort === m.supportsReasoningEffort) return m;

  return {
    ...m,
    ...(budget && { supportsReasoningBudget: true }),
    ...(effort && { supportsReasoningEffort: effort }),
  };
}

const XAI_EFFORT_LEVELS: Record<string, string[]> = {
  "grok-3-mini": ["low", "high"],
};

export function applyXaiEffort(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningEffort !== true) return m;
  const levels = XAI_EFFORT_LEVELS[m.rawId];
  if (!levels) return m;
  return { ...m, supportsReasoningEffort: levels };
}

const XHIGH_WITH_NONE = /^gpt-5\.[2-9](?!.*chat)/;
const XHIGH_CODEX = /^gpt-5\.(?:[1-9]\d*)-codex-max$|^gpt-5\.[2-9]\d*-codex$/;
const XHIGH_SPARK = /^gpt-5\.[3-9]\d*-codex-spark$/;

const EFFORTS_XHIGH_NONE: string[] = ["none", "low", "medium", "high", "xhigh"];
const EFFORTS_XHIGH: string[] = ["low", "medium", "high", "xhigh"];

function effortsFor(rawId: string): string[] | undefined {
  if (XHIGH_CODEX.test(rawId) || XHIGH_SPARK.test(rawId)) return EFFORTS_XHIGH;
  if (XHIGH_WITH_NONE.test(rawId)) return EFFORTS_XHIGH_NONE;
  return undefined;
}

export function applyXhighEffort(m: PoeModelInfo): PoeModelInfo {
  if (m.supportsReasoningEffort !== true) return m;
  const efforts = effortsFor(m.rawId);
  if (!efforts) return m;
  return { ...m, supportsReasoningEffort: efforts };
}

type ModelTransform = (m: PoeModelInfo) => PoeModelInfo;

const workarounds: Array<[name: string, transform: ModelTransform]> = [
  ["applyAnthropicBudget", applyAnthropicBudget],
  ["applyGeminiReasoning", applyGeminiReasoning],
  ["applyXaiEffort", applyXaiEffort],
  ["applyXhighEffort", applyXhighEffort],
];

export function applyWorkaroundsTracked(m: PoeModelInfo): { result: PoeModelInfo; applied: string[] } {
  let result = m;
  const applied: string[] = [];

  for (const [name, transform] of workarounds) {
    const next = transform(result);
    if (next !== result) applied.push(name);
    result = next;
  }

  return { result, applied };
}

export interface RooCodeModelInfo {
  contextWindow: number;
  maxTokens: number;
  supportsImages: boolean;
  supportsPromptCache: boolean;
  supportsReasoningBudget?: boolean;
  supportsReasoningEffort?: string[];
  inputPrice?: number;
  outputPrice?: number;
  cacheReadsPrice?: number;
  cacheWritesPrice?: number;
}

export function toRooCodeModelInfo(m: PoeModelInfo): RooCodeModelInfo {
  return {
    contextWindow: m.contextWindow,
    maxTokens: m.maxOutputTokens,
    supportsImages: m.supportsImages,
    supportsPromptCache: m.supportsPromptCache,
    ...(m.supportsReasoningBudget && { supportsReasoningBudget: true }),
    ...(Array.isArray(m.supportsReasoningEffort) && {
      supportsReasoningEffort: m.supportsReasoningEffort,
    }),
    ...(m.pricing?.inputPerMillion != null && { inputPrice: m.pricing.inputPerMillion }),
    ...(m.pricing?.outputPerMillion != null && { outputPrice: m.pricing.outputPerMillion }),
    ...(m.pricing?.cacheReadPerMillion != null && {
      cacheReadsPrice: m.pricing.cacheReadPerMillion,
    }),
    ...(m.pricing?.cacheWritePerMillion != null && {
      cacheWritesPrice: m.pricing.cacheWritePerMillion,
    }),
  };
}

export type EffectiveProvider = ReturnType<typeof resolveProvider>["provider"];

export interface ModelEntry {
  id: string;
  displayName?: string;
  ownedBy?: string;
  isCodeCapable: boolean;
  routing: { provider: EffectiveProvider; endpoint: string };
  raw: PoeApiModel;
  codeModelInfo: PoeModelInfo;
  workaroundsApplied: string[];
  rooCode: RooCodeModelInfo;
  reasoningUI: "budget" | "effort" | "none";
  requestWorkarounds: { poeProviderOptions: boolean; patchingFetch: boolean };
}

function toReasoningUI(m: PoeModelInfo): ModelEntry["reasoningUI"] {
  if (m.supportsReasoningBudget) return "budget";
  if (Array.isArray(m.supportsReasoningEffort) && m.supportsReasoningEffort.length > 0) return "effort";
  return "none";
}

export function buildModelEntries(modelMap: ReadonlyMap<string, PoeApiModel> = models): ModelEntry[] {
  return Array.from(modelMap, ([id, raw]) => {
    const { provider } = resolveProvider(id);
    const { result: codeModelInfo, applied } = applyWorkaroundsTracked(toModelInfo(raw));

    return {
      id,
      displayName: raw.display_name,
      ownedBy: raw.owned_by,
      isCodeCapable: isCodeCapable(raw),
      routing: { provider, endpoint: endpointPath(provider) },
      raw,
      codeModelInfo,
      workaroundsApplied: applied,
      rooCode: toRooCodeModelInfo(codeModelInfo),
      reasoningUI: toReasoningUI(codeModelInfo),
      requestWorkarounds: {
        poeProviderOptions: true,
        patchingFetch: provider === "openai-responses",
      },
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export interface DevModelsCliOptions {
  mode?: "json" | "cli";
  modelId?: string;
  error?: string;
}

export interface DevModelsCliResult {
  handled: boolean;
  exitCode: number;
}

export interface DevModelsCliIO {
  out(text: string): void;
  err(text: string): void;
}

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TOKEN_FORMAT = new Intl.NumberFormat("en-US");

function parseCliArgs(argv: string[]): DevModelsCliOptions {
  let mode: DevModelsCliOptions["mode"];
  const positionals: string[] = [];

  for (const arg of argv) {
    if (arg === "--json" || arg === "--cli") {
      const nextMode = arg === "--json" ? "json" : "cli";
      if (mode && mode !== nextMode) return { error: "Choose either --json or --cli." };
      mode = nextMode;
      continue;
    }

    if (arg.startsWith("-")) {
      if (mode) return { mode, error: `Unknown flag: ${arg}` };
      continue;
    }

    positionals.push(arg);
  }

  if (!mode) return {};
  if (positionals.length > 1) return { mode, error: "Expected at most one model id." };
  return { mode, modelId: positionals[0] };
}

function findModelEntry(
  entries: readonly ModelEntry[],
  modelId?: string,
): ModelEntry | ModelEntry[] | undefined {
  if (!modelId) return [...entries];
  return entries.find((entry) => entry.id === modelId);
}

function formatTokens(tokens: number): string {
  return `${TOKEN_FORMAT.format(tokens)} tokens`;
}

function formatUsd(price?: number): string | undefined {
  return price == null ? undefined : USD_FORMAT.format(price);
}

function formatPricing(entry: ModelEntry): string {
  const input = formatUsd(entry.rooCode.inputPrice);
  const output = formatUsd(entry.rooCode.outputPrice);
  if (!input && !output) return "n/a";
  const parts = [input && `${input} in`, output && `${output} out`].filter(Boolean);
  return `${parts.join(" / ")} per M tokens`;
}

function formatRooCodeSummary(rooCode: RooCodeModelInfo): string {
  const parts = [
    rooCode.supportsReasoningBudget && "supportsReasoningBudget=true",
    rooCode.supportsReasoningEffort?.length &&
      `supportsReasoningEffort=${rooCode.supportsReasoningEffort.join("|")}`,
  ].filter(Boolean);

  return parts.join(", ") || "none";
}

function formatHeader(entry: ModelEntry): string {
  const title = `${entry.id} (${entry.displayName ?? entry.id})`;
  return `── ${title} ${"─".repeat(Math.max(1, 72 - title.length - 3))}`;
}

function formatFieldRows(fields: Array<[label: string, value: string]>): string {
  const width = Math.max(...fields.map(([label]) => `${label}:`.length));
  return fields.map(([label, value]) => `  ${`${label}:`.padEnd(width)} ${value}`).join("\n");
}

function formatModelSummary(entry: ModelEntry): string {
  return [
    formatHeader(entry),
    formatFieldRows([
      ["Owner", entry.ownedBy ?? "unknown"],
      ["Route", `${entry.routing.provider} → ${entry.routing.endpoint}`],
      ["Code", entry.isCodeCapable ? "yes" : "no"],
      ["Reasoning", entry.reasoningUI],
      ["Context", formatTokens(entry.codeModelInfo.contextWindow)],
      ["Max out", formatTokens(entry.codeModelInfo.maxOutputTokens)],
      ["Images", entry.codeModelInfo.supportsImages ? "yes" : "no"],
      ["Cache", entry.codeModelInfo.supportsPromptCache ? "yes" : "no"],
      ["Pricing", formatPricing(entry)],
      ["Workarounds", entry.workaroundsApplied.join(", ") || "none"],
      ["Roo-Code", formatRooCodeSummary(entry.rooCode)],
      ["Fetch fix", `patchingFetch=${entry.requestWorkarounds.patchingFetch ? "yes" : "no"}`],
    ]),
  ].join("\n");
}

function formatJsonBlock(label: string, value: unknown): string {
  return `${label}:\n${JSON.stringify(value, null, 2)}`;
}

function formatModelDetails(entry: ModelEntry): string {
  return [
    formatModelSummary(entry),
    formatJsonBlock("Raw JSON", entry.raw),
    formatJsonBlock("/code JSON", entry.codeModelInfo),
    formatJsonBlock("Roo-Code JSON", entry.rooCode),
  ].join("\n\n");
}

function usageText(): string {
  return [
    "Usage:",
    "  npm run dev:models",
    "  npm run dev:models -- --json [model-id]",
    "  npm run dev:models -- --cli [model-id]",
  ].join("\n");
}

export function runCli(
  argv: string[],
  entries: readonly ModelEntry[] = buildModelEntries(),
  io: DevModelsCliIO = {
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
  },
): DevModelsCliResult {
  const options = parseCliArgs(argv);
  if (!options.mode && !options.error) return { handled: false, exitCode: 0 };

  if (options.error) {
    io.err(`${options.error}\n${usageText()}\n`);
    return { handled: true, exitCode: 1 };
  }

  const result = findModelEntry(entries, options.modelId);
  if (!result) {
    io.err(`Model \"${options.modelId}\" not found.\n`);
    return { handled: true, exitCode: 1 };
  }

  const output =
    options.mode === "json"
      ? JSON.stringify(result, null, 2)
      : Array.isArray(result)
        ? result.map(formatModelSummary).join("\n\n")
        : formatModelDetails(result);

  io.out(`${output}\n`);
  return { handled: true, exitCode: 0 };
}

type RequestLike = Pick<IncomingMessage, "headers" | "method" | "url">;
type ResponseLike = Pick<ServerResponse<IncomingMessage>, "end" | "writeHead">;

function writeJson(res: ResponseLike, statusCode: number, body: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

const PROVIDER_META: Record<
  EffectiveProvider,
  { label: string; color: string; tint: string }
> = {
  anthropic: {
    label: "Anthropic",
    color: "#e8590c",
    tint: "rgba(232, 89, 12, 0.10)",
  },
  "openai-responses": {
    label: "OpenAI Responses",
    color: "#16a34a",
    tint: "rgba(22, 163, 74, 0.10)",
  },
  "openai-chat": {
    label: "OpenAI Chat",
    color: "#2563eb",
    tint: "rgba(37, 99, 235, 0.10)",
  },
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatProviderLabel(provider: EffectiveProvider): string {
  return PROVIDER_META[provider].label;
}

function formatReasoningLabel(reasoning: ModelEntry["reasoningUI"]): string {
  switch (reasoning) {
    case "budget":
      return "Reasoning: budget";
    case "effort":
      return "Reasoning: effort";
    case "none":
      return "Reasoning: none";
  }
}

function formatTokenValue(tokens: number): string {
  return tokens > 0 ? formatTokens(tokens) : "n/a";
}

function renderBadge(text: string, tone: "neutral" | "success" | "muted" = "neutral"): string {
  return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
}

function renderJson(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function renderWorkaroundBadges(workaroundNames: readonly string[]): string {
  if (!workaroundNames.length) return renderBadge("none", "muted");
  return workaroundNames.map((name) => renderBadge(name)).join("");
}

function renderProviderCount(entries: readonly ModelEntry[], provider: EffectiveProvider): string {
  const count = entries.filter((entry) => entry.routing.provider === provider).length;
  const { label, color } = PROVIDER_META[provider];

  return `
    <div class="stat-chip provider-count" style="--provider-color:${color}">
      <span class="stat-label">${escapeHtml(label)}</span>
      <strong class="stat-value">${TOKEN_FORMAT.format(count)}</strong>
    </div>`;
}

function renderTableRow(entry: ModelEntry): string {
  const provider = entry.routing.provider;
  const providerMeta = PROVIDER_META[provider];
  const encodedId = encodeURIComponent(entry.id);

  return `
    <tr
      data-id="${escapeHtml(entry.id.toLowerCase())}"
      data-provider="${escapeHtml(provider)}"
      data-code="${entry.isCodeCapable}"
      data-reasoning="${escapeHtml(entry.reasoningUI)}"
    >
      <td><a href="/models/${encodedId}">${escapeHtml(entry.id)}</a></td>
      <td>${escapeHtml(entry.displayName ?? entry.id)}</td>
      <td>${escapeHtml(entry.ownedBy ?? "—")}</td>
      <td><span class="provider-dot" style="--dot:${providerMeta.color}"></span>${escapeHtml(providerMeta.label)}</td>
      <td class="center">${entry.isCodeCapable ? "✓" : "—"}</td>
      <td>${escapeHtml(entry.reasoningUI)}</td>
      <td class="right">${entry.codeModelInfo.contextWindow ? TOKEN_FORMAT.format(entry.codeModelInfo.contextWindow) : "—"}</td>
      <td class="right">${entry.codeModelInfo.maxOutputTokens ? TOKEN_FORMAT.format(entry.codeModelInfo.maxOutputTokens) : "—"}</td>
      <td>${escapeHtml(formatPricing(entry))}</td>
    </tr>`;
}

const BASE_STYLES = `
    :root {
      color-scheme: light;
      --bg: #f8fafc;
      --panel: rgba(255,255,255,0.92);
      --text: #0f172a;
      --muted: #475569;
      --line: #dbe4f0;
      --shadow: 0 18px 48px rgba(15,23,42,0.08);
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: linear-gradient(180deg, #f8fafc, #eef4ff);
      color: var(--text);
    }
    a { color: #1d4ed8; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code, pre { font-family: "SFMono-Regular", ui-monospace, Menlo, monospace; }
    .hidden { display: none !important; }
    #app { width: min(1400px, calc(100vw - 32px)); margin: 0 auto; padding: 32px 0 48px; }

    .panel {
      background: var(--panel);
      border: 1px solid rgba(219,228,240,0.85);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
      padding: 24px;
      margin-bottom: 20px;
    }

    .badge {
      display: inline-flex; align-items: center;
      border-radius: 999px; padding: 5px 10px;
      font-size: 0.78rem; font-weight: 700;
      border: 1px solid rgba(148,163,184,0.28);
      background: rgba(255,255,255,0.78);
    }
    .badge-success { background: rgba(22,163,74,0.12); color: #166534; border-color: rgba(22,163,74,0.24); }
    .badge-muted { background: rgba(148,163,184,0.14); color: #475569; border-color: rgba(148,163,184,0.26); }

    .provider-dot {
      display: inline-block; width: 10px; height: 10px;
      border-radius: 50%; background: var(--dot);
      margin-right: 6px; vertical-align: middle;
    }
`;

function renderIndexHTML(entries: readonly ModelEntry[]): string {
  const totalModels = entries.length;
  const codeCapableCount = entries.filter((e) => e.isCodeCapable).length;
  const rows = entries.map(renderTableRow).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poe Models</title>
  <style>
    ${BASE_STYLES}

    .stats { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { font-size: 0.9rem; color: var(--muted); }
    .stat strong { color: var(--text); font-size: 1.1rem; margin-right: 4px; }

    .controls {
      display: flex; flex-wrap: wrap; gap: 14px; align-items: end;
      margin-bottom: 16px;
    }
    .control { display: flex; flex-direction: column; gap: 6px; min-width: 160px; flex: 1 1 160px; }
    .control label { font-size: 0.85rem; color: var(--muted); font-weight: 600; }
    .checkbox-control { flex: 0 0 auto; min-width: 160px; }
    .checkbox-control label { display: flex; align-items: center; gap: 8px; min-height: 40px; font-size: 0.85rem; color: var(--muted); font-weight: 600; }
    .checkbox-control input[type=checkbox] { width: 16px; height: 16px; }
    input, select {
      width: 100%; border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 9px 10px; background: #fff; color: var(--text); font: inherit;
    }
    input:focus, select:focus { outline: 2px solid rgba(37,99,235,0.2); border-color: #60a5fa; }

    .visible-count { margin-left: auto; font-size: 0.9rem; color: var(--muted); align-self: end; padding-bottom: 10px; }
    .visible-count strong { color: var(--text); }

    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    thead th {
      text-align: left; padding: 10px 12px; font-size: 0.78rem;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--muted); border-bottom: 2px solid var(--line);
      cursor: pointer; user-select: none; white-space: nowrap;
    }
    thead th:hover { color: var(--text); }
    thead th.sort-asc::after { content: " \\25B2"; font-size: 0.65rem; }
    thead th.sort-desc::after { content: " \\25BC"; font-size: 0.65rem; }
    tbody td { padding: 8px 12px; border-bottom: 1px solid rgba(219,228,240,0.6); }
    tbody tr:hover { background: rgba(37,99,235,0.04); }
    td.center { text-align: center; }
    td.right { text-align: right; font-variant-numeric: tabular-nums; }

    .empty-state { padding: 22px; color: var(--muted); text-align: center; }
  </style>
</head>
<body>
  <main id="app">
    <div class="panel">
      <h1 style="margin:0 0 8px; font-size:1.6rem;">Poe Models</h1>
      <div class="stats">
        <span class="stat"><strong>${TOKEN_FORMAT.format(totalModels)}</strong> total</span>
        <span class="stat"><strong>${TOKEN_FORMAT.format(codeCapableCount)}</strong> code-capable</span>
        <span class="stat"><strong>${TOKEN_FORMAT.format(entries.filter((e) => e.routing.provider === "anthropic").length)}</strong> Anthropic</span>
        <span class="stat"><strong>${TOKEN_FORMAT.format(entries.filter((e) => e.routing.provider === "openai-responses").length)}</strong> OpenAI Responses</span>
        <span class="stat"><strong>${TOKEN_FORMAT.format(entries.filter((e) => e.routing.provider === "openai-chat").length)}</strong> OpenAI Chat</span>
      </div>
    </div>

    <div class="panel" style="padding:18px 24px">
      <div class="controls">
        <div class="control">
          <label for="search">Search</label>
          <input id="search" type="search" placeholder="Filter by model id...">
        </div>
        <div class="control">
          <label for="provider-filter">Provider</label>
          <select id="provider-filter">
            <option value="all">All</option>
            <option value="anthropic">Anthropic</option>
            <option value="openai-responses">OpenAI Responses</option>
            <option value="openai-chat">OpenAI Chat</option>
          </select>
        </div>
        <div class="control">
          <label for="reasoning-filter">Reasoning</label>
          <select id="reasoning-filter">
            <option value="all">All</option>
            <option value="budget">Budget</option>
            <option value="effort">Effort</option>
            <option value="none">None</option>
          </select>
        </div>
        <div class="checkbox-control">
          <label for="code-only">
            <input id="code-only" type="checkbox">
            <span>Code-capable only</span>
          </label>
        </div>
        <div class="visible-count" aria-live="polite">
          <strong id="visible-count">${TOKEN_FORMAT.format(totalModels)}</strong> visible
        </div>
      </div>
    </div>

    <div class="panel" style="padding:0; overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th data-col="id">ID</th>
            <th data-col="name">Name</th>
            <th data-col="owner">Owner</th>
            <th data-col="provider">Provider</th>
            <th data-col="code">Code</th>
            <th data-col="reasoning">Reasoning</th>
            <th data-col="context">Context</th>
            <th data-col="output">Max Output</th>
            <th data-col="pricing">Pricing</th>
          </tr>
        </thead>
        <tbody id="model-tbody">
          ${rows}
        </tbody>
      </table>
      <div id="empty-state" class="empty-state hidden">No models match the current filters.</div>
    </div>
  </main>

  <script>
    const rows = Array.from(document.querySelectorAll('#model-tbody tr'));
    const search = document.getElementById('search');
    const providerF = document.getElementById('provider-filter');
    const reasoningF = document.getElementById('reasoning-filter');
    const codeOnly = document.getElementById('code-only');
    const countEl = document.getElementById('visible-count');
    const empty = document.getElementById('empty-state');

    function applyFilters() {
      const q = (search.value || '').trim().toLowerCase();
      const prov = providerF.value;
      const reas = reasoningF.value;
      const code = codeOnly.checked;
      let n = 0;
      for (const row of rows) {
        const d = row.dataset;
        const show =
          (!q || d.id.includes(q) || row.textContent.toLowerCase().includes(q)) &&
          (prov === 'all' || d.provider === prov) &&
          (reas === 'all' || d.reasoning === reas) &&
          (!code || d.code === 'true');
        row.classList.toggle('hidden', !show);
        if (show) n++;
      }
      countEl.textContent = new Intl.NumberFormat('en-US').format(n);
      empty.classList.toggle('hidden', n > 0);
    }

    search.addEventListener('input', applyFilters);
    providerF.addEventListener('change', applyFilters);
    reasoningF.addEventListener('change', applyFilters);
    codeOnly.addEventListener('change', applyFilters);

    // Column sorting
    let sortCol = '', sortAsc = true;
    document.querySelectorAll('thead th').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (sortCol === col) sortAsc = !sortAsc;
        else { sortCol = col; sortAsc = true; }
        document.querySelectorAll('thead th').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
        th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
        const idx = Array.from(th.parentElement.children).indexOf(th);
        const tbody = document.getElementById('model-tbody');
        const sorted = [...rows].sort((a, b) => {
          const at = a.children[idx].textContent.trim();
          const bt = b.children[idx].textContent.trim();
          const an = parseFloat(at.replace(/,/g, '')), bn = parseFloat(bt.replace(/,/g, ''));
          if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
          return sortAsc ? at.localeCompare(bt) : bt.localeCompare(at);
        });
        for (const r of sorted) tbody.appendChild(r);
      });
    });

    applyFilters();
  </script>
</body>
</html>`;
}

function renderDetailHTML(entry: ModelEntry): string {
  const provider = entry.routing.provider;
  const providerMeta = PROVIDER_META[provider];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(entry.id)} - Poe Models</title>
  <style>
    ${BASE_STYLES}

    .back { display: inline-block; margin-bottom: 16px; font-size: 0.9rem; }

    h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 16px; }

    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }

    .meta-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px; margin-bottom: 20px;
    }
    .meta-item {
      display: flex; flex-direction: column; gap: 4px;
      padding: 14px; border-radius: 14px;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(219,228,240,0.9);
    }
    .meta-item span {
      font-size: 0.78rem; font-weight: 700; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .meta-item strong, .meta-item code { font-size: 0.95rem; }

    .section-label {
      font-size: 0.82rem; font-weight: 700; color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.04em;
      margin: 20px 0 8px;
    }
    .pipeline-arrow {
      text-align: center; color: var(--muted); font-size: 1.2rem;
      margin: 12px 0;
    }
    .workarounds-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; }
    .workarounds-row .label { font-size: 0.82rem; font-weight: 700; color: var(--muted); margin-right: 4px; }

    pre {
      margin: 0; padding: 14px; border-radius: 12px;
      background: #0f172a; color: #e2e8f0;
      font-size: 0.8rem; line-height: 1.55;
      overflow: auto; white-space: pre-wrap; word-break: break-word;
    }
  </style>
</head>
<body>
  <main id="app">
    <a class="back" href="/">&larr; All models</a>

    <div class="panel">
      <h1>${escapeHtml(entry.displayName ?? entry.id)}</h1>
      <div class="subtitle"><code>${escapeHtml(entry.id)}</code></div>

      <div class="badges">
        ${renderBadge(formatProviderLabel(provider))}
        ${renderBadge(entry.isCodeCapable ? "Code-capable" : "No code", entry.isCodeCapable ? "success" : "muted")}
        ${renderBadge(formatReasoningLabel(entry.reasoningUI), entry.reasoningUI === "none" ? "muted" : "neutral")}
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span>Owner</span><strong>${escapeHtml(entry.ownedBy ?? "unknown")}</strong></div>
        <div class="meta-item"><span>Provider</span><strong style="color:${providerMeta.color}">${escapeHtml(providerMeta.label)}</strong></div>
        <div class="meta-item"><span>Endpoint</span><code>${escapeHtml(entry.routing.endpoint)}</code></div>
        <div class="meta-item"><span>Context window</span><strong>${escapeHtml(formatTokenValue(entry.codeModelInfo.contextWindow))}</strong></div>
        <div class="meta-item"><span>Max output</span><strong>${escapeHtml(formatTokenValue(entry.codeModelInfo.maxOutputTokens))}</strong></div>
        <div class="meta-item"><span>Images</span><strong>${entry.codeModelInfo.supportsImages ? "Yes" : "No"}</strong></div>
        <div class="meta-item"><span>Prompt cache</span><strong>${entry.codeModelInfo.supportsPromptCache ? "Yes" : "No"}</strong></div>
        <div class="meta-item"><span>Pricing</span><strong>${escapeHtml(formatPricing(entry))}</strong></div>
      </div>
    </div>

    <div class="panel">
      <div class="section-label">Pipeline</div>

      <div class="section-label" style="margin-top:12px">Raw /v1/models</div>
      <pre>${renderJson(entry.raw)}</pre>

      <div class="pipeline-arrow">&darr;</div>

      <div class="workarounds-row">
        <span class="label">Workarounds:</span>
        ${renderWorkaroundBadges(entry.workaroundsApplied)}
      </div>

      <div class="section-label">/code PoeModelInfo</div>
      <pre>${renderJson(entry.codeModelInfo)}</pre>

      <div class="pipeline-arrow">&darr;</div>

      <div class="section-label">Roo-Code ModelRecord</div>
      <pre>${renderJson(entry.rooCode)}</pre>
    </div>

    <div class="panel">
      <div class="section-label">Request-time workarounds</div>
      <div class="badges" style="margin-top:8px">
        ${renderBadge("withPoeProviderOptions", "success")}
        ${renderBadge(`patchingFetch=${entry.requestWorkarounds.patchingFetch ? "yes" : "no"}`, entry.requestWorkarounds.patchingFetch ? "success" : "muted")}
      </div>
    </div>
  </main>
</body>
</html>`;
}

export function renderDashboardHtml(entries: readonly ModelEntry[] = buildModelEntries()): string {
  return renderIndexHTML(entries);
}

export function startServer(
  entries: readonly ModelEntry[] = buildModelEntries(),
  port = Number(process.env.PORT ?? 3456),
) {
  const indexHtml = renderIndexHTML(entries);
  const server = createServer((req, res) => handleRequest(req, res, entries, indexHtml));

  server.listen(port, () => {
    const address = server.address();
    const listenPort = typeof address === "object" && address ? address.port : port;
    const baseUrl = `http://localhost:${listenPort}`;

    console.log(`Dashboard: ${baseUrl}/`);
    console.log(`API: ${baseUrl}/api/models`);
  });

  return server;
}

export function handleRequest(
  req: RequestLike,
  res: ResponseLike,
  entries: readonly ModelEntry[] = buildModelEntries(),
  indexHtml = renderIndexHTML(entries),
) {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (method !== "GET") return writeJson(res, 405, { error: "Method not allowed" });

  if (url.pathname === "/api/models") return writeJson(res, 200, entries);

  if (url.pathname.startsWith("/api/models/")) {
    const modelId = decodeURIComponent(url.pathname.slice("/api/models/".length));
    const entry = entries.find((item) => item.id === modelId);

    return entry
      ? writeJson(res, 200, entry)
      : writeJson(res, 404, {
          error: `Model \"${modelId}\" not found`,
          availableIds: entries.map((item) => item.id),
        });
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexHtml);
    return;
  }

  if (url.pathname.startsWith("/models/")) {
    const modelId = decodeURIComponent(url.pathname.slice("/models/".length));
    const entry = entries.find((item) => item.id === modelId);

    if (entry) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderDetailHTML(entry));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><html><body><h1>Model not found</h1><p>${escapeHtml(modelId)}</p><a href="/">Back</a></body></html>`);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found\n");
}

function isMainModule(): boolean {
  return process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const result = runCli(process.argv.slice(2));
  if (result.handled) process.exit(result.exitCode);
  startServer();
}
