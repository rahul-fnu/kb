import { describe, it, expect } from "vitest";
import { LocalAdapter } from "../adapter/index.js";
import type { WikiPage } from "../types.js";

describe("LocalAdapter.lintWiki", () => {
  const adapter = new LocalAdapter();

  it("returns valid with no issues for a well-formed wiki", async () => {
    const pages: WikiPage[] = [
      {
        slug: "index",
        title: "Index",
        content: "Welcome to the wiki.\n\n[[topic-a]]\n\n> Source: docs",
      },
      {
        slug: "topic-a",
        title: "Topic A",
        content: "Topic A content.\n\n[[index]]\n\n> Source: docs",
      },
    ];
    const result = await adapter.lintWiki(pages);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("detects orphan pages", async () => {
    const pages: WikiPage[] = [
      { slug: "index", title: "Index", content: "Main page\n\n> Source: docs" },
      { slug: "orphan", title: "Orphan", content: "Nobody links here\n\n> Source: docs" },
    ];
    const result = await adapter.lintWiki(pages);
    const orphans = result.issues.filter((i) => i.type === "orphan");
    // Both pages are orphans since neither links to the other
    expect(orphans.length).toBe(2);
    expect(orphans.some((i) => i.page === "orphan")).toBe(true);
  });

  it("detects missing linked pages", async () => {
    const pages: WikiPage[] = [
      { slug: "index", title: "Index", content: "See [[nonexistent]]\n\n> Source: docs" },
    ];
    const result = await adapter.lintWiki(pages);
    const missing = result.issues.filter((i) => i.type === "missing");
    expect(missing.length).toBe(1);
    expect(missing[0].message).toContain("nonexistent");
    expect(result.valid).toBe(false);
  });

  it("detects uncited pages", async () => {
    const pages: WikiPage[] = [
      { slug: "nocite", title: "No Cite", content: "Some content without any citations" },
    ];
    const result = await adapter.lintWiki(pages);
    const uncited = result.issues.filter((i) => i.type === "uncited");
    expect(uncited.length).toBe(1);
    expect(uncited[0].page).toBe("nocite");
  });

  it("does not flag pages with citations as uncited", async () => {
    const pages: WikiPage[] = [
      { slug: "cited", title: "Cited", content: "Some content\n\n> Source: my-doc.pdf" },
    ];
    const result = await adapter.lintWiki(pages);
    const uncited = result.issues.filter((i) => i.type === "uncited");
    expect(uncited.length).toBe(0);
  });

  it("detects contradictions (multiple definitions)", async () => {
    const pages: WikiPage[] = [
      {
        slug: "concept",
        title: "Concept",
        content: "# Definition\nA is B\n\n> Source: doc1",
      },
      {
        slug: "concept",
        title: "Concept Alt",
        content: "# Definition\nA is C\n\n> Source: doc2",
      },
    ];
    const result = await adapter.lintWiki(pages);
    const contradictions = result.issues.filter((i) => i.type === "contradiction");
    expect(contradictions.length).toBe(1);
    expect(result.valid).toBe(false);
  });

  it("returns empty issues for empty wiki", async () => {
    const result = await adapter.lintWiki([]);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
