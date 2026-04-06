import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Mock the ClaudeAdapter before importing compile
vi.mock("../adapter/index.js", () => ({
  ClaudeAdapter: vi.fn().mockImplementation(() => ({
    compileSources: vi.fn().mockResolvedValue({
      pages: [
        {
          slug: "test-topic",
          title: "Test Topic",
          content:
            "# Test Topic\n\nA summary.\n\n> Source: raw/notes.md\n\n## Details\n\nSome details.",
        },
      ],
    }),
  })),
}));

describe("compile command", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-compile-test-"));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Set up .kb directory with manifest
    await fs.mkdir(path.join(tmpDir, ".kb"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "raw"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, "wiki"), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("prints nothing to compile when all files are up to date", async () => {
    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/notes.md",
          hash: "abc123",
          lastModified: "2026-01-01T00:00:00Z",
          lastCompiledHash: "abc123",
        },
      ],
      generatedAt: "2026-01-01T00:00:00Z",
    };
    await fs.writeFile(
      path.join(tmpDir, ".kb/manifest.json"),
      JSON.stringify(manifest),
    );

    const spy = vi.spyOn(console, "log");
    const { compileCommand } = await import("../commands/compile.js");
    await compileCommand.parseAsync([], { from: "user" });
    expect(spy).toHaveBeenCalledWith("Nothing to compile.");
    spy.mockRestore();
  });

  it("compiles changed files and writes wiki pages", async () => {
    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/notes.md",
          hash: "abc123",
          lastModified: "2026-01-01T00:00:00Z",
        },
      ],
      generatedAt: "2026-01-01T00:00:00Z",
    };
    await fs.writeFile(
      path.join(tmpDir, ".kb/manifest.json"),
      JSON.stringify(manifest),
    );
    await fs.writeFile(
      path.join(tmpDir, "raw/notes.md"),
      "# My Notes\n\nSome content.",
    );

    const { compileCommand } = await import("../commands/compile.js");
    await compileCommand.parseAsync([], { from: "user" });

    // Check wiki page was written
    const wikiPage = await fs.readFile(
      path.join(tmpDir, "wiki/test-topic.md"),
      "utf-8",
    );
    expect(wikiPage).toContain("# Test Topic");
    expect(wikiPage).toContain("> Source: raw/notes.md");

    // Check INDEX.md was generated
    const index = await fs.readFile(
      path.join(tmpDir, "wiki/INDEX.md"),
      "utf-8",
    );
    expect(index).toContain("[Test Topic](test-topic.md)");

    // Check LOG.md was created
    const log = await fs.readFile(path.join(tmpDir, "wiki/LOG.md"), "utf-8");
    expect(log).toContain("raw/notes.md");
    expect(log).toContain("test-topic");

    // Check manifest was updated with lastCompiledHash
    const updatedManifest = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, ".kb/manifest.json"),
        "utf-8",
      ),
    );
    expect(updatedManifest.entries[0].lastCompiledHash).toBe("abc123");
  });

  it("reports error when no manifest exists", async () => {
    const spy = vi.spyOn(console, "error");
    const { compileCommand } = await import("../commands/compile.js");
    // Remove .kb/manifest.json to trigger error
    await fs.rm(path.join(tmpDir, ".kb"), { recursive: true });
    await compileCommand.parseAsync([], { from: "user" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("No manifest found"),
    );
    spy.mockRestore();
  });

  it("distinguishes created vs updated pages", async () => {
    // Set up existing wiki page
    await fs.writeFile(
      path.join(tmpDir, "wiki/test-topic.md"),
      "# Test Topic\n\nOld content.",
    );

    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/notes.md",
          hash: "abc123",
          lastModified: "2026-01-01T00:00:00Z",
        },
      ],
      generatedAt: "2026-01-01T00:00:00Z",
    };
    await fs.writeFile(
      path.join(tmpDir, ".kb/manifest.json"),
      JSON.stringify(manifest),
    );
    await fs.writeFile(path.join(tmpDir, "raw/notes.md"), "# Notes\n\nNew.");

    const spy = vi.spyOn(console, "log");
    const { compileCommand } = await import("../commands/compile.js");
    await compileCommand.parseAsync([], { from: "user" });

    // Should report as "Updated" not "Created"
    const updateCall = spy.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("Updated"),
    );
    expect(updateCall).toBeDefined();
    spy.mockRestore();
  });
});
