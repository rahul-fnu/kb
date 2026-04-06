import { z } from "zod";

// ── Config schema for .kb/config.json ──

export const ConfigSchema = z.object({
  preferredAdapter: z.string().default("claude"),
  repoName: z.string(),
  defaultTopic: z.string().optional(),
  queryOutputStyle: z
    .enum(["concise", "detailed", "json"])
    .default("concise"),
});

export type Config = z.infer<typeof ConfigSchema>;

// ── Wiki types ──

export interface WikiPage {
  slug: string;
  title: string;
  content: string;
}

// ── Adapter input/output types ──

export interface CompileInput {
  newSources: { filePath: string; content: string }[];
  existingWiki: WikiPage[];
  agentInstructions: string;
}

export interface CompileOutput {
  pages: WikiPage[];
}

export interface QueryResult {
  answer: string;
  sources: string[];
}

export interface LintIssue {
  type: "contradiction" | "orphan" | "missing" | "stale" | "uncited";
  severity: "error" | "warning";
  page: string;
  message: string;
}

export interface LintResult {
  valid: boolean;
  issues: LintIssue[];
}

// ── Adapter interface ──

export interface KBAdapter {
  compileSources(input: CompileInput): Promise<CompileOutput>;
  answerQuery(question: string, wikiContent: WikiPage[]): Promise<QueryResult>;
  lintWiki(wikiContent: WikiPage[]): Promise<LintResult>;
}

// ── Manifest types for tracking file hashes ──

export interface ManifestEntry {
  filePath: string;
  hash: string;
  lastCompiledHash?: string;
  lastModified: string;
}

export interface Manifest {
  version: number;
  entries: ManifestEntry[];
  generatedAt: string;
}
