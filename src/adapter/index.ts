import type { LintResult, LintIssue, WikiPage } from "../types.js";

export { ClaudeAdapter } from "./claude.js";

/**
 * Local (non-AI) adapter that performs structural lint checks on wiki pages.
 * Used by `kb lint` for fast offline analysis.
 */
export class LocalAdapter {
  async lintWiki(pages: WikiPage[]): Promise<LintResult> {
    const issues: LintIssue[] = [];
    const pageSlugs = new Set(pages.map((p) => p.slug));

    // Build a map of which pages link to which
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    const mdLinkPattern = /\[([^\]]+)\]\(([^)]+)\.md\)/g;
    const linksFrom = new Map<string, Set<string>>();

    for (const page of pages) {
      const targets = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = linkPattern.exec(page.content)) !== null) {
        targets.add(match[1]);
      }
      while ((match = mdLinkPattern.exec(page.content)) !== null) {
        targets.add(match[2]);
      }
      linksFrom.set(page.slug, targets);
    }

    for (const page of pages) {
      // Orphan pages: not linked from any other page
      const isLinkedFromOther = pages.some(
        (other) =>
          other.slug !== page.slug &&
          linksFrom.get(other.slug)?.has(page.slug),
      );
      if (!isLinkedFromOther && pages.length > 1) {
        issues.push({
          type: "orphan",
          severity: "warning",
          page: page.slug,
          message: `Page "${page.slug}" is not linked from any other page`,
        });
      }

      // Missing topic pages: referenced but don't exist
      const targets = linksFrom.get(page.slug) ?? new Set();
      for (const target of targets) {
        if (!pageSlugs.has(target)) {
          issues.push({
            type: "missing",
            severity: "error",
            page: page.slug,
            message: `Page "${page.slug}" links to "${target}" which does not exist`,
          });
        }
      }

      // Uncited claims: no `> Source:` provenance
      const hasAnyCitation = page.content.includes("> Source:");
      if (!hasAnyCitation && page.content.trim().length > 0) {
        issues.push({
          type: "uncited",
          severity: "warning",
          page: page.slug,
          message: `Page "${page.slug}" has no source citations (missing "> Source:" lines)`,
        });
      }

      // Stale summaries: summary section very short relative to content
      const summaryMatch = page.content.match(
        /^#+\s*Summary\s*\n([\s\S]*?)(?=\n#|\n$|$)/im,
      );
      if (summaryMatch) {
        const summaryLength = summaryMatch[1].trim().length;
        const contentLength = page.content.length;
        if (
          summaryLength > 0 &&
          summaryLength < contentLength * 0.05 &&
          contentLength > 500
        ) {
          issues.push({
            type: "stale",
            severity: "warning",
            page: page.slug,
            message: `Page "${page.slug}" has a summary that may be stale (very short relative to content)`,
          });
        }
      }
    }

    // Contradictions: pages that define the same term differently
    const definitionPattern =
      /^#+\s*Definition\s*\n([\s\S]*?)(?=\n#|\n$|$)/im;
    const definitions = new Map<string, { page: string; text: string }[]>();
    for (const page of pages) {
      const defMatch = page.content.match(definitionPattern);
      if (defMatch) {
        const baseTopic = page.slug.toLowerCase();
        if (!definitions.has(baseTopic)) {
          definitions.set(baseTopic, []);
        }
        definitions
          .get(baseTopic)!
          .push({ page: page.slug, text: defMatch[1].trim() });
      }
    }
    for (const [, defs] of definitions) {
      if (defs.length > 1) {
        issues.push({
          type: "contradiction",
          severity: "error",
          page: defs.map((d) => d.page).join(", "),
          message: `Multiple pages define "${defs[0].page}": ${defs.map((d) => d.page).join(", ")}`,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }
}
