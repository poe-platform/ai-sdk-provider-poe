import { join } from "node:path";
import * as fs from "node:fs/promises";
import type { FetchSnapshot } from "./snapshot-fetch.js";

export interface SnapshotSummary {
  key: string;
  url: string;
  method: string;
  recordedAt?: string;
  isStreaming: boolean;
}

export async function listSnapshots(
  snapshotDir: string,
  options?: { url?: string }
): Promise<SnapshotSummary[]> {
  const entries = await readSnapshotEntries(snapshotDir);
  const filtered = options?.url
    ? entries.filter((e) => e.request.url.includes(options.url!))
    : entries;

  return filtered.map((entry) => ({
    key: entry.key,
    url: entry.request.url,
    method: entry.request.method,
    recordedAt: entry.metadata?.recordedAt,
    isStreaming: Array.isArray(entry.response.chunks)
  }));
}

export async function deleteSnapshots(
  snapshotDir: string,
  options?: { key?: string; url?: string }
): Promise<number> {
  if (options?.key) {
    const deleted = await deleteSnapshotByKey(snapshotDir, options.key);
    return deleted ? 1 : 0;
  }

  const entries = await readSnapshotEntries(snapshotDir);
  const filtered = options?.url
    ? entries.filter((e) => e.request.url.includes(options.url!))
    : entries;

  let deleted = 0;
  for (const entry of filtered) {
    const path = join(snapshotDir, `${entry.key}.json`);
    try {
      await fs.unlink(path);
      deleted += 1;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return deleted;
}

export async function findStaleSnapshots(
  snapshotDir: string,
  accessedKeys: Set<string>
): Promise<string[]> {
  const entries = await readSnapshotEntries(snapshotDir);
  return entries
    .filter((entry) => !accessedKeys.has(entry.key))
    .map((entry) => entry.key);
}

export async function pruneSnapshots(
  snapshotDir: string,
  accessedKeys: Set<string>
): Promise<string[]> {
  const stale = await findStaleSnapshots(snapshotDir, accessedKeys);
  for (const key of stale) {
    const path = join(snapshotDir, `${key}.json`);
    try {
      await fs.unlink(path);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return stale;
}

async function readSnapshotEntries(snapshotDir: string): Promise<FetchSnapshot[]> {
  const files = await readSnapshotFiles(snapshotDir);
  const entries: FetchSnapshot[] = [];

  for (const file of files) {
    const path = join(snapshotDir, file);
    try {
      const raw = await fs.readFile(path, "utf8");
      const parsed = JSON.parse(raw) as FetchSnapshot;
      if (parsed && typeof parsed.key === "string") {
        entries.push(parsed);
      }
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return entries;
}

async function readSnapshotFiles(snapshotDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(snapshotDir);
    return files.filter((name) => name.endsWith(".json") && !name.startsWith("."));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
}

async function deleteSnapshotByKey(snapshotDir: string, key: string): Promise<boolean> {
  const path = join(snapshotDir, `${key}.json`);
  try {
    await fs.unlink(path);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
