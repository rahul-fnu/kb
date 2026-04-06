import { Command } from "commander";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readManifest } from "../utils/manifest.js";

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export const statusCommand = new Command("status")
  .description("Show the current status of the knowledge base")
  .action(async () => {
    const kbRoot = process.cwd();
    const rawDir = join(kbRoot, "raw");
    const manifestPath = join(kbRoot, ".kb", "manifest.json");

    // 1. Read manifest
    const manifest = await readManifest(manifestPath);
    if (manifest.entries.length === 0) {
      console.log("No files ingested yet. Run `kb ingest <file>` first.");
      return;
    }

    // 2. Read files in raw/
    let rawFiles: string[];
    try {
      rawFiles = await readdir(rawDir);
    } catch {
      rawFiles = [];
    }

    // 3. Check each manifest entry
    const manifestPaths = new Set(manifest.entries.map((e) => e.filePath));
    const pending: string[] = [];
    const compiled: string[] = [];

    for (const entry of manifest.entries) {
      try {
        const content = await readFile(join(kbRoot, entry.filePath), "utf-8");
        const currentHash = computeHash(content);
        if (entry.lastCompiledHash && currentHash === entry.lastCompiledHash) {
          compiled.push(entry.filePath);
        } else {
          pending.push(entry.filePath);
        }
      } catch {
        pending.push(entry.filePath);
      }
    }

    // 4. Check for untracked files
    const untracked: string[] = [];
    for (const file of rawFiles) {
      const filePath = join("raw", file);
      if (!manifestPaths.has(filePath)) {
        untracked.push(filePath);
      }
    }

    // 5. Print summary
    console.log(`Status:`);
    console.log(`  ${rawFiles.length} total files in raw/`);
    console.log(`  ${compiled.length} compiled (up to date)`);
    console.log(`  ${pending.length} pending (new or changed)`);
    console.log(`  ${untracked.length} untracked (in raw/ but not in manifest)`);

    if (pending.length > 0) {
      console.log(`\nPending files:`);
      for (const f of pending) {
        console.log(`  - ${f}`);
      }
    }

    if (untracked.length > 0) {
      console.log(`\nUntracked files:`);
      for (const f of untracked) {
        console.log(`  - ${f}`);
      }
    }
  });
