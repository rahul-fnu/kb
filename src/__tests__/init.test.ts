import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";

const cli = resolve(import.meta.dirname, "../../dist/cli.js");

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("kb init", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates all expected files and directories", async () => {
    const output = execSync(`node ${cli} init`, {
      encoding: "utf-8",
      cwd: tmpDir,
    });

    expect(output).toContain("Created:");
    expect(output).toContain("raw");
    expect(output).toContain("wiki");
    expect(output).toContain("outputs");
    expect(output).toContain(".kb");
    expect(output).toContain("AGENTS.md");

    // Verify directories exist
    expect(await exists(join(tmpDir, "raw"))).toBe(true);
    expect(await exists(join(tmpDir, "wiki"))).toBe(true);
    expect(await exists(join(tmpDir, "outputs"))).toBe(true);
    expect(await exists(join(tmpDir, ".kb"))).toBe(true);

    // Verify files exist and have correct content
    const config = JSON.parse(
      await readFile(join(tmpDir, ".kb", "config.json"), "utf-8")
    );
    expect(config.preferredAdapter).toBe("claude");
    expect(config.queryOutputStyle).toBe("concise");

    const manifest = await readFile(
      join(tmpDir, ".kb", "manifest.json"),
      "utf-8"
    );
    expect(manifest.trim()).toBe("{}");

    const index = await readFile(join(tmpDir, "wiki", "INDEX.md"), "utf-8");
    expect(index).toContain("# Knowledge Base Index");

    const log = await readFile(join(tmpDir, "wiki", "LOG.md"), "utf-8");
    expect(log).toContain("# Compile Log");

    const agents = await readFile(join(tmpDir, "AGENTS.md"), "utf-8");
    expect(agents).toContain("AI Wiki Maintainer");
  });

  it("is idempotent — does not overwrite existing files", async () => {
    // Run init twice
    execSync(`node ${cli} init`, { encoding: "utf-8", cwd: tmpDir });
    const output = execSync(`node ${cli} init`, {
      encoding: "utf-8",
      cwd: tmpDir,
    });

    expect(output).toContain("Everything already exists");
    expect(output).not.toContain("Created:");
  });

  it("skips existing files but creates missing ones", async () => {
    // First init to create everything
    execSync(`node ${cli} init`, { encoding: "utf-8", cwd: tmpDir });

    // Remove just one file
    await rm(join(tmpDir, "AGENTS.md"));

    const output = execSync(`node ${cli} init`, {
      encoding: "utf-8",
      cwd: tmpDir,
    });

    expect(output).toContain("Created:");
    expect(output).toContain("AGENTS.md");
    expect(output).toContain("Skipped");
  });
});
