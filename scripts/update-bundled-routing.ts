#!/usr/bin/env tsx
/**
 * Fetches /v1/models from the Poe API and writes bundled model data.
 * The output is committed to the repo so routing and test config work without a network call.
 *
 * Usage: npm run update-routing
 */

const API_URL = "https://api.poe.com/v1/models";
const OUTPUT = new URL("../src/data/bundled-routing.json", import.meta.url);

interface ApiModel {
  id: string;
  owned_by?: string;
  supported_endpoints?: string[];
  supported_features?: string[];
  architecture?: { output_modalities?: string[] };
  reasoning?: {
    budget?: { max_tokens: number; min_tokens: number } | null;
    required?: boolean;
    supports_reasoning_effort?: boolean | string[];
  };
}

const res = await fetch(API_URL);
if (!res.ok) {
  console.error(`Failed to fetch: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const { data } = (await res.json()) as { data: ApiModel[] };

const models = data
  .filter((m) => m.supported_endpoints?.length)
  .map((m) => ({
    id: m.id,
    ...(m.owned_by && { owned_by: m.owned_by }),
    supported_endpoints: m.supported_endpoints,
    ...(m.supported_features?.length && { supported_features: m.supported_features }),
    ...(m.architecture?.output_modalities?.length && { output_modalities: m.architecture.output_modalities }),
    ...(m.reasoning && { reasoning: m.reasoning }),
  }));

const { writeFile, mkdir } = await import("node:fs/promises");
const { dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const outPath = fileURLToPath(OUTPUT);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(models, null, 2) + "\n");

console.log(`Wrote ${models.length} models to ${outPath}`);
