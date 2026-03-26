#!/usr/bin/env tsx
/**
 * Fetches /v1/models from the Poe API and writes the raw response data.
 * The output is committed to the repo so routing works without a network call.
 * All normalization happens at runtime in poe-models.ts.
 *
 * Usage: npm run update-routing
 */

const API_URL = "https://api.poe.com/v1/models";
const OUTPUT = new URL("../src/data/bundled-routing.json", import.meta.url);

const res = await fetch(API_URL);
if (!res.ok) {
  console.error(`Failed to fetch: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const { data } = (await res.json()) as { data: Record<string, unknown>[] };

const models = data.filter((m) => (m.supported_endpoints as string[] | undefined)?.length);

const { writeFile, mkdir } = await import("node:fs/promises");
const { dirname } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const outPath = fileURLToPath(OUTPUT);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(models, null, 2) + "\n");

console.log(`Wrote ${models.length} models to ${outPath}`);
