import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const cli = resolve(import.meta.dirname, "../dist/cli.js");

function run(cmd: string, cwd: string): string {
  return execSync(`node ${cli} ${cmd}`, {
    encoding: "utf-8",
    cwd,
    timeout: 180_000,
  });
}

describe("kb end-to-end workflow", () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), "kb-e2e-"));

    // Create sample source files to ingest
    await writeFile(
      join(testDir, "git-basics.md"),
      `# Git Basics

Git is a distributed version control system created by Linus Torvalds in 2005.

## Key Concepts

- **Repository**: A directory tracked by git containing the full history.
- **Commit**: A snapshot of changes with a message.
- **Branch**: A pointer to a specific commit, enabling parallel work.
- **Merge**: Combining changes from different branches.

## Common Commands

- \`git init\` — initialize a new repository
- \`git add\` — stage changes
- \`git commit\` — save staged changes
- \`git push\` — upload commits to a remote
`,
    );

    await writeFile(
      join(testDir, "Git Branching Strategies.md"),
      `# Git Branching Strategies

Teams use branching strategies to organize parallel development.

## Popular Models

### Git Flow
Uses long-lived branches: main, develop, feature/*, release/*, hotfix/*.
Best for projects with scheduled releases.

### GitHub Flow
Simple: main branch + feature branches. Merge via pull request.
Best for continuous deployment.

### Trunk-Based Development
Everyone commits to main (trunk) frequently. Uses short-lived feature branches.
Requires strong CI/CD and automated testing.

## Choosing a Strategy

Consider team size, release cadence, and CI/CD maturity.
Small teams with continuous deployment benefit from GitHub Flow.
Larger teams with release trains may prefer Git Flow.
`,
    );
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("step 1: kb init — scaffolds repo structure", () => {
    const output = run("init", testDir);
    expect(output).toContain("raw");
    expect(output).toContain("wiki");
    expect(output).toContain("outputs");
    expect(output).toContain(".kb");
    expect(output).toContain("AGENTS.md");
  });

  it("step 2: kb doctor — all checks pass after init", () => {
    const output = run("doctor", testDir);
    expect(output).toContain("All checks passed");
  });

  it("step 3: kb ingest — ingests files with filename normalization", () => {
    const out1 = run(`ingest "${join(testDir, "git-basics.md")}"`, testDir);
    expect(out1).toContain("Ingested: git-basics.md");

    // This file has spaces and mixed case — should normalize
    const out2 = run(
      `ingest "${join(testDir, "Git Branching Strategies.md")}"`,
      testDir,
    );
    expect(out2).toContain("git-branching-strategies.md");
  });

  it("step 3b: kb ingest — skips duplicate files", () => {
    const output = run(
      `ingest "${join(testDir, "git-basics.md")}"`,
      testDir,
    );
    expect(output).toContain("already ingested");
  });

  it("step 4: kb status — shows pending files before compile", () => {
    const output = run("status", testDir);
    expect(output).toContain("2 total files in raw/");
    expect(output).toContain("2 pending");
    expect(output).toContain("0 compiled");
  });

  it("step 5: kb compile — generates wiki pages from raw sources", async () => {
    const output = run("compile", testDir);
    expect(output).toContain("Found 2 file(s) to compile");
    expect(output).toContain("Compile complete");

    // Wiki pages should exist
    const wikiFiles = await readdir(join(testDir, "wiki"));
    const mdFiles = wikiFiles.filter(
      (f) => f.endsWith(".md") && f !== "INDEX.md" && f !== "LOG.md",
    );
    expect(mdFiles.length).toBeGreaterThanOrEqual(1);

    // INDEX.md should list the generated pages
    const index = await readFile(join(testDir, "wiki", "INDEX.md"), "utf-8");
    expect(index).toContain("# Wiki Index");
    expect(index).toContain(".md)");

    // LOG.md should have a compile entry
    const log = await readFile(join(testDir, "wiki", "LOG.md"), "utf-8");
    expect(log).toContain("Files processed:");

    // Wiki pages should have source citations
    for (const f of mdFiles) {
      const content = await readFile(join(testDir, "wiki", f), "utf-8");
      expect(content).toContain("> Source:");
    }
  }, 180_000);

  it("step 5b: kb compile — incremental, nothing to compile", () => {
    const output = run("compile", testDir);
    expect(output).toContain("Nothing to compile");
  });

  it("step 6: kb status — all compiled after compile", () => {
    const output = run("status", testDir);
    expect(output).toContain("2 compiled (up to date)");
    expect(output).toContain("0 pending");
  });

  it("step 7: kb query — answers questions from wiki content", async () => {
    const output = run('query "What branching strategies are used in git?"', testDir);

    // Should print the output file path
    expect(output).toContain("outputs/");
    expect(output).toContain("-query.md");

    // Read the output file
    const outputsDir = join(testDir, "outputs");
    const files = await readdir(outputsDir);
    const queryFile = files.find((f) => f.endsWith("-query.md"));
    expect(queryFile).toBeDefined();

    const content = await readFile(join(outputsDir, queryFile!), "utf-8");
    expect(content).toContain("# Query:");
    expect(content).toContain("Generated by kb");
    expect(content).toContain("Sources consulted:");
    // Should mention at least one branching strategy
    expect(content.toLowerCase()).toMatch(/git\s*flow|github\s*flow|trunk/i);
  }, 180_000);

  it("step 8: kb lint — checks wiki quality", async () => {
    const output = run("lint", testDir);
    expect(output).toContain("pages scanned");
    expect(output).toContain("Full report:");

    // Report file should exist
    const outputsDir = join(testDir, "outputs");
    const files = await readdir(outputsDir);
    const lintFile = files.find((f) => f.endsWith("-lint.md"));
    expect(lintFile).toBeDefined();

    const report = await readFile(join(outputsDir, lintFile!), "utf-8");
    expect(report).toContain("# Lint Report");
    expect(report).toContain("Pages scanned:");
  });

  it("step 9: kb init — is idempotent", () => {
    const output = run("init", testDir);
    expect(output).toContain("already exists");
  });
});
