/**
 * Prompt construction for Claude CLI adapter operations.
 *
 * Each function builds a self-contained prompt string that instructs
 * Claude to act as a disciplined wiki maintainer.
 */

const SYSTEM_PREAMBLE = `You are a disciplined wiki maintainer for a local-first knowledge base.
Rules you MUST follow:
- Return only markdown content unless a specific JSON format is requested.
- Always cite raw source filenames when referencing information.
- Explicitly note uncertainty — never hallucinate facts.
- Keep content concise, accurate, and well-structured.`;

/**
 * Build a prompt for compiling raw sources into wiki pages.
 *
 * Instructs Claude to return a JSON array of { slug, title, content } objects
 * representing updated or new wiki pages.
 */
export function buildCompilePrompt(
  sources: { filePath: string; content: string }[],
  existingWiki: { slug: string; title: string; content: string }[],
  agentInstructions: string,
): string {
  const sourcesBlock = sources
    .map((s) => `--- SOURCE: ${s.filePath} ---\n${s.content}`)
    .join("\n\n");

  const wikiBlock =
    existingWiki.length > 0
      ? existingWiki
          .map((w) => `--- EXISTING WIKI PAGE: ${w.slug}.md ---\n# ${w.title}\n\n${w.content}`)
          .join("\n\n")
      : "(no existing wiki pages)";

  return `${SYSTEM_PREAMBLE}

${agentInstructions ? `Project guidelines (AGENTS.md):\n${agentInstructions}\n` : ""}
## Task: Compile Sources into Wiki Pages

You have raw source documents and (optionally) existing wiki pages.
Produce an updated set of wiki pages that incorporate the new source material.

### Raw Sources
${sourcesBlock}

### Existing Wiki Pages
${wikiBlock}

### Instructions
- Merge new information into existing pages where appropriate.
- Create new pages only when a topic does not fit an existing page.
- Each wiki page should start with a short summary paragraph.
- Use markdown headings for sections.
- Include \`> Source: raw/filename.md\` provenance lines for each source that contributed.
- Use markdown links to reference related wiki pages (e.g., [Related Topic](related-topic.md)).
- Note uncertainty with phrases like "Based on limited evidence..." when appropriate.
- Never delete existing wiki pages — only create or update.
- Return ONLY a JSON array in this exact format (no markdown fences, no extra text):
[{"slug":"topic-name","title":"Topic Name","content":"markdown content here"}]`;
}

/**
 * Build a prompt for answering a question against the wiki.
 */
export function buildQueryPrompt(
  question: string,
  wikiPages: { slug: string; title: string; content: string }[],
): string {
  const wikiBlock = wikiPages
    .map((w) => `--- ${w.slug}.md: ${w.title} ---\n${w.content}`)
    .join("\n\n");

  return `${SYSTEM_PREAMBLE}

## Task: Answer a Question

Answer the following question using ONLY the wiki content provided below.
If the wiki does not contain enough information, say so explicitly.

### Question
${question}

### Wiki Content
${wikiBlock}

### Instructions
- Answer in markdown format.
- Cite the wiki page(s) you drew from.
- If uncertain, state your confidence level.
- Do NOT invent information not present in the wiki.
- Return ONLY the markdown answer, no JSON wrapping.`;
}

/**
 * Build a prompt for linting wiki content.
 */
export function buildLintPrompt(
  wikiPages: { slug: string; title: string; content: string }[],
): string {
  const wikiBlock = wikiPages
    .map((w) => `--- ${w.slug}.md: ${w.title} ---\n${w.content}`)
    .join("\n\n");

  return `${SYSTEM_PREAMBLE}

## Task: Lint Wiki Content

Review the following wiki pages for quality issues.

### Wiki Pages
${wikiBlock}

### Check for these issues:
- Contradictions between pages
- Orphan pages (not cross-linked from other pages)
- Missing pages (referenced but don't exist)
- Stale summaries
- Uncited claims (no source provenance)
- Broken or missing cross-references

### Instructions
- Return ONLY a JSON object in this exact format (no markdown fences, no extra text):
{"issues":[{"type":"orphan","severity":"warning","page":"page-name","message":"description"}],"summary":"overall summary"}
- type must be one of: "contradiction", "orphan", "missing", "stale", "uncited"
- severity must be "warning" or "error".`;
}
