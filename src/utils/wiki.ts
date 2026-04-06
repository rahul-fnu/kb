import fs from "node:fs/promises";
import path from "node:path";
import type { WikiPage } from "../types.js";

const WIKI_DIR = "wiki";
const RESERVED_FILES = new Set(["INDEX.md", "LOG.md"]);

export async function readExistingWiki(kbRoot: string): Promise<WikiPage[]> {
  const wikiDir = path.join(kbRoot, WIKI_DIR);
  try {
    await fs.access(wikiDir);
  } catch {
    return [];
  }

  const files = await fs.readdir(wikiDir);
  const pages: WikiPage[] = [];

  for (const file of files) {
    if (!file.endsWith(".md") || RESERVED_FILES.has(file)) continue;
    const content = await fs.readFile(path.join(wikiDir, file), "utf-8");
    const slug = file.replace(/\.md$/, "");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;
    pages.push({ slug, title, content });
  }

  return pages;
}

export async function writeWikiPages(
  kbRoot: string,
  pages: WikiPage[],
): Promise<void> {
  const wikiDir = path.join(kbRoot, WIKI_DIR);
  await fs.mkdir(wikiDir, { recursive: true });

  for (const page of pages) {
    const filePath = path.join(wikiDir, `${page.slug}.md`);
    await fs.writeFile(filePath, page.content + "\n");
  }
}

export async function regenerateIndex(kbRoot: string): Promise<void> {
  const wikiDir = path.join(kbRoot, WIKI_DIR);
  const files = await fs.readdir(wikiDir);

  const entries: string[] = [];
  for (const file of files.sort()) {
    if (!file.endsWith(".md") || RESERVED_FILES.has(file)) continue;
    const content = await fs.readFile(path.join(wikiDir, file), "utf-8");
    const slug = file.replace(/\.md$/, "");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;
    const lines = content.split("\n");
    const descLine = lines.find(
      (l) => l.trim() && !l.startsWith("#") && !l.startsWith(">"),
    );
    const description = descLine ? descLine.trim() : "";
    entries.push(`- [${title}](${slug}.md) — ${description}`);
  }

  const index = `# Wiki Index\n\n${entries.join("\n")}\n`;
  await fs.writeFile(path.join(wikiDir, "INDEX.md"), index);
}

export async function appendLog(
  kbRoot: string,
  filesProcessed: string[],
  pagesCreated: string[],
  pagesUpdated: string[],
): Promise<void> {
  const wikiDir = path.join(kbRoot, WIKI_DIR);
  const logPath = path.join(wikiDir, "LOG.md");

  let existing = "";
  try {
    existing = await fs.readFile(logPath, "utf-8");
  } catch {
    existing = "# Compile Log\n";
  }

  const timestamp = new Date().toISOString();
  const entry = [
    `\n## ${timestamp}`,
    "",
    `**Files processed:** ${filesProcessed.join(", ")}`,
    pagesCreated.length > 0
      ? `**Pages created:** ${pagesCreated.join(", ")}`
      : null,
    pagesUpdated.length > 0
      ? `**Pages updated:** ${pagesUpdated.join(", ")}`
      : null,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  await fs.writeFile(logPath, existing + entry);
}
