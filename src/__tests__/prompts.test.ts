import { describe, it, expect } from "vitest";
import {
  buildCompilePrompt,
  buildQueryPrompt,
  buildLintPrompt,
} from "../adapter/prompts.js";

describe("buildCompilePrompt", () => {
  it("includes source content in the prompt", () => {
    const prompt = buildCompilePrompt(
      ["# Notes\nSome content"],
      [],
      "",
    );
    expect(prompt).toContain("SOURCE 1");
    expect(prompt).toContain("Some content");
  });

  it("includes existing wiki pages when provided", () => {
    const prompt = buildCompilePrompt(
      ["source"],
      ["# Existing\nOld content"],
      "",
    );
    expect(prompt).toContain("EXISTING WIKI PAGE 1");
    expect(prompt).toContain("Old content");
  });

  it("shows placeholder when no existing wiki pages", () => {
    const prompt = buildCompilePrompt(["source"], [], "");
    expect(prompt).toContain("no existing wiki pages");
  });

  it("includes AGENTS.md content when provided", () => {
    const prompt = buildCompilePrompt(
      ["source"],
      [],
      "Be concise and accurate.",
    );
    expect(prompt).toContain("AGENTS.md");
    expect(prompt).toContain("Be concise and accurate.");
  });

  it("requests JSON output format", () => {
    const prompt = buildCompilePrompt(["source"], [], "");
    expect(prompt).toContain('"pages"');
    expect(prompt).toContain('"filename"');
    expect(prompt).toContain('"content"');
  });
});

describe("buildQueryPrompt", () => {
  it("includes the question", () => {
    const prompt = buildQueryPrompt("What is X?", ["wiki page"]);
    expect(prompt).toContain("What is X?");
  });

  it("includes wiki content", () => {
    const prompt = buildQueryPrompt("question", [
      "# Topic\nDetails here",
    ]);
    expect(prompt).toContain("WIKI PAGE 1");
    expect(prompt).toContain("Details here");
  });

  it("instructs not to invent information", () => {
    const prompt = buildQueryPrompt("q", ["w"]);
    expect(prompt).toMatch(/not.*invent/i);
  });
});

describe("buildLintPrompt", () => {
  it("includes wiki content", () => {
    const prompt = buildLintPrompt(["# Page\nContent"]);
    expect(prompt).toContain("WIKI PAGE 1");
    expect(prompt).toContain("Content");
  });

  it("requests JSON output with findings", () => {
    const prompt = buildLintPrompt(["page"]);
    expect(prompt).toContain('"findings"');
    expect(prompt).toContain('"summary"');
  });

  it("checks for common lint issues", () => {
    const prompt = buildLintPrompt(["page"]);
    expect(prompt).toContain("cross-references");
    expect(prompt).toContain("Contradictions");
  });
});
