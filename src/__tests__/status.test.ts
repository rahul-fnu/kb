import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const cli = resolve(import.meta.dirname, "../../dist/cli.js");

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

describe("kb status command", () => {
  const testDir = join(import.meta.dirname, "../../.test-status");

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("shows empty status when no manifest exists", () => {
    const output = execSync(`node ${cli} status`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("No files ingested yet");
  });

  it("shows all compiled when hashes match", () => {
    mkdirSync(join(testDir, ".kb"), { recursive: true });
    mkdirSync(join(testDir, "raw"), { recursive: true });

    const content = "hello world";
    writeFileSync(join(testDir, "raw", "file1.txt"), content);

    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/file1.txt",
          hash: hash(content),
          lastCompiledHash: hash(content),
          lastModified: new Date().toISOString(),
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(join(testDir, ".kb", "manifest.json"), JSON.stringify(manifest));

    const output = execSync(`node ${cli} status`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("1 total files in raw/");
    expect(output).toContain("1 compiled (up to date)");
    expect(output).toContain("0 pending");
    expect(output).toContain("0 untracked");
  });

  it("detects pending files when hash differs", () => {
    mkdirSync(join(testDir, ".kb"), { recursive: true });
    mkdirSync(join(testDir, "raw"), { recursive: true });

    writeFileSync(join(testDir, "raw", "file1.txt"), "updated content");

    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/file1.txt",
          hash: hash("updated content"),
          lastCompiledHash: hash("old content"),
          lastModified: new Date().toISOString(),
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(join(testDir, ".kb", "manifest.json"), JSON.stringify(manifest));

    const output = execSync(`node ${cli} status`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("1 pending (new or changed)");
    expect(output).toContain("raw/file1.txt");
  });

  it("detects untracked files in raw/", () => {
    mkdirSync(join(testDir, ".kb"), { recursive: true });
    mkdirSync(join(testDir, "raw"), { recursive: true });

    writeFileSync(join(testDir, "raw", "tracked.txt"), "tracked");
    writeFileSync(join(testDir, "raw", "new-file.txt"), "untracked");

    const manifest = {
      version: 1,
      entries: [
        {
          filePath: "raw/tracked.txt",
          hash: hash("tracked"),
          lastCompiledHash: hash("tracked"),
          lastModified: new Date().toISOString(),
        },
      ],
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(join(testDir, ".kb", "manifest.json"), JSON.stringify(manifest));

    const output = execSync(`node ${cli} status`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("2 total files in raw/");
    expect(output).toContain("1 untracked");
    expect(output).toContain("raw/new-file.txt");
  });

  it("handles empty manifest", () => {
    mkdirSync(join(testDir, ".kb"), { recursive: true });

    const manifest = {
      version: 1,
      entries: [],
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(join(testDir, ".kb", "manifest.json"), JSON.stringify(manifest));

    const output = execSync(`node ${cli} status`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("No files ingested yet");
  });
});
