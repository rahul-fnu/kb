import Anthropic from "@anthropic-ai/sdk";
import type { Adapter } from "./index.js";
import type { CompileInput, CompileOutput, WikiPage } from "../types.js";

export class ClaudeAdapter implements Adapter {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async compileSources(input: CompileInput): Promise<CompileOutput> {
    const existingWikiSection = input.existingWiki.length > 0
      ? `## Existing Wiki Pages\n\n${input.existingWiki
          .map((p) => `### ${p.title} (${p.slug}.md)\n\n${p.content}`)
          .join("\n\n---\n\n")}`
      : "## Existing Wiki Pages\n\nNo existing wiki pages yet.";

    const sourcesSection = input.newSources
      .map((s) => `### ${s.filePath}\n\n${s.content}`)
      .join("\n\n---\n\n");

    const prompt = `You are a wiki maintainer for a knowledge base. Your job is to process new source material and produce wiki pages.

${input.agentInstructions}

${existingWikiSection}

## New/Changed Source Files

${sourcesSection}

## Instructions

Analyze the new/changed source files above and produce wiki pages. For each topic you identify:

1. If an existing wiki page covers this topic, UPDATE it with the new information (do not lose existing content).
2. If no existing page covers a topic, CREATE a new one.
3. Never delete existing wiki pages — only create or update.

Each wiki page should:
- Start with a short summary paragraph
- Use markdown headings for sections
- Include \`> Source: raw/filename.md\` provenance lines for each source that contributed
- Use markdown links to reference related wiki pages (e.g., [Related Topic](related-topic.md))
- Note uncertainty with phrases like "Based on limited evidence..." when appropriate

Return your response as a JSON array of wiki pages. Each entry should have:
- "slug": kebab-case filename without extension (e.g., "project-setup")
- "title": human-readable title
- "content": full markdown content of the page

Return ONLY the JSON array, no other text. Example:
[
  {
    "slug": "example-topic",
    "title": "Example Topic",
    "content": "Summary paragraph...\\n\\n## Section\\n\\nDetails..."
  }
]`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const pages = this.parsePages(text);
    return { pages };
  }

  private parsePages(text: string): WikiPage[] {
    // Extract JSON from response (may be wrapped in markdown code fences)
    let jsonStr = text.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error("Adapter response is not a JSON array");
    }

    return parsed.map((entry: Record<string, unknown>) => ({
      slug: String(entry.slug),
      title: String(entry.title),
      content: String(entry.content),
    }));
  }
}
