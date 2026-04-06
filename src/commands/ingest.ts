import { Command } from "commander";
import fs from "node:fs/promises";
import { resolve, basename, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { normalizeFilename } from "../utils/normalize.js";
import { readManifest, writeManifest } from "../utils/manifest.js";
import type { Manifest, ManifestEntry } from "../types.js";

function computeFileHash(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export const ingestCommand = new Command("ingest")
  .description("Ingest source files into the knowledge base")
  .argument("<path>", "Path to the file to ingest")
  .action(async (filePath: string) => {
    const absPath = resolve(filePath);

    // 1. Verify the file exists
    try {
      await fs.access(absPath);
    } catch {
      console.error(`Error: file not found: ${absPath}`);
      process.exitCode = 1;
      return;
    }

    // 2. Normalize the filename
    const originalName = basename(absPath);
    const normalizedName = normalizeFilename(originalName);

    // 3. Ensure raw/ and .kb/ directories exist
    const rawDir = resolve("raw");
    const kbDir = resolve(".kb");
    await fs.mkdir(rawDir, { recursive: true });
    await fs.mkdir(kbDir, { recursive: true });

    // 4. Compute SHA-256 hash
    const fileContent = await fs.readFile(absPath);
    const hash = computeFileHash(fileContent);

    // 5. Load manifest
    const manifestPath = join(kbDir, "manifest.json");
    const manifest = await readManifest(manifestPath);

    // Check if already ingested with same hash
    const existing = manifest.entries.find(
      (e) => e.filePath === join("raw", normalizedName),
    );

    if (existing && existing.hash === hash) {
      console.log("already ingested");
      return;
    }

    // Determine target name (version suffix if hash differs)
    let targetName = normalizedName;
    if (existing && existing.hash !== hash) {
      const ext = extname(normalizedName);
      const base = normalizedName.slice(
        0,
        normalizedName.length - ext.length,
      );

      let version = 2;
      while (
        manifest.entries.some(
          (e) => e.filePath === join("raw", `${base}-${version}${ext}`),
        )
      ) {
        version++;
      }
      targetName = `${base}-${version}${ext}`;
    }

    // 6. Copy file to raw/
    const destPath = resolve(rawDir, targetName);
    await fs.copyFile(absPath, destPath);

    // 7. Record in manifest
    const entry: ManifestEntry = {
      filePath: join("raw", targetName),
      hash,
      lastModified: new Date().toISOString(),
    };
    manifest.entries.push(entry);
    manifest.generatedAt = new Date().toISOString();
    await writeManifest(manifestPath, manifest);

    // 8. Print result
    console.log(`Ingested: ${originalName} → raw/${targetName}`);
  });
