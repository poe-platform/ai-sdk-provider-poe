import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import * as fs from "node:fs/promises";
import type { SnapshotMode, SnapshotMissBehavior } from "./snapshot-config.js";

export interface SnapshotFetchOptions {
  mode: SnapshotMode;
  snapshotDir: string;
  onMiss: SnapshotMissBehavior;
  now?: () => Date;
}

export interface FetchSnapshot {
  key: string;
  response: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
    chunks?: string[];
  };
}

export class SnapshotMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotMissingError";
  }
}

export interface SnapshotFetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  getAccessedKeys(): Set<string>;
  persistAccessedKeys(): Promise<void>;
}

export function createSnapshotFetch(options: SnapshotFetchOptions): SnapshotFetch {
  const accessedKeys = new Set<string>();

  const snapshotFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : null;
    const isStreaming = body?.stream === true;

    const key = generateSnapshotKey(url, body);
    const snapshotPath = join(options.snapshotDir, `${key}.json`);

    accessedKeys.add(key);

    if (options.mode === "record") {
      return recordSnapshot(input, init, snapshotPath, key, options, isStreaming);
    }

    return playbackSnapshot(input, init, snapshotPath, key, options, isStreaming);
  };

  snapshotFetch.getAccessedKeys = () => accessedKeys;

  snapshotFetch.persistAccessedKeys = async () => {
    if (accessedKeys.size === 0) return;

    const outputPath = join(options.snapshotDir, ".accessed-keys.json");
    let existingKeys: string[] = [];
    try {
      const raw = await fs.readFile(outputPath, "utf8");
      existingKeys = JSON.parse(raw);
    } catch {
      // File doesn't exist
    }

    const merged = new Set([...existingKeys, ...accessedKeys]);
    await fs.mkdir(options.snapshotDir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(Array.from(merged), null, 2));
  };

  return snapshotFetch;
}

function generateSnapshotKey(url: string, body: unknown): string {
  const normalized = JSON.stringify({ url, body });
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 12);
  const urlPath = new URL(url).pathname.replace(/\//g, "-").slice(1);
  const model = (body as { model?: string })?.model?.replace(/[/:]/g, "-") ?? "unknown";
  return `${urlPath}-${model}-${hash}`;
}

async function recordSnapshot(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  snapshotPath: string,
  key: string,
  _options: SnapshotFetchOptions,
  isStreaming: boolean
): Promise<Response> {
  const response = await fetch(input, init);

  let responseBody: unknown;
  let chunks: string[] | undefined;

  if (isStreaming && response.body) {
    chunks = [];
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value, { stream: true }));
    }

    responseBody = null;
  } else {
    responseBody = await response.clone().json();
  }

  const snapshot: FetchSnapshot = {
    key,
    response: {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      chunks
    },
  };

  await fs.mkdir(dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

  if (isStreaming && chunks) {
    return new Response(createChunkStream(chunks), {
      status: response.status,
      headers: response.headers
    });
  }

  return new Response(JSON.stringify(responseBody), {
    status: response.status,
    headers: response.headers
  });
}

async function playbackSnapshot(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  snapshotPath: string,
  key: string,
  options: SnapshotFetchOptions,
  isStreaming: boolean
): Promise<Response> {
  let snapshot: FetchSnapshot;

  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    snapshot = JSON.parse(raw);
  } catch (error) {
    if (isNotFound(error)) {
      return handleMiss(input, init, key, options);
    }
    throw error;
  }

  if (isStreaming && snapshot.response.chunks) {
    return new Response(createChunkStream(snapshot.response.chunks), {
      status: snapshot.response.status,
      headers: snapshot.response.headers
    });
  }

  return new Response(JSON.stringify(snapshot.response.body), {
    status: snapshot.response.status,
    headers: snapshot.response.headers
  });
}

async function handleMiss(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  key: string,
  options: SnapshotFetchOptions
): Promise<Response> {
  if (options.onMiss === "error") {
    throw new SnapshotMissingError(`Snapshot not found: ${key}`);
  }
  if (options.onMiss === "warn") {
    console.warn(`Snapshot not found: ${key}; falling back to live call.`);
  }
  return fetch(input, init);
}

function createChunkStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    }
  });
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
