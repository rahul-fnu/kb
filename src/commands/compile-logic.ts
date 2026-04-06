import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import type { CompileResult } from "../types.js";
import type { KbAdapter, CompiledWikiOutput } from "../adapter/claude.js";
import {
  readManifest,
  writeManifest,
  buildEntry,
  createEmptyManifest,
} from "../utils/manifest.js";

/**
 * Read all markdown files from a directory.
 */
export async function readRawFiles(
  rawDir: string
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  let entries: string[];
  try {
    entries = await readdir(rawDir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (extname(entry) === ".md") {
      const content = await readFile(join(rawDir, entry), "utf-8");
      files.set(entry, content);
    }
  }
  return files;
}

/**
 * Write compiled wiki output to disk.
 */
export async function writeWikiOutput(
  wikiDir: string,
  output: CompiledWikiOutput
): Promise<void> {
  await mkdir(wikiDir, { recursive: true });

  for (const [filePath, content] of output.files) {
    await writeFile(join(wikiDir, filePath), content, "utf-8");
  }

  // Write INDEX.md
  await writeFile(join(wikiDir, "INDEX.md"), output.index, "utf-8");

  // Append to LOG.md
  const logPath = join(wikiDir, "LOG.md");
  let existingLog = "";
  try {
    existingLog = await readFile(logPath, "utf-8");
  } catch {
    // File doesn't exist yet
  }
  await writeFile(
    logPath,
    existingLog + output.logEntry + "\n",
    "utf-8"
  );
}

/**
 * Run the full compile pipeline: read raw files, call adapter, write output, update manifest.
 */
export async function runCompile(
  baseDir: string,
  adapter: KbAdapter
): Promise<CompileResult> {
  const rawDir = join(baseDir, "raw");
  const wikiDir = join(baseDir, "wiki");
  const manifestPath = join(baseDir, ".kb", "manifest.json");

  // Read raw files
  const rawFiles = await readRawFiles(rawDir);

  if (rawFiles.size === 0) {
    return {
      success: false,
      outputPath: wikiDir,
      topicCount: 0,
      errors: ["No markdown files found in raw/"],
    };
  }

  // Call adapter
  const result = await adapter.compile(rawFiles);

  if (!result.success) {
    return result;
  }

  // Build new manifest from raw files
  const manifest = createEmptyManifest();
  for (const [filePath, content] of rawFiles) {
    manifest.entries.push(buildEntry(filePath, content));
  }

  // Ensure .kb directory exists and write manifest
  await mkdir(join(baseDir, ".kb"), { recursive: true });
  await writeManifest(manifestPath, manifest);

  return result;
}
