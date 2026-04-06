import { Command } from "commander";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { ConfigSchema } from "../types.js";

interface Check {
  label: string;
  check: () => Promise<boolean>;
  hint: string;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isClaudeInstalled(): boolean {
  try {
    execSync("which claude", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function isConfigValid(cwd: string): Promise<boolean> {
  const configPath = join(cwd, ".kb", "config.json");
  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    ConfigSchema.parse(parsed);
    return true;
  } catch {
    return false;
  }
}

export const doctorCommand = new Command("doctor")
  .description("Check system dependencies and configuration")
  .action(async () => {
    const cwd = process.cwd();

    const checks: Check[] = [
      {
        label: "claude CLI installed",
        check: async () => isClaudeInstalled(),
        hint: "Install the Claude CLI: https://docs.anthropic.com/en/docs/claude-cli",
      },
      {
        label: "raw/ directory exists",
        check: async () => exists(join(cwd, "raw")),
        hint: "Run `kb init` to scaffold the repo",
      },
      {
        label: "wiki/ directory exists",
        check: async () => exists(join(cwd, "wiki")),
        hint: "Run `kb init` to scaffold the repo",
      },
      {
        label: ".kb/config.json is valid",
        check: async () => isConfigValid(cwd),
        hint: "Run `kb init` to scaffold the repo, or fix .kb/config.json manually",
      },
      {
        label: ".kb/manifest.json exists",
        check: async () => exists(join(cwd, ".kb", "manifest.json")),
        hint: "Run `kb init` to scaffold the repo",
      },
    ];

    console.log("kb doctor\n");

    let allPassed = true;

    for (const { label, check, hint } of checks) {
      const ok = await check();
      const icon = ok ? "✓" : "✗";
      console.log(`  ${icon} ${label}`);
      if (!ok) {
        console.log(`    → ${hint}`);
        allPassed = false;
      }
    }

    console.log();
    if (allPassed) {
      console.log("All checks passed!");
    } else {
      console.log("Some checks failed. See hints above.");
      process.exitCode = 1;
    }
  });
