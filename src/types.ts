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

export interface LintResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

// ── Manifest types for tracking file hashes ──

export interface ManifestEntry {
  filePath: string;
  hash: string;
  lastModified: string;
}

export interface Manifest {
  version: number;
  entries: ManifestEntry[];
  generatedAt: string;
}
