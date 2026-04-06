import type { KbAdapter, LintResult, LintIssue, WikiPage } from "../types.js";

/**
 * Default adapter that performs local (non-AI) lint checks on wiki pages.
 */
export class LocalAdapter implements KbAdapter {
  async lintWiki(pages: WikiPage[]): Promise<LintResult> {
    const issues: LintIssue[] = [];
    const pageNames = new Set(pages.map((p) => p.name));

    // Build a map of which pages link to which
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    const linksFrom = new Map<string, Set<string>>();
    const allLinkedTargets = new Set<string>();

    for (const page of pages) {
      const targets = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = linkPattern.exec(page.content)) !== null) {
        targets.add(match[1]);
        allLinkedTargets.add(match[1]);
      }
      linksFrom.set(page.name, targets);
    }

    for (const page of pages) {
      // Orphan pages: not linked from any other page
      const isLinkedFromOther = pages.some(
        (other) => other.name !== page.name && linksFrom.get(other.name)?.has(page.name),
      );
      if (!isLinkedFromOther && pages.length > 1) {
        issues.push({
          type: "orphan",
          severity: "warning",
          page: page.name,
          message: `Page "${page.name}" is not linked from any other page`,
        });
      }

      // Missing topic pages: referenced but don't exist
      const targets = linksFrom.get(page.name) ?? new Set();
      for (const target of targets) {
        if (!pageNames.has(target)) {
          issues.push({
            type: "missing",
            severity: "error",
            page: page.name,
            message: `Page "${page.name}" links to "${target}" which does not exist`,
          });
        }
      }

      // Uncited claims: paragraphs without a `> Source:` provenance
      const paragraphs = page.content.split(/\n\n+/);
      const hasAnyCitation = page.content.includes("> Source:");
      if (!hasAnyCitation && page.content.trim().length > 0) {
        issues.push({
          type: "uncited",
          severity: "warning",
          page: page.name,
          message: `Page "${page.name}" has no source citations (missing "> Source:" lines)`,
        });
      }

      // Stale summaries: page has a summary section but it's very short relative to content
      const summaryMatch = page.content.match(/^#+\s*Summary\s*\n([\s\S]*?)(?=\n#|\n$|$)/im);
      if (summaryMatch) {
        const summaryLength = summaryMatch[1].trim().length;
        const contentLength = page.content.length;
        if (summaryLength > 0 && summaryLength < contentLength * 0.05 && contentLength > 500) {
          issues.push({
            type: "stale",
            severity: "warning",
            page: page.name,
            message: `Page "${page.name}" has a summary that may be stale (very short relative to content)`,
          });
        }
      }
    }

    // Contradictions: check for pages that define the same term differently
    const definitionPattern = /^#+\s*Definition\s*\n([\s\S]*?)(?=\n#|\n$|$)/im;
    const definitions = new Map<string, { page: string; text: string }[]>();
    for (const page of pages) {
      const defMatch = page.content.match(definitionPattern);
      if (defMatch) {
        const baseTopic = page.name.toLowerCase();
        if (!definitions.has(baseTopic)) {
          definitions.set(baseTopic, []);
        }
        definitions.get(baseTopic)!.push({ page: page.name, text: defMatch[1].trim() });
      }
    }
    for (const [topic, defs] of definitions) {
      if (defs.length > 1) {
        issues.push({
          type: "contradiction",
          severity: "error",
          page: defs.map((d) => d.page).join(", "),
          message: `Multiple pages define "${topic}": ${defs.map((d) => d.page).join(", ")}`,
        });
      }
    }

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }
}
