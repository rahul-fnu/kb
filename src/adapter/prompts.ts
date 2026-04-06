/**
 * Prompt construction for Claude adapter operations.
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
 * Instructs Claude to return a JSON array of { filename, content } objects
 * representing updated or new wiki pages.
 */
export function buildCompilePrompt(
  sources: string[],
  existingWiki: string[],
  agentsMd: string,
): string {
  const sourcesBlock = sources
    .map((s, i) => `--- SOURCE ${i + 1} ---\n${s}`)
    .join("\n\n");

  const wikiBlock =
    existingWiki.length > 0
      ? existingWiki
          .map((w, i) => `--- EXISTING WIKI PAGE ${i + 1} ---\n${w}`)
          .join("\n\n")
      : "(no existing wiki pages)";

  return `${SYSTEM_PREAMBLE}

${agentsMd ? `Project guidelines (AGENTS.md):\n${agentsMd}\n` : ""}
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
- Cite source filenames (e.g. "Source: notes.md") in each section.
- Return ONLY a JSON object in this exact format (no markdown fences, no extra text):
{"pages":[{"filename":"topic.md","content":"markdown content here"}]}`;
}

/**
 * Build a prompt for answering a question against the wiki.
 *
 * Instructs Claude to return a markdown answer citing wiki sources.
 */
export function buildQueryPrompt(
  question: string,
  wikiContent: string[],
): string {
  const wikiBlock = wikiContent
    .map((w, i) => `--- WIKI PAGE ${i + 1} ---\n${w}`)
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
 *
 * Instructs Claude to return a JSON object with findings and a summary.
 */
export function buildLintPrompt(wikiContent: string[]): string {
  const wikiBlock = wikiContent
    .map((w, i) => `--- WIKI PAGE ${i + 1} ---\n${w}`)
    .join("\n\n");

  return `${SYSTEM_PREAMBLE}

## Task: Lint Wiki Content

Review the following wiki pages for quality issues.

### Wiki Pages
${wikiBlock}

### Check for these issues:
- Broken or missing cross-references between pages
- Unsupported or uncited claims
- Contradictions between pages
- Formatting inconsistencies (headings, lists, code blocks)
- Stale or ambiguous content

### Instructions
- Return ONLY a JSON object in this exact format (no markdown fences, no extra text):
{"findings":[{"file":"filename.md","line":null,"severity":"warning","message":"description"}],"summary":"overall summary"}
- severity must be "warning" or "error".
- line may be null if not applicable.`;
}
