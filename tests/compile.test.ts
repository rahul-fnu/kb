import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CompileResult } from "../src/types.js";
import type { KbAdapter } from "../src/adapter/claude.js";
import {
  readRawFiles,
  writeWikiOutput,
  runCompile,
} from "../src/commands/compile-logic.js";

function createMockAdapter(overrides?: Partial<CompileResult>): KbAdapter {
  return {
    async compile(rawFiles) {
      return {
        success: true,
        outputPath: "wiki",
        topicCount: rawFiles.size,
        errors: [],
        ...overrides,
      };
    },
    async query() {
      return { answer: "mock", sources: [], confidence: 1 };
    },
    async lint() {
      return { valid: true, warnings: [], errors: [] };
    },
  };
}

describe("readRawFiles", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-compile-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads markdown files from directory", async () => {
    await writeFile(join(tmpDir, "a.md"), "alpha");
    await writeFile(join(tmpDir, "b.md"), "beta");
    await writeFile(join(tmpDir, "c.txt"), "ignored");

    const files = await readRawFiles(tmpDir);
    expect(files.size).toBe(2);
    expect(files.get("a.md")).toBe("alpha");
    expect(files.get("b.md")).toBe("beta");
  });

  it("returns empty map for nonexistent directory", async () => {
    const files = await readRawFiles(join(tmpDir, "nope"));
    expect(files.size).toBe(0);
  });
});

describe("writeWikiOutput", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-wiki-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes wiki files, INDEX.md, and LOG.md", async () => {
    const wikiDir = join(tmpDir, "wiki");
    const output = {
      files: new Map([
        ["transformers.md", "# Transformers\nContent here"],
        ["attention.md", "# Attention\nContent here"],
      ]),
      index: "# Index\n- [Transformers](transformers.md)\n- [Attention](attention.md)\n",
      logEntry: "## 2026-04-06 — Compiled 2 topics",
    };

    await writeWikiOutput(wikiDir, output);

    const transformers = await readFile(join(wikiDir, "transformers.md"), "utf-8");
    expect(transformers).toBe("# Transformers\nContent here");

    const attention = await readFile(join(wikiDir, "attention.md"), "utf-8");
    expect(attention).toBe("# Attention\nContent here");

    const index = await readFile(join(wikiDir, "INDEX.md"), "utf-8");
    expect(index).toContain("Transformers");
    expect(index).toContain("Attention");

    const log = await readFile(join(wikiDir, "LOG.md"), "utf-8");
    expect(log).toContain("Compiled 2 topics");
  });

  it("appends to existing LOG.md", async () => {
    const wikiDir = join(tmpDir, "wiki");
    await mkdir(wikiDir, { recursive: true });
    await writeFile(join(wikiDir, "LOG.md"), "## Previous entry\n");

    const output = {
      files: new Map<string, string>(),
      index: "# Index\n",
      logEntry: "## New entry",
    };

    await writeWikiOutput(wikiDir, output);

    const log = await readFile(join(wikiDir, "LOG.md"), "utf-8");
    expect(log).toContain("Previous entry");
    expect(log).toContain("New entry");
  });
});

describe("runCompile with mocked adapter", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-run-"));
    await mkdir(join(tmpDir, "raw"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns error when raw/ has no markdown files", async () => {
    const adapter = createMockAdapter();
    const result = await runCompile(tmpDir, adapter);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("No markdown files found in raw/");
  });

  it("compiles raw files and writes manifest", async () => {
    await writeFile(join(tmpDir, "raw", "topic.md"), "# Topic\nSome content");

    const adapter = createMockAdapter();
    const result = await runCompile(tmpDir, adapter);

    expect(result.success).toBe(true);
    expect(result.topicCount).toBe(1);

    // Manifest should exist
    const manifestRaw = await readFile(
      join(tmpDir, ".kb", "manifest.json"),
      "utf-8"
    );
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].filePath).toBe("topic.md");
  });

  it("propagates adapter errors", async () => {
    await writeFile(join(tmpDir, "raw", "topic.md"), "content");

    const adapter = createMockAdapter({
      success: false,
      errors: ["adapter failure"],
    });
    const result = await runCompile(tmpDir, adapter);
    expect(result.success).toBe(false);
    expect(result.errors).toContain("adapter failure");
  });
});
