import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const cli = resolve(import.meta.dirname, "../../dist/cli.js");

describe("CLI", () => {
  it("shows help output", () => {
    const output = execSync(`node ${cli} --help`, { encoding: "utf-8" });
    expect(output).toContain("kb");
    expect(output).toContain("knowledge base");
  });

  it("shows version", () => {
    const output = execSync(`node ${cli} --version`, { encoding: "utf-8" });
    expect(output.trim()).toBe("0.1.0");
  });

  it("lists all subcommands in help", () => {
    const output = execSync(`node ${cli} --help`, { encoding: "utf-8" });
    for (const cmd of ["init", "ingest", "compile", "query", "lint", "doctor", "status"]) {
      expect(output).toContain(cmd);
    }
  });

  it("runs a stub command", () => {
    const output = execSync(`node ${cli} init`, { encoding: "utf-8" });
    expect(output.trim()).toBe("init: not implemented");
  });
});
