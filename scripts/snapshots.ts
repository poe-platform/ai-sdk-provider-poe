import { Command } from "commander";
import * as fs from "node:fs/promises";
import {
  listSnapshots,
  deleteSnapshots,
  findStaleSnapshots,
  pruneSnapshots
} from "../tests/helpers/snapshot-store.js";

const MAX_AGE_MS = 10 * 60 * 1000;

function resolveSnapshotDir(): string {
  return process.env.POE_SNAPSHOT_DIR?.trim() || "__snapshots__";
}

async function loadAccessedKeys(snapshotDir: string): Promise<Set<string>> {
  const accessedKeysPath = `${snapshotDir}/.accessed-keys.json`;
  const stat = await fs.stat(accessedKeysPath);
  const ageMs = Date.now() - stat.mtime.getTime();

  if (ageMs > MAX_AGE_MS) {
    const ageMinutes = Math.floor(ageMs / 60000);
    throw new Error(
      `Accessed keys file is ${ageMinutes} minutes old (max: 10 minutes).\n` +
      `Run tests first: POE_SNAPSHOT_MODE=playback npm test`
    );
  }

  const raw = await fs.readFile(accessedKeysPath, "utf8");
  return new Set(JSON.parse(raw) as string[]);
}

const program = new Command();

program
  .name("snapshots")
  .description("Manage fetch test snapshots");

program
  .command("list")
  .description("List all snapshots")
  .option("--url <url>", "Filter by URL")
  .action(async (options?: { url?: string }) => {
    const snapshotDir = resolveSnapshotDir();
    const summaries = await listSnapshots(snapshotDir, { url: options?.url });

    if (summaries.length === 0) {
      console.log("No snapshots found.");
      return;
    }

    for (const summary of summaries) {
      const streaming = summary.isStreaming ? "[stream]" : "";
      console.log(`${summary.key} | ${summary.method} ${summary.url} ${streaming}`);
    }
  });

program
  .command("list:stale")
  .description("List stale snapshots (run tests first)")
  .action(async () => {
    const snapshotDir = resolveSnapshotDir();
    const accessedKeys = await loadAccessedKeys(snapshotDir);
    const stale = await findStaleSnapshots(snapshotDir, accessedKeys);

    if (stale.length === 0) {
      console.log("No stale snapshots.");
      return;
    }

    for (const key of stale) {
      console.log(key);
    }
  });

program
  .command("delete")
  .description("Delete all snapshots")
  .action(async () => {
    const snapshotDir = resolveSnapshotDir();
    const deleted = await deleteSnapshots(snapshotDir);
    console.log(`Deleted ${deleted} snapshot${deleted === 1 ? "" : "s"}.`);
  });

program
  .command("delete:stale")
  .description("Delete stale snapshots (run tests first)")
  .action(async () => {
    const snapshotDir = resolveSnapshotDir();
    const accessedKeys = await loadAccessedKeys(snapshotDir);
    const pruned = await pruneSnapshots(snapshotDir, accessedKeys);
    console.log(`Deleted ${pruned.length} snapshot${pruned.length === 1 ? "" : "s"}.`);
  });

await program.parseAsync(process.argv);
