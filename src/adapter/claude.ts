import { execa } from "execa";
import {
  buildCompilePrompt,
  buildQueryPrompt,
  buildLintPrompt,
} from "./prompts.js";
import type {
  KBAdapter,
  CompileInput,
  CompileResult,
  QueryInput,
  QueryResult,
  LintInput,
  LintResult,
} from "./types.js";

/**
 * Run `claude -p` with the given prompt and return the parsed result text.
 *
 * Claude CLI returns JSON with a `result` field containing the text content.
 */
async function callClaude(prompt: string): Promise<string> {
  let result;
  try {
    result = await execa("claude", ["-p", prompt]);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : String(error);
    if (msg.includes("ENOENT") || msg.includes("not found")) {
      throw new Error(
        "Claude CLI is not installed or not in PATH. Install it with: npm install -g @anthropic-ai/claude-code",
      );
    }
    throw new Error(`Claude CLI failed: ${msg}`);
  }

  const raw = result.stdout.trim();
  if (!raw) {
    throw new Error("Claude CLI returned empty output");
  }

  // claude -p returns JSON with a `result` field
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.result === "string") {
      return parsed.result;
    }
  } catch {
    // If output is not JSON, treat the raw stdout as the result text.
    // This handles cases where claude -p returns plain text directly.
  }

  return raw;
}

export class ClaudeAdapter implements KBAdapter {
  async compileSources(input: CompileInput): Promise<CompileResult> {
    const prompt = buildCompilePrompt(
      input.sources,
      input.existingWiki,
      input.agentsMd,
    );
    const text = await callClaude(prompt);

    try {
      const data = JSON.parse(text);
      return {
        pages: Array.isArray(data.pages) ? data.pages : [],
        errors: [],
      };
    } catch {
      return {
        pages: [],
        errors: [`Failed to parse compile response as JSON: ${text.slice(0, 200)}`],
      };
    }
  }

  async answerQuery(input: QueryInput): Promise<QueryResult> {
    const prompt = buildQueryPrompt(input.question, input.wikiContent);
    const text = await callClaude(prompt);

    return {
      answer: text,
      sources: [],
    };
  }

  async lintWiki(input: LintInput): Promise<LintResult> {
    const prompt = buildLintPrompt(input.wikiContent);
    const text = await callClaude(prompt);

    try {
      const data = JSON.parse(text);
      return {
        findings: Array.isArray(data.findings) ? data.findings : [],
        summary: typeof data.summary === "string" ? data.summary : "",
      };
    } catch {
      return {
        findings: [],
        summary: `Failed to parse lint response as JSON: ${text.slice(0, 200)}`,
      };
    }
  }
}
