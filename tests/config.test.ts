import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../src/types.js";

describe("ConfigSchema", () => {
  it("parses valid config with all fields", () => {
    const input = {
      preferredAdapter: "openai",
      repoName: "test-repo",
      defaultTopic: "general",
      queryOutputStyle: "detailed" as const,
    };
    const result = ConfigSchema.parse(input);
    expect(result).toEqual(input);
  });

  it("applies default values", () => {
    const result = ConfigSchema.parse({ repoName: "my-repo" });
    expect(result.preferredAdapter).toBe("claude");
    expect(result.queryOutputStyle).toBe("concise");
    expect(result.defaultTopic).toBeUndefined();
  });

  it("rejects missing required field repoName", () => {
    expect(() => ConfigSchema.parse({})).toThrow();
  });

  it("rejects invalid queryOutputStyle enum value", () => {
    expect(() =>
      ConfigSchema.parse({ repoName: "r", queryOutputStyle: "verbose" })
    ).toThrow();
  });

  it("accepts all valid queryOutputStyle values", () => {
    for (const style of ["concise", "detailed", "json"] as const) {
      const result = ConfigSchema.parse({ repoName: "r", queryOutputStyle: style });
      expect(result.queryOutputStyle).toBe(style);
    }
  });

  it("rejects non-string preferredAdapter", () => {
    expect(() =>
      ConfigSchema.parse({ repoName: "r", preferredAdapter: 123 })
    ).toThrow();
  });

  it("allows empty string for repoName", () => {
    const result = ConfigSchema.parse({ repoName: "" });
    expect(result.repoName).toBe("");
  });
});
