export type SnapshotMode = "record" | "playback";
export type SnapshotMissBehavior = "error" | "warn" | "passthrough";

/** Vitest tags that override snapshot env variables per-test. */
export const SNAPSHOT_TAGS = {
  /** POE_SNAPSHOT_MODE=record */
  "snapshot:record": { mode: "record" as SnapshotMode },
  /** POE_SNAPSHOT_MISS=warn */
  "snapshot:miss-warn": { onMiss: "warn" as SnapshotMissBehavior },
  /** POE_SNAPSHOT_MISS=passthrough */
  "snapshot:miss-passthrough": { onMiss: "passthrough" as SnapshotMissBehavior },
} as const;

export type SnapshotTag = keyof typeof SNAPSHOT_TAGS;

export interface SnapshotTagOverrides {
  mode?: SnapshotMode;
  onMiss?: SnapshotMissBehavior;
}

export function parseTagOverrides(tags: string[]): SnapshotTagOverrides {
  const overrides: SnapshotTagOverrides = {};
  for (const tag of tags) {
    const entry = SNAPSHOT_TAGS[tag as SnapshotTag];
    if (entry) Object.assign(overrides, entry);
  }
  return overrides;
}

export interface SnapshotConfig {
  mode: SnapshotMode;
  snapshotDir: string;
  onMiss: SnapshotMissBehavior;
}

export function parseSnapshotConfig(env: Record<string, string | undefined>): SnapshotConfig {
  return {
    mode: parseSnapshotMode(env.POE_SNAPSHOT_MODE),
    snapshotDir: env.POE_SNAPSHOT_DIR?.trim() || ".snapshots",
    onMiss: parseSnapshotMiss(env.POE_SNAPSHOT_MISS) ?? "error"
  };
}

function parseSnapshotMode(value: string | undefined): SnapshotMode {
  const trimmed = value?.trim();
  if (trimmed === "record" || trimmed === "playback") {
    return trimmed;
  }
  return "playback";
}

function parseSnapshotMiss(value: string | undefined): SnapshotMissBehavior | undefined {
  const trimmed = value?.trim();
  if (trimmed === "error" || trimmed === "warn" || trimmed === "passthrough") {
    return trimmed;
  }
  return undefined;
}
