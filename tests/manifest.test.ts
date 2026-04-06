import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  computeHash,
  createEmptyManifest,
  readManifest,
  writeManifest,
  buildEntry,
  detectChanges,
} from "../src/utils/manifest.js";

describe("computeHash", () => {
  it("returns a consistent sha256 hex string", () => {
    const hash = computeHash("hello world");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(computeHash("hello world")).toBe(hash);
  });

  it("returns different hashes for different content", () => {
    expect(computeHash("a")).not.toBe(computeHash("b"));
  });
});

describe("createEmptyManifest", () => {
  it("returns a manifest with version 1 and no entries", () => {
    const m = createEmptyManifest();
    expect(m.version).toBe(1);
    expect(m.entries).toEqual([]);
    expect(m.generatedAt).toBeTruthy();
  });
});

describe("readManifest / writeManifest", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "kb-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty manifest when file does not exist", async () => {
    const m = await readManifest(join(tmpDir, "nonexistent.json"));
    expect(m.version).toBe(1);
    expect(m.entries).toEqual([]);
  });

  it("round-trips a manifest through write and read", async () => {
    const manifest = createEmptyManifest();
    manifest.entries.push(buildEntry("file.md", "content"));

    const filePath = join(tmpDir, "manifest.json");
    await writeManifest(filePath, manifest);

    const loaded = await readManifest(filePath);
    expect(loaded.version).toBe(manifest.version);
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0].filePath).toBe("file.md");
    expect(loaded.entries[0].hash).toBe(computeHash("content"));
  });

  it("writes valid JSON to disk", async () => {
    const manifest = createEmptyManifest();
    const filePath = join(tmpDir, "manifest.json");
    await writeManifest(filePath, manifest);

    const raw = await readFile(filePath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("buildEntry", () => {
  it("builds an entry with correct hash", () => {
    const entry = buildEntry("test.md", "hello");
    expect(entry.filePath).toBe("test.md");
    expect(entry.hash).toBe(computeHash("hello"));
    expect(entry.lastModified).toBeTruthy();
  });
});

describe("detectChanges", () => {
  it("detects added files", () => {
    const oldM = createEmptyManifest();
    const newM = createEmptyManifest();
    newM.entries.push(buildEntry("new.md", "content"));

    const changes = detectChanges(oldM, newM);
    expect(changes.added).toEqual(["new.md"]);
    expect(changes.modified).toEqual([]);
    expect(changes.removed).toEqual([]);
  });

  it("detects modified files", () => {
    const oldM = createEmptyManifest();
    oldM.entries.push(buildEntry("file.md", "old content"));

    const newM = createEmptyManifest();
    newM.entries.push(buildEntry("file.md", "new content"));

    const changes = detectChanges(oldM, newM);
    expect(changes.added).toEqual([]);
    expect(changes.modified).toEqual(["file.md"]);
    expect(changes.removed).toEqual([]);
  });

  it("detects removed files", () => {
    const oldM = createEmptyManifest();
    oldM.entries.push(buildEntry("gone.md", "content"));

    const newM = createEmptyManifest();

    const changes = detectChanges(oldM, newM);
    expect(changes.added).toEqual([]);
    expect(changes.modified).toEqual([]);
    expect(changes.removed).toEqual(["gone.md"]);
  });

  it("detects unchanged files as neither added, modified, nor removed", () => {
    const content = "same content";
    const oldM = createEmptyManifest();
    oldM.entries.push(buildEntry("same.md", content));

    const newM = createEmptyManifest();
    newM.entries.push(buildEntry("same.md", content));

    const changes = detectChanges(oldM, newM);
    expect(changes.added).toEqual([]);
    expect(changes.modified).toEqual([]);
    expect(changes.removed).toEqual([]);
  });
});
