import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Manifest, ManifestEntry } from "../types.js";

const MANIFEST_VERSION = 1;

/**
 * Compute a SHA-256 hash of file content.
 */
export function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Create an empty manifest.
 */
export function createEmptyManifest(): Manifest {
  return {
    version: MANIFEST_VERSION,
    entries: [],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Read a manifest from a JSON file. Returns an empty manifest if the file doesn't exist.
 */
export async function readManifest(filePath: string): Promise<Manifest> {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    // Handle bare `{}` or missing fields from older init
    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      return createEmptyManifest();
    }
    return parsed as Manifest;
  } catch {
    return createEmptyManifest();
  }
}

/**
 * Write a manifest to a JSON file.
 */
export async function writeManifest(
  filePath: string,
  manifest: Manifest
): Promise<void> {
  await writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Build a manifest entry for a file given its path and content.
 */
export function buildEntry(filePath: string, content: string): ManifestEntry {
  return {
    filePath,
    hash: computeHash(content),
    lastModified: new Date().toISOString(),
  };
}

/**
 * Detect which files have changed between an old and new manifest.
 * Returns arrays of added, modified, and removed file paths.
 */
export function detectChanges(
  oldManifest: Manifest,
  newManifest: Manifest
): { added: string[]; modified: string[]; removed: string[] } {
  const oldMap = new Map(oldManifest.entries.map((e) => [e.filePath, e.hash]));
  const newMap = new Map(newManifest.entries.map((e) => [e.filePath, e.hash]));

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const [path, hash] of newMap) {
    if (!oldMap.has(path)) {
      added.push(path);
    } else if (oldMap.get(path) !== hash) {
      modified.push(path);
    }
  }

  for (const path of oldMap.keys()) {
    if (!newMap.has(path)) {
      removed.push(path);
    }
  }

  return { added, modified, removed };
}
