import { describe, it, expect } from "vitest";
import {
  normalizePath,
  toWikiKey,
  ensureExtension,
} from "../src/utils/normalize.js";

describe("normalizePath", () => {
  it("resolves a relative path against a base directory", () => {
    const result = normalizePath("docs/file.md", "/home/user/project");
    expect(result).toBe("docs/file.md");
  });

  it("normalizes .. segments", () => {
    const result = normalizePath("docs/../other/file.md", "/base");
    expect(result).toBe("other/file.md");
  });

  it("handles absolute paths by making them relative", () => {
    const result = normalizePath("/base/docs/file.md", "/base");
    expect(result).toBe("docs/file.md");
  });

  it("returns empty string for same directory", () => {
    const result = normalizePath("/base", "/base");
    expect(result).toBe("");
  });
});

describe("toWikiKey", () => {
  it("converts a filename to a lowercase key without extension", () => {
    expect(toWikiKey("MyFile.md")).toBe("myfile");
  });

  it("handles nested paths", () => {
    expect(toWikiKey("docs/SubDir/File.md")).toBe("docs/subdir/file");
  });

  it("strips leading ./", () => {
    expect(toWikiKey("./readme.md")).toBe("readme");
  });

  it("handles files with multiple dots", () => {
    expect(toWikiKey("my.config.file.md")).toBe("my.config.file");
  });
});

describe("ensureExtension", () => {
  it("adds extension when missing", () => {
    expect(ensureExtension("file", ".md")).toBe("file.md");
  });

  it("does not double-add extension", () => {
    expect(ensureExtension("file.md", ".md")).toBe("file.md");
  });
});
