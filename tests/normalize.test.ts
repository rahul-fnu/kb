import { describe, it, expect } from "vitest";
import { normalizeFilename } from "../src/utils/normalize.js";

describe("normalizeFilename", () => {
  it("lowercases the filename", () => {
    expect(normalizeFilename("README.md")).toBe("readme.md");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeFilename("my file name.txt")).toBe("my-file-name.txt");
  });

  it("handles mixed case and spaces", () => {
    expect(normalizeFilename("My Project Notes.MD")).toBe(
      "my-project-notes.md"
    );
  });

  it("strips special characters", () => {
    expect(normalizeFilename("file@#$%name!.txt")).toBe("filename.txt");
  });

  it("collapses multiple hyphens", () => {
    expect(normalizeFilename("foo---bar.md")).toBe("foo-bar.md");
  });

  it("preserves dots and underscores in the base name", () => {
    expect(normalizeFilename("my_file.v2.txt")).toBe("my_file.v2.txt");
  });

  it("preserves the file extension", () => {
    expect(normalizeFilename("DOCUMENT.PDF")).toBe("document.pdf");
  });

  it("handles multiple spaces becoming a single hyphen", () => {
    expect(normalizeFilename("a   b.md")).toBe("a-b.md");
  });

  it("strips leading and trailing hyphens from the base", () => {
    expect(normalizeFilename("-foo-.md")).toBe("foo.md");
  });

  it("handles filenames with no extension", () => {
    expect(normalizeFilename("Makefile")).toBe("makefile");
  });

  it("handles complex mixed input", () => {
    expect(normalizeFilename("My (Cool) File [v2].md")).toBe(
      "my-cool-file-v2.md"
    );
  });
});
