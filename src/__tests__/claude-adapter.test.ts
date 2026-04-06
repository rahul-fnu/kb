import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeAdapter } from "../adapter/claude.js";

// Mock execa at the module level
vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const mockExeca = vi.mocked(execa);

describe("ClaudeAdapter", () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
    vi.clearAllMocks();
  });

  describe("compileSources", () => {
    it("parses a valid JSON compile response", async () => {
      const response = {
        pages: [{ filename: "topic.md", content: "# Topic\nContent" }],
      };
      mockExeca.mockResolvedValue({
        stdout: JSON.stringify({ result: JSON.stringify(response) }),
      } as any);

      const result = await adapter.compileSources({
        sources: ["raw content"],
        existingWiki: [],
        agentsMd: "",
      });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].filename).toBe("topic.md");
      expect(result.errors).toHaveLength(0);
    });

    it("returns errors when response is not valid JSON", async () => {
      mockExeca.mockResolvedValue({
        stdout: "not json at all",
      } as any);

      const result = await adapter.compileSources({
        sources: ["source"],
        existingWiki: [],
        agentsMd: "",
      });

      expect(result.pages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to parse");
    });
  });

  describe("answerQuery", () => {
    it("returns the answer text from claude", async () => {
      mockExeca.mockResolvedValue({
        stdout: JSON.stringify({ result: "The answer is 42." }),
      } as any);

      const result = await adapter.answerQuery({
        question: "What is the answer?",
        wikiContent: ["wiki"],
      });

      expect(result.answer).toBe("The answer is 42.");
    });

    it("handles plain text response", async () => {
      mockExeca.mockResolvedValue({
        stdout: "Plain answer",
      } as any);

      const result = await adapter.answerQuery({
        question: "q",
        wikiContent: ["w"],
      });

      expect(result.answer).toBe("Plain answer");
    });
  });

  describe("lintWiki", () => {
    it("parses a valid JSON lint response", async () => {
      const response = {
        findings: [
          {
            file: "page.md",
            line: null,
            severity: "warning",
            message: "Missing citation",
          },
        ],
        summary: "1 warning found",
      };
      mockExeca.mockResolvedValue({
        stdout: JSON.stringify({ result: JSON.stringify(response) }),
      } as any);

      const result = await adapter.lintWiki({
        wikiContent: ["# Page\nSome content"],
      });

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].severity).toBe("warning");
      expect(result.summary).toBe("1 warning found");
    });

    it("handles unparseable lint response gracefully", async () => {
      mockExeca.mockResolvedValue({
        stdout: "not json",
      } as any);

      const result = await adapter.lintWiki({
        wikiContent: ["page"],
      });

      expect(result.findings).toHaveLength(0);
      expect(result.summary).toContain("Failed to parse");
    });
  });

  describe("error handling", () => {
    it("throws when claude CLI is not found", async () => {
      mockExeca.mockRejectedValue(new Error("ENOENT"));

      await expect(
        adapter.answerQuery({ question: "q", wikiContent: ["w"] }),
      ).rejects.toThrow("Claude CLI is not installed");
    });

    it("throws on general CLI failure", async () => {
      mockExeca.mockRejectedValue(new Error("exit code 1"));

      await expect(
        adapter.answerQuery({ question: "q", wikiContent: ["w"] }),
      ).rejects.toThrow("Claude CLI failed");
    });

    it("throws when CLI returns empty output", async () => {
      mockExeca.mockResolvedValue({ stdout: "" } as any);

      await expect(
        adapter.answerQuery({ question: "q", wikiContent: ["w"] }),
      ).rejects.toThrow("empty output");
    });
  });
});
