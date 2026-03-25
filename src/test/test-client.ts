import { parseSnapshotConfig } from "./snapshot-config.js";
import { createSnapshotFetch, type SnapshotFetch } from "./snapshot-fetch.js";

let sharedFetch: SnapshotFetch | null = null;

export function getSnapshotFetch(): SnapshotFetch {
  if (!sharedFetch) {
    const config = parseSnapshotConfig(process.env);
    sharedFetch = createSnapshotFetch(config);
  }
  return sharedFetch;
}

export function resetSnapshotFetch(): void {
  sharedFetch = null;
}

export async function persistAccessedKeys(): Promise<void> {
  if (sharedFetch) {
    await sharedFetch.persistAccessedKeys();
  }
}
