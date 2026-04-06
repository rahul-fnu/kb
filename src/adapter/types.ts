/** Input for compiling raw sources into wiki pages. */
export interface CompileInput {
  sources: string[];
  existingWiki: string[];
  agentsMd: string;
}

/** A single wiki page produced by compilation. */
export interface WikiPage {
  filename: string;
  content: string;
}

/** Result of a compile operation. */
export interface CompileResult {
  pages: WikiPage[];
  errors: string[];
}

/** Input for answering a question against the wiki. */
export interface QueryInput {
  question: string;
  wikiContent: string[];
}

/** Result of a query operation. */
export interface QueryResult {
  answer: string;
  sources: string[];
}

/** Input for linting wiki content. */
export interface LintInput {
  wikiContent: string[];
}

/** A single lint finding. */
export interface LintFinding {
  file: string;
  line: number | null;
  severity: "warning" | "error";
  message: string;
}

/** Result of a lint operation. */
export interface LintResult {
  findings: LintFinding[];
  summary: string;
}

/** Adapter interface for all AI operations. */
export interface KBAdapter {
  compileSources(input: CompileInput): Promise<CompileResult>;
  answerQuery(input: QueryInput): Promise<QueryResult>;
  lintWiki(input: LintInput): Promise<LintResult>;
}
