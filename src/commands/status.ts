import { Command } from "commander";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Manifest } from "../types.js";

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export const statusCommand = new Command("status")
  .description("Show the current status of the knowledge base")
  .action(async () => {
    const kbDir = join(process.cwd(), ".kb");
    const rawDir = join(process.cwd(), "raw");
    const manifestPath = join(kbDir, "manifest.json");

    // 1. Read manifest
    let manifest: Manifest;
    try {
      const raw = await readFile(manifestPath, "utf-8");
      manifest = JSON.parse(raw) as Manifest;
    } catch {
      console.error("No manifest found. Run `kb init` and `kb ingest` first.");
      process.exitCode = 1;
      return;
    }

    // 2. Read files in raw/
    let rawFiles: string[];
    try {
      rawFiles = await readdir(rawDir);
    } catch {
      rawFiles = [];
    }

    // 3. Check each manifest entry against current file hash
    const manifestPaths = new Set(manifest.entries.map((e) => e.filePath));
    const pending: string[] = [];
    const compiled: string[] = [];

    for (const entry of manifest.entries) {
      try {
        const content = await readFile(join(process.cwd(), entry.filePath), "utf-8");
        const currentHash = computeHash(content);
        if (currentHash === entry.lastCompiledHash) {
          compiled.push(entry.filePath);
        } else {
          pending.push(entry.filePath);
        }
      } catch {
        // File in manifest but missing on disk — treat as pending
        pending.push(entry.filePath);
      }
    }

    // 4. Check for untracked files in raw/
    const untracked: string[] = [];
    for (const file of rawFiles) {
      const filePath = join("raw", file);
      if (!manifestPaths.has(filePath)) {
        untracked.push(filePath);
      }
    }

    // 5. Print summary
    const totalRaw = rawFiles.length;
    console.log(`Status:`);
    console.log(`  ${totalRaw} total files in raw/`);
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
