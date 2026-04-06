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

// ── Adapter result interfaces ──

export interface CompileResult {
  success: boolean;
  outputPath: string;
  topicCount: number;
  errors: string[];
}

export interface QueryResult {
  answer: string;
  sources: string[];
  confidence: number;
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

// ── Manifest types for tracking file hashes ──

export interface ManifestEntry {
  filePath: string;
  hash: string;
  lastCompiledHash: string;
  lastModified: string;
}

export interface Manifest {
  version: number;
  entries: ManifestEntry[];
  generatedAt: string;
}

// ── Wiki types ──

export interface WikiPage {
  name: string;
  content: string;
}

// ── Adapter interface ──

export interface KbAdapter {
  lintWiki(pages: WikiPage[]): Promise<LintResult>;
}
