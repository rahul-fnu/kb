import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { readManifest, writeManifest } from "../utils/manifest.js";
import {
  readExistingWiki,
  writeWikiPages,
  regenerateIndex,
  appendLog,
} from "../utils/wiki.js";
import { ClaudeAdapter } from "../adapter/index.js";

export const compileCommand = new Command("compile")
  .description("Compile ingested sources into wiki pages")
  .action(async () => {
    const kbRoot = process.cwd();
    const manifestPath = path.join(kbRoot, ".kb", "manifest.json");

    // 1. Read manifest
    const manifest = await readManifest(manifestPath);
    if (manifest.entries.length === 0) {
      console.error(
        "No files ingested. Run `kb ingest <file>` first.",
      );
      process.exitCode = 1;
      return;
    }

    // 2. Determine changed files (hash !== lastCompiledHash)
    const changed = manifest.entries.filter(
      (entry) => entry.hash !== entry.lastCompiledHash,
    );
    if (changed.length === 0) {
      console.log("Nothing to compile.");
      return;
    }

    console.log(`Found ${changed.length} file(s) to compile...`);

    // 3. Read contents of changed files from raw/
    const newSources = await Promise.all(
      changed.map(async (entry) => {
        const content = await fs.readFile(
          path.join(kbRoot, entry.filePath),
          "utf-8",
        );
        return { filePath: entry.filePath, content };
      }),
    );

    // 4. Read existing wiki pages
    const existingWiki = await readExistingWiki(kbRoot);

    // 5. Read AGENTS.md
    let agentInstructions = "";
    try {
      agentInstructions = await fs.readFile(
        path.join(kbRoot, "AGENTS.md"),
        "utf-8",
      );
    } catch {
      // No AGENTS.md is fine
    }

    // 6. Call adapter
    const adapter = new ClaudeAdapter();
    let output;
    try {
      output = await adapter.compileSources({
        newSources,
        existingWiki,
        agentInstructions,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Compile failed: ${message}`);
      process.exitCode = 1;
      return;
    }

    // 7. Determine created vs updated pages
    const existingSlugs = new Set(existingWiki.map((p) => p.slug));
    const pagesCreated: string[] = [];
    const pagesUpdated: string[] = [];
    for (const page of output.pages) {
      if (existingSlugs.has(page.slug)) {
        pagesUpdated.push(page.slug);
      } else {
        pagesCreated.push(page.slug);
      }
    }

    // 8. Write wiki pages
    await writeWikiPages(kbRoot, output.pages);

    // 9. Regenerate INDEX.md
    await regenerateIndex(kbRoot);

    // 10. Append to LOG.md
    await appendLog(
      kbRoot,
      changed.map((e) => e.filePath),
      pagesCreated,
      pagesUpdated,
    );

    // 11. Update manifest with lastCompiledHash
    const compiledPaths = new Set(changed.map((e) => e.filePath));
    manifest.entries = manifest.entries.map((entry) =>
      compiledPaths.has(entry.filePath)
        ? { ...entry, lastCompiledHash: entry.hash }
        : entry,
    );
    manifest.generatedAt = new Date().toISOString();
    await writeManifest(manifestPath, manifest);

    // 12. Print summary
    console.log("Compile complete.");
    if (pagesCreated.length > 0) {
      console.log(`  Created: ${pagesCreated.join(", ")}`);
    }
    if (pagesUpdated.length > 0) {
      console.log(`  Updated: ${pagesUpdated.join(", ")}`);
    }
    console.log(
      `  Total wiki pages: ${existingWiki.length + pagesCreated.length}`,
    );
  });
