/**
 * A probe tests whether an upstream bug still exists by hitting
 * the live Poe API — either raw (@ai-sdk/openai) or via our provider.
 *
 * - `check(modelId, connection)` makes a live call.
 *   Throws if the assertion fails.
 * - `expect`:
 *   - `"fail"` (default) — probe throws → bug still present (NEEDED),
 *      probe passes → bug fixed (FIXED).
 *   - `"pass"` — probe must pass; throwing means our workaround is broken.
 * - The runner (`scripts/probe-workarounds.ts`) iterates probes × models.
 *
 * To add a new probe: create a file in src/test/probes/, export a Probe,
 * and register it in the `probes` array below.
 */
export interface ProbeConnection {
  apiKey: string;
  baseURL: string;
}

export interface Probe {
  id: string;
  issue: string;
  description: string;
  expect?: "fail" | "pass";
  models: string[];
  check: (modelId: string, connection: ProbeConnection) => Promise<void>;
}

// --- Probe registry ---

import { geminiToolsProbe, geminiToolsWorkaroundProbe } from "./gemini-tools.js";

export const probes: Probe[] = [
  geminiToolsProbe,
  geminiToolsWorkaroundProbe,
];
