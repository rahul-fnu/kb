import fs from "node:fs/promises";
import path from "node:path";
import type { Manifest, ManifestEntry } from "../types.js";

const MANIFEST_PATH = ".kb/manifest.json";

export async function readManifest(kbRoot: string): Promise<Manifest> {
  const fullPath = path.join(kbRoot, MANIFEST_PATH);
  const raw = await fs.readFile(fullPath, "utf-8");
  return JSON.parse(raw) as Manifest;
}

export async function writeManifest(
  kbRoot: string,
  manifest: Manifest,
): Promise<void> {
  const fullPath = path.join(kbRoot, MANIFEST_PATH);
  await fs.writeFile(fullPath, JSON.stringify(manifest, null, 2) + "\n");
}

export function getChangedEntries(manifest: Manifest): ManifestEntry[] {
  return manifest.entries.filter(
    (entry) => entry.hash !== entry.lastCompiledHash,
  );
}

export function updateCompiledHashes(
  manifest: Manifest,
  compiledPaths: string[],
): Manifest {
  const compiledSet = new Set(compiledPaths);
  return {
    ...manifest,
    entries: manifest.entries.map((entry) =>
      compiledSet.has(entry.filePath)
        ? { ...entry, lastCompiledHash: entry.hash }
        : entry,
    ),
    generatedAt: new Date().toISOString(),
  };
}
