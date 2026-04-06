import { execa } from "execa";
import {
  buildCompilePrompt,
  buildQueryPrompt,
  buildLintPrompt,
} from "./prompts.js";
import type {
  KBAdapter,
  CompileInput,
  CompileOutput,
  QueryResult,
  WikiPage,
  LintResult,
} from "./types.js";

/**
 * Run `claude -p` with the given prompt and return the raw text result.
 */
async function callClaude(prompt: string): Promise<string> {
  let result;
  try {
    result = await execa("claude", ["-p", prompt], {
      timeout: 120_000,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("ENOENT") || msg.includes("not found")) {
      throw new Error(
        "Claude CLI is not installed or not in PATH. Run `kb doctor` to check.",
      );
    }
    throw new Error(`Claude CLI failed: ${msg}`);
  }

  const raw = result.stdout.trim();
  if (!raw) {
    throw new Error("Claude CLI returned empty output");
  }

  // claude -p may return JSON with a `result` field, or plain text
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.result === "string") {
      return parsed.result;
    }
  } catch {
    // Not JSON-wrapped — use raw stdout directly
  }

  return raw;
}

/**
 * Extract JSON from a response that may contain markdown code fences.
 */
function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return text.trim();
}

export class ClaudeAdapter implements KBAdapter {
  async compileSources(input: CompileInput): Promise<CompileOutput> {
    const prompt = buildCompilePrompt(
      input.newSources,
      input.existingWiki,
      input.agentInstructions,
    );
    const text = await callClaude(prompt);
    const jsonStr = extractJSON(text);

    try {
      const parsed = JSON.parse(jsonStr);
      const pages: WikiPage[] = (Array.isArray(parsed) ? parsed : []).map(
        (entry: Record<string, unknown>) => ({
          slug: String(entry.slug ?? ""),
          title: String(entry.title ?? ""),
          content: String(entry.content ?? ""),
        }),
      );
      return { pages };
    } catch {
      throw new Error(
        `Failed to parse compile response as JSON: ${text.slice(0, 200)}`,
      );
    }
  }

  async answerQuery(
    question: string,
    wikiContent: WikiPage[],
  ): Promise<QueryResult> {
    const prompt = buildQueryPrompt(question, wikiContent);
    const text = await callClaude(prompt);

    // Detect which wiki pages were likely referenced
    const sources = wikiContent
      .filter((page) => {
        return (
          text.toLowerCase().includes(page.slug.toLowerCase()) ||
          text.toLowerCase().includes(page.title.toLowerCase())
        );
      })
      .map((page) => `wiki/${page.slug}.md`);

    return {
      answer: text,
      sources: sources.length > 0 ? sources : wikiContent.map((p) => `wiki/${p.slug}.md`),
    };
  }

  async lintWiki(wikiContent: WikiPage[]): Promise<LintResult> {
    const prompt = buildLintPrompt(wikiContent);
    const text = await callClaude(prompt);
    const jsonStr = extractJSON(text);

    try {
      const data = JSON.parse(jsonStr);
      return {
        valid: !Array.isArray(data.issues) || data.issues.every(
          (i: Record<string, unknown>) => i.severity !== "error",
        ),
        issues: Array.isArray(data.issues) ? data.issues : [],
      };
    } catch {
      throw new Error(
        `Failed to parse lint response as JSON: ${text.slice(0, 200)}`,
      );
    }
  }
}
