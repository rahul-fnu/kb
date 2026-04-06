import { Command } from "commander";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join, basename } from "node:path";

const AGENTS_MD_CONTENT = `# AI Wiki Maintainer Instructions

You are maintaining a knowledge base wiki. Follow these guidelines:

## Core Responsibilities
- **Summarize** raw source material into clear, concise wiki articles
- **Connect topics** by identifying relationships between concepts
- **Cross-link** related wiki pages using markdown links
- **Cite raw sources** — every claim should trace back to a file in \`raw/\`

## Quality Standards
- **Flag contradictions** when sources disagree — note both perspectives
- **Note uncertainty** when information is incomplete or ambiguous
- Keep articles focused and well-structured with clear headings
- Use consistent formatting across all wiki pages
- Update the \`wiki/INDEX.md\` when adding or modifying pages
`;

interface FileToCreate {
  path: string;
  content: string;
  isDir: boolean;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export const initCommand = new Command("init")
  .description("Initialize a new kb knowledge base in the current directory")
  .action(async () => {
    const cwd = process.cwd();
    const repoName = basename(cwd);

    const defaultConfig = {
      preferredAdapter: "claude",
      repoName,
      queryOutputStyle: "concise",
    };

    const files: FileToCreate[] = [
      { path: "raw", content: "", isDir: true },
      { path: "wiki", content: "", isDir: true },
      { path: "outputs", content: "", isDir: true },
      { path: join(".kb"), content: "", isDir: true },
      {
        path: join(".kb", "config.json"),
        content: JSON.stringify(defaultConfig, null, 2) + "\n",
        isDir: false,
      },
      {
        path: join(".kb", "manifest.json"),
        content: JSON.stringify({ version: 1, entries: [], generatedAt: new Date().toISOString() }, null, 2) + "\n",
        isDir: false,
      },
      {
        path: join("wiki", "INDEX.md"),
        content: "# Knowledge Base Index\n",
        isDir: false,
      },
      {
        path: join("wiki", "LOG.md"),
        content: "# Compile Log\n",
        isDir: false,
      },
      {
        path: "AGENTS.md",
        content: AGENTS_MD_CONTENT,
        isDir: false,
      },
    ];

    const created: string[] = [];
    const skipped: string[] = [];

    for (const file of files) {
      const fullPath = join(cwd, file.path);
      if (await exists(fullPath)) {
        skipped.push(file.path);
        continue;
      }

      if (file.isDir) {
        await mkdir(fullPath, { recursive: true });
      } else {
        await writeFile(fullPath, file.content, "utf-8");
      }
      created.push(file.path);
    }

    if (created.length > 0) {
      console.log("Created:");
      for (const f of created) {
        console.log(`  ✓ ${f}`);
      }
    }

    if (skipped.length > 0) {
      console.log("Skipped (already exist):");
      for (const f of skipped) {
        console.log(`  - ${f}`);
      }
    }

    if (created.length === 0) {
      console.log("Everything already exists. Nothing to do.");
    }
  });
