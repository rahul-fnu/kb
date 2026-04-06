import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import {
  readManifest,
  writeManifest,
  getChangedEntries,
  updateCompiledHashes,
} from "../utils/manifest.js";
import {
  readExistingWiki,
  writeWikiPages,
  regenerateIndex,
  appendLog,
} from "../utils/wiki.js";
import { ClaudeAdapter } from "../adapter/index.js";
import type { WikiPage } from "../types.js";

export const compileCommand = new Command("compile")
  .description("Compile ingested sources into wiki pages")
  .action(async () => {
    const kbRoot = process.cwd();

    // 1. Read manifest
    let manifest;
    try {
      manifest = await readManifest(kbRoot);
    } catch {
      console.error(
        "Error: No manifest found. Run `kb init` and `kb ingest` first.",
      );
      process.exitCode = 1;
      return;
    }

    // 2. Determine changed files
    const changed = getChangedEntries(manifest);
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

    // 4. Read existing wiki pages (excluding INDEX.md and LOG.md)
    const existingWiki = await readExistingWiki(kbRoot);

    // 5. Read AGENTS.md for wiki maintainer instructions
    let agentInstructions = "";
    try {
      agentInstructions = await fs.readFile(
        path.join(kbRoot, "AGENTS.md"),
        "utf-8",
      );
    } catch {
      // No AGENTS.md is fine — use empty instructions
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
    const updatedManifest = updateCompiledHashes(
      manifest,
      changed.map((e) => e.filePath),
    );
    await writeManifest(kbRoot, updatedManifest);

    // 12. Print summary
    console.log("Compile complete.");
    if (pagesCreated.length > 0) {
      console.log(`  Created: ${pagesCreated.join(", ")}`);
    }
    if (pagesUpdated.length > 0) {
      console.log(`  Updated: ${pagesUpdated.join(", ")}`);
    }
    console.log(`  Total wiki pages: ${pagesCreated.length + pagesUpdated.length + existingWiki.length - pagesUpdated.length}`);
  });
