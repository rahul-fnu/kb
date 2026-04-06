import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readExistingWiki,
  writeWikiPages,
  regenerateIndex,
  appendLog,
} from "../src/utils/wiki.js";

describe("readExistingWiki", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-wiki-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads wiki pages and extracts slug/title", async () => {
    const wikiDir = join(tmpDir, "wiki");
    await mkdir(wikiDir, { recursive: true });
    await writeFile(join(wikiDir, "transformers.md"), "# Transformers\n\nContent here");
    await writeFile(join(wikiDir, "attention.md"), "# Attention Mechanism\n\nMore content");
    await writeFile(join(wikiDir, "INDEX.md"), "# Index");
    await writeFile(join(wikiDir, "LOG.md"), "# Log");

    const pages = await readExistingWiki(tmpDir);
    expect(pages).toHaveLength(2);

    const slugs = pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["attention", "transformers"]);

    const transformers = pages.find((p) => p.slug === "transformers")!;
    expect(transformers.title).toBe("Transformers");
  });

  it("returns empty for nonexistent wiki dir", async () => {
    const pages = await readExistingWiki(join(tmpDir, "nonexistent"));
    expect(pages).toEqual([]);
  });
});

describe("writeWikiPages", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-write-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes wiki page files", async () => {
    await writeWikiPages(tmpDir, [
      { slug: "topic-a", title: "Topic A", content: "# Topic A\n\nContent" },
      { slug: "topic-b", title: "Topic B", content: "# Topic B\n\nMore" },
    ]);

    const a = await readFile(join(tmpDir, "wiki", "topic-a.md"), "utf-8");
    expect(a).toContain("# Topic A");

    const b = await readFile(join(tmpDir, "wiki", "topic-b.md"), "utf-8");
    expect(b).toContain("# Topic B");
  });
});

describe("regenerateIndex", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-index-"));
    await mkdir(join(tmpDir, "wiki"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("generates INDEX.md listing all wiki pages", async () => {
    await writeFile(join(tmpDir, "wiki", "topic-a.md"), "# Topic A\n\nSummary of A");
    await writeFile(join(tmpDir, "wiki", "topic-b.md"), "# Topic B\n\nSummary of B");

    await regenerateIndex(tmpDir);

    const index = await readFile(join(tmpDir, "wiki", "INDEX.md"), "utf-8");
    expect(index).toContain("# Wiki Index");
    expect(index).toContain("[Topic A](topic-a.md)");
    expect(index).toContain("[Topic B](topic-b.md)");
  });
});

describe("appendLog", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-log-"));
    await mkdir(join(tmpDir, "wiki"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("appends to LOG.md", async () => {
    await writeFile(join(tmpDir, "wiki", "LOG.md"), "# Compile Log\n");

    await appendLog(tmpDir, ["raw/test.md"], ["topic-a"], []);

    const log = await readFile(join(tmpDir, "wiki", "LOG.md"), "utf-8");
    expect(log).toContain("# Compile Log");
    expect(log).toContain("raw/test.md");
    expect(log).toContain("topic-a");
  });

  it("creates LOG.md if it doesn't exist", async () => {
    await appendLog(tmpDir, ["raw/test.md"], [], ["topic-b"]);

    const log = await readFile(join(tmpDir, "wiki", "LOG.md"), "utf-8");
    expect(log).toContain("# Compile Log");
    expect(log).toContain("topic-b");
  });
});
