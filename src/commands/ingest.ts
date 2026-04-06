import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import { createHash } from "node:crypto";
import { normalizeFilename } from "../utils/normalize.js";

interface ManifestEntry {
  originalPath: string;
  normalizedName: string;
  hash: string;
  ingestedAt: string;
}

interface Manifest {
  entries: ManifestEntry[];
}

function loadManifest(manifestPath: string): Manifest {
  if (existsSync(manifestPath)) {
    return JSON.parse(readFileSync(manifestPath, "utf-8"));
  }
  return { entries: [] };
}

function saveManifest(manifestPath: string, manifest: Manifest): void {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

function computeHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

export const ingestCommand = new Command("ingest")
  .description("Ingest source files into the knowledge base")
  .argument("<path>", "Path to the file to ingest")
  .action((filePath: string) => {
    const absPath = resolve(filePath);

    // 1. Verify the file exists
    if (!existsSync(absPath)) {
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
    mkdirSync(rawDir, { recursive: true });
    mkdirSync(kbDir, { recursive: true });

    // 4. Compute SHA-256 hash
    const hash = computeHash(absPath);

    // 5. Load manifest
    const manifestPath = resolve(kbDir, "manifest.json");
    const manifest = loadManifest(manifestPath);

    // Check if already ingested with same hash
    const existing = manifest.entries.find(
      (e) => e.normalizedName === normalizedName
    );

    if (existing && existing.hash === hash) {
      console.log("already ingested");
      return;
    }

    // Determine target name (version suffix if hash differs)
    let targetName = normalizedName;
    if (existing && existing.hash !== hash) {
      const ext = extname(normalizedName);
      const base = normalizedName.slice(0, normalizedName.length - ext.length);

      // Find the next available version number
      let version = 2;
      while (
        manifest.entries.some(
          (e) => e.normalizedName === `${base}-${version}${ext}`
        )
      ) {
        version++;
      }
      targetName = `${base}-${version}${ext}`;
    }

    // 6. Copy file to raw/
    const destPath = resolve(rawDir, targetName);
    copyFileSync(absPath, destPath);

    // 7. Record in manifest
    manifest.entries.push({
      originalPath: absPath,
      normalizedName: targetName,
      hash,
      ingestedAt: new Date().toISOString(),
    });
    saveManifest(manifestPath, manifest);

    // 8. Print result
    console.log(`Ingested: ${originalName} → raw/${targetName}`);
  });
