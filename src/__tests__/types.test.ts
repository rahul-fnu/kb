import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../types.js";

describe("ConfigSchema", () => {
  it("parses a valid config with defaults", () => {
    const result = ConfigSchema.parse({ repoName: "my-repo" });
    expect(result.repoName).toBe("my-repo");
    expect(result.preferredAdapter).toBe("claude");
    expect(result.queryOutputStyle).toBe("concise");
  });

  it("accepts all fields", () => {
    const input = {
      preferredAdapter: "openai",
      repoName: "test-repo",
      defaultTopic: "general",
      queryOutputStyle: "detailed" as const,
    };
    const result = ConfigSchema.parse(input);
    expect(result).toEqual(input);
  });

  it("rejects missing repoName", () => {
    expect(() => ConfigSchema.parse({})).toThrow();
  });

  it("rejects invalid queryOutputStyle", () => {
    expect(() =>
      ConfigSchema.parse({ repoName: "r", queryOutputStyle: "invalid" })
    ).toThrow();
  });
});
