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
