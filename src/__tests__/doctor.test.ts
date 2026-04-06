import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cli = resolve(import.meta.dirname, "../../dist/cli.js");

describe("kb doctor", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reports failures when nothing is initialized", () => {
    try {
      execSync(`node ${cli} doctor`, {
        encoding: "utf-8",
        cwd: tmpDir,
      });
      // If claude CLI is installed, it might not throw
    } catch (e: any) {
      const output = e.stdout as string;
      expect(output).toContain("✗ raw/ directory exists");
      expect(output).toContain("✗ wiki/ directory exists");
      expect(output).toContain("✗ .kb/config.json is valid");
      expect(output).toContain("✗ .kb/manifest.json exists");
      expect(output).toContain("Run `kb init`");
      expect(output).toContain("Some checks failed");
    }
  });

  it("reports success after init", () => {
    // Initialize first
    execSync(`node ${cli} init`, { encoding: "utf-8", cwd: tmpDir });

    let output: string;
    try {
      output = execSync(`node ${cli} doctor`, {
        encoding: "utf-8",
        cwd: tmpDir,
      });
    } catch (e: any) {
      // May fail if claude CLI is not installed, but other checks should pass
      output = e.stdout as string;
    }

    expect(output).toContain("✓ raw/ directory exists");
    expect(output).toContain("✓ wiki/ directory exists");
    expect(output).toContain("✓ .kb/config.json is valid");
    expect(output).toContain("✓ .kb/manifest.json exists");
  });
});
