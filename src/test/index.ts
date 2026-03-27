import { expect } from "vitest";

export { parseSnapshotConfig, parseTagOverrides, SNAPSHOT_TAGS, type SnapshotConfig, type SnapshotMode, type SnapshotMissBehavior, type SnapshotTag, type SnapshotTagOverrides } from "./snapshot-config.js";
export { createSnapshotFetch, SnapshotMissingError, type SnapshotFetch, type SnapshotFetchOptions, type FetchSnapshot } from "./snapshot-fetch.js";
export { listSnapshots, deleteSnapshots, findStaleSnapshots, pruneSnapshots, type SnapshotSummary } from "./snapshot-store.js";
export { getSnapshotFetch, resetSnapshotFetch, persistAccessedKeys } from "./test-client.js";

interface ReasoningPartLike {
  text?: unknown;
}

export function getReasoningText(reasoning: unknown): string {
  if (!Array.isArray(reasoning)) return "";

  return reasoning
    .map((part) => {
      const text = (part as ReasoningPartLike | null | undefined)?.text;
      return typeof text === "string" ? text : "";
    })
    .join("")
    .trim();
}

export function expectReasoningText(reasoning: unknown): string {
  expect(Array.isArray(reasoning)).toBe(true);
  expect(reasoning.length).toBeGreaterThan(0);

  const text = getReasoningText(reasoning);
  expect(text).toBeTruthy();

  return text;
}
