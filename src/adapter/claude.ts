import type { CompileResult, QueryResult, LintResult } from "../types.js";

/**
 * Adapter interface for AI backends.
 */
export interface KbAdapter {
  compile(rawFiles: Map<string, string>): Promise<CompileResult>;
  query(question: string, wikiDir: string): Promise<QueryResult>;
  lint(wikiDir: string): Promise<LintResult>;
}

/**
 * The compiled wiki output from the adapter.
 */
export interface CompiledWikiOutput {
  /** Map of output file path (relative) to content */
  files: Map<string, string>;
  /** Content for INDEX.md */
  index: string;
  /** Log entry to append to LOG.md */
  logEntry: string;
}
