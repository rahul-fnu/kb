import { resolve, relative, normalize as nodeNormalize, sep } from "node:path";

/**
 * Normalize a file path to use forward slashes and be relative to a base directory.
 */
export function normalizePath(filePath: string, baseDir: string): string {
  const absolutePath = resolve(baseDir, filePath);
  const relativePath = relative(baseDir, absolutePath);
  return relativePath.split(sep).join("/");
}

/**
 * Normalize a path for use as a wiki key (lowercase, no extension, forward slashes).
 */
export function toWikiKey(filePath: string): string {
  const normalized = nodeNormalize(filePath).split(sep).join("/");
  // Remove leading ./
  const cleaned = normalized.replace(/^\.\//, "");
  // Remove file extension
  const withoutExt = cleaned.replace(/\.[^/.]+$/, "");
  return withoutExt.toLowerCase();
}

/**
 * Ensure a path ends with the given extension.
 */
export function ensureExtension(filePath: string, ext: string): string {
  if (filePath.endsWith(ext)) return filePath;
  return filePath + ext;
}

/**
 * Normalize a filename: lowercase, replace whitespace with hyphens,
 * strip non-alphanumeric chars (except hyphens, dots, underscores),
 * collapse multiple hyphens.
 */
export function normalizeFilename(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  const hasExt = dotIdx > 0;
  const base = hasExt ? name.slice(0, dotIdx) : name;
  const ext = hasExt ? name.slice(dotIdx) : "";

  const normalized = base
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-._]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized + ext.toLowerCase();
}
