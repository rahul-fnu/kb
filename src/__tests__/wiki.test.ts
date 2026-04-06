import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  readExistingWiki,
  writeWikiPages,
  regenerateIndex,
  appendLog,
} from "../utils/wiki.js";
import type { WikiPage } from "../types.js";

describe("wiki utils", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-wiki-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("readExistingWiki returns empty array when no wiki dir", async () => {
    const pages = await readExistingWiki(tmpDir);
    expect(pages).toEqual([]);
  });

  it("readExistingWiki reads wiki pages excluding INDEX.md and LOG.md", async () => {
    const wikiDir = path.join(tmpDir, "wiki");
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.writeFile(
      path.join(wikiDir, "topic-one.md"),
      "# Topic One\n\nSome content.",
    );
    await fs.writeFile(
      path.join(wikiDir, "topic-two.md"),
      "# Topic Two\n\nMore content.",
    );
    await fs.writeFile(path.join(wikiDir, "INDEX.md"), "# Index");
    await fs.writeFile(path.join(wikiDir, "LOG.md"), "# Log");

    const pages = await readExistingWiki(tmpDir);
    expect(pages).toHaveLength(2);
    const slugs = pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["topic-one", "topic-two"]);
    expect(pages.find((p) => p.slug === "topic-one")?.title).toBe("Topic One");
  });

  it("writeWikiPages creates wiki files", async () => {
    const pages: WikiPage[] = [
      { slug: "my-topic", title: "My Topic", content: "# My Topic\n\nHello." },
    ];
    await writeWikiPages(tmpDir, pages);
    const content = await fs.readFile(
      path.join(tmpDir, "wiki", "my-topic.md"),
      "utf-8",
    );
    expect(content).toContain("# My Topic");
    expect(content).toContain("Hello.");
  });

  it("regenerateIndex creates INDEX.md with page links", async () => {
    const wikiDir = path.join(tmpDir, "wiki");
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.writeFile(
      path.join(wikiDir, "alpha.md"),
      "# Alpha\n\nAlpha description here.",
    );
    await fs.writeFile(
      path.join(wikiDir, "beta.md"),
      "# Beta\n\nBeta description here.",
    );

    await regenerateIndex(tmpDir);

    const index = await fs.readFile(path.join(wikiDir, "INDEX.md"), "utf-8");
    expect(index).toContain("# Wiki Index");
    expect(index).toContain("[Alpha](alpha.md)");
    expect(index).toContain("[Beta](beta.md)");
    expect(index).toContain("Alpha description here.");
  });

  it("appendLog creates LOG.md on first call", async () => {
    const wikiDir = path.join(tmpDir, "wiki");
    await fs.mkdir(wikiDir, { recursive: true });

    await appendLog(tmpDir, ["raw/notes.md"], ["topic-one"], []);

    const log = await fs.readFile(path.join(wikiDir, "LOG.md"), "utf-8");
    expect(log).toContain("# Compile Log");
    expect(log).toContain("raw/notes.md");
    expect(log).toContain("topic-one");
  });

  it("appendLog appends to existing LOG.md", async () => {
    const wikiDir = path.join(tmpDir, "wiki");
    await fs.mkdir(wikiDir, { recursive: true });
    await fs.writeFile(path.join(wikiDir, "LOG.md"), "# Compile Log\n");

    await appendLog(tmpDir, ["raw/a.md"], [], ["existing-page"]);

    const log = await fs.readFile(path.join(wikiDir, "LOG.md"), "utf-8");
    expect(log).toContain("# Compile Log");
    expect(log).toContain("raw/a.md");
    expect(log).toContain("existing-page");
  });
});
