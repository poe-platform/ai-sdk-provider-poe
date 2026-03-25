#!/usr/bin/env tsx
/**
 * Probe runner — checks which workarounds are still needed.
 *
 * Usage:  npm run probe
 * Requires: POE_API_KEY environment variable
 *
 *   FIXED  = probe passed   → workaround removable
 *   NEEDED = probe threw     → workaround still required
 */
import "dotenv/config";
import { probes } from "../src/test/probes/index.js";

const apiKey = process.env.POE_API_KEY;
if (!apiKey) {
  console.error("POE_API_KEY is required to run probes");
  process.exit(1);
}

const baseURL = process.env.POE_BASE_URL ?? "https://api.poe.com/v1";
const connection = { apiKey, baseURL };

let anyFailed = false;

for (const probe of probes) {
  console.log(`\n--- ${probe.id} (${probe.issue}) ---`);
  console.log(`    ${probe.description}\n`);

  const mustPass = probe.expect === "pass";

  for (const modelId of probe.models) {
    try {
      await probe.check(modelId, connection);
      if (mustPass) {
        console.log(`  ✅ ${modelId}: OK`);
      } else {
        console.log(`  ✅ ${modelId}: FIXED — workaround removable`);
      }
    } catch (e: any) {
      if (mustPass) {
        anyFailed = true;
        console.log(`  ❌ ${modelId}: BROKEN — ${e.message}`);
      } else {
        anyFailed = true;
        console.log(`  ⚠️  ${modelId}: NEEDED — ${e.message}`);
      }
    }
  }
}

console.log(anyFailed ? "\nSome workarounds are still needed." : "\nAll workarounds can be removed! 🎉");
process.exit(anyFailed ? 1 : 0);
