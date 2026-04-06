import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const cli = resolve(import.meta.dirname, "../../dist/cli.js");

describe("kb lint command", () => {
  const testDir = join(import.meta.dirname, "../../.test-lint");

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("errors when no wiki/ directory exists", () => {
    try {
      execSync(`node ${cli} lint`, { encoding: "utf-8", cwd: testDir });
      expect.unreachable("should have thrown");
    } catch (err: any) {
      expect(err.stderr || err.stdout).toContain("No wiki/ directory found");
    }
  });

  it("reports no issues for empty wiki directory", () => {
    mkdirSync(join(testDir, "wiki"));
    const output = execSync(`node ${cli} lint`, { encoding: "utf-8", cwd: testDir });
    expect(output).toContain("No wiki pages found");
  });

  it("creates a report file in outputs/", () => {
    mkdirSync(join(testDir, "wiki"));
    writeFileSync(join(testDir, "wiki", "index.md"), "Hello\n\n> Source: test");
    const output = execSync(`node ${cli} lint`, { encoding: "utf-8", cwd: testDir });

    expect(output).toContain("Full report:");
    const outputsDir = join(testDir, "outputs");
    expect(existsSync(outputsDir)).toBe(true);
    const files = readdirSync(outputsDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/-lint\.md$/);
  });

  it("detects missing linked pages and reports errors", () => {
    mkdirSync(join(testDir, "wiki"));
    writeFileSync(
      join(testDir, "wiki", "index.md"),
      "See [[missing-page]]\n\n> Source: test",
    );

    try {
      execSync(`node ${cli} lint`, { encoding: "utf-8", cwd: testDir });
      expect.unreachable("should have exited with non-zero");
    } catch (err: any) {
      const output = err.stdout || "";
      expect(output).toContain("[missing]");
      expect(output).toContain("missing-page");
    }
  });

  it("lint report contains issue details", () => {
    mkdirSync(join(testDir, "wiki"));
    writeFileSync(join(testDir, "wiki", "page.md"), "No citations here");
    execSync(`node ${cli} lint`, { encoding: "utf-8", cwd: testDir });

    const outputsDir = join(testDir, "outputs");
    const files = readdirSync(outputsDir);
    const report = readFileSync(join(outputsDir, files[0]), "utf-8");
    expect(report).toContain("# Lint Report");
    expect(report).toContain("[uncited]");
  });
});
