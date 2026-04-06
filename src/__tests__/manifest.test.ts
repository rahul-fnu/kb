import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  readManifest,
  writeManifest,
  getChangedEntries,
  updateCompiledHashes,
} from "../utils/manifest.js";
import type { Manifest } from "../types.js";

describe("manifest utils", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-test-"));
    await fs.mkdir(path.join(tmpDir, ".kb"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const sampleManifest: Manifest = {
    version: 1,
    entries: [
      {
        filePath: "raw/notes.md",
        hash: "abc123",
        lastModified: "2026-01-01T00:00:00Z",
      },
      {
        filePath: "raw/ideas.md",
        hash: "def456",
        lastModified: "2026-01-02T00:00:00Z",
        lastCompiledHash: "def456",
      },
    ],
    generatedAt: "2026-01-01T00:00:00Z",
  };

  it("reads and writes manifest round-trip", async () => {
    await writeManifest(tmpDir, sampleManifest);
    const result = await readManifest(tmpDir);
    expect(result.version).toBe(1);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].filePath).toBe("raw/notes.md");
  });

  it("getChangedEntries returns entries without matching lastCompiledHash", () => {
    const changed = getChangedEntries(sampleManifest);
    expect(changed).toHaveLength(1);
    expect(changed[0].filePath).toBe("raw/notes.md");
  });

  it("getChangedEntries returns entries where hash differs from lastCompiledHash", () => {
    const manifest: Manifest = {
      ...sampleManifest,
      entries: [
        {
          filePath: "raw/notes.md",
          hash: "new-hash",
          lastModified: "2026-01-01T00:00:00Z",
          lastCompiledHash: "old-hash",
        },
      ],
    };
    const changed = getChangedEntries(manifest);
    expect(changed).toHaveLength(1);
  });

  it("getChangedEntries returns empty when all compiled", () => {
    const manifest: Manifest = {
      ...sampleManifest,
      entries: sampleManifest.entries.map((e) => ({
        ...e,
        lastCompiledHash: e.hash,
      })),
    };
    const changed = getChangedEntries(manifest);
    expect(changed).toHaveLength(0);
  });

  it("updateCompiledHashes sets lastCompiledHash for compiled files", () => {
    const updated = updateCompiledHashes(sampleManifest, ["raw/notes.md"]);
    const notesEntry = updated.entries.find(
      (e) => e.filePath === "raw/notes.md",
    );
    expect(notesEntry?.lastCompiledHash).toBe("abc123");
    // Uncompiled entry should be unchanged
    const ideasEntry = updated.entries.find(
      (e) => e.filePath === "raw/ideas.md",
    );
    expect(ideasEntry?.lastCompiledHash).toBe("def456");
  });

  it("readManifest throws when no manifest exists", async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-empty-"));
    await fs.mkdir(path.join(emptyDir, ".kb"), { recursive: true });
    await expect(readManifest(emptyDir)).rejects.toThrow();
    await fs.rm(emptyDir, { recursive: true, force: true });
  });
});
