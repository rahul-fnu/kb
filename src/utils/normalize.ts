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
