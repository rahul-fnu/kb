import { Command } from "commander";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LocalAdapter } from "../adapter/index.js";
import { readExistingWiki } from "../utils/wiki.js";

export const lintCommand = new Command("lint")
  .description("Lint the knowledge base for errors and warnings")
  .action(async () => {
    const kbRoot = process.cwd();

    // 1. Read all wiki pages
    const pages = await readExistingWiki(kbRoot);

    if (pages.length === 0) {
      console.error("No wiki pages found. Run `kb compile` first.");
      process.exitCode = 1;
      return;
    }

    // 2. Call adapter.lintWiki()
    const adapter = new LocalAdapter();
    const result = await adapter.lintWiki(pages);

    // 3. Build the report
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\.\d+Z$/, "");
    const reportFilename = `${timestamp}-lint.md`;

    let report = `# Lint Report\n\n`;
    report += `**Date:** ${now.toISOString()}\n`;
    report += `**Pages scanned:** ${pages.length}\n`;
    report += `**Issues found:** ${result.issues.length}\n`;
    report += `**Status:** ${result.valid ? "PASS" : "FAIL"}\n\n`;

    if (result.issues.length === 0) {
      report += "No issues found. The wiki looks good!\n";
    } else {
      report += "## Issues\n\n";
      for (const issue of result.issues) {
        const icon = issue.severity === "error" ? "x" : "!";
        report += `- [${icon}] **[${issue.type}]** ${issue.message}\n`;
      }
    }

    // 4. Save the report
    const outputsDir = join(kbRoot, "outputs");
    await mkdir(outputsDir, { recursive: true });
    const reportPath = join(outputsDir, reportFilename);
    await writeFile(reportPath, report, "utf-8");

    // 5. Print key findings
    const errors = result.issues.filter((i) => i.severity === "error");
    const warnings = result.issues.filter((i) => i.severity === "warning");

    console.log(
      `Lint: ${pages.length} pages scanned, ${result.issues.length} issues found`,
    );

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      for (const issue of errors.slice(0, 3)) {
        console.log(`  x [${issue.type}] ${issue.message}`);
      }
      if (errors.length > 3) {
        console.log(`  ... and ${errors.length - 3} more errors`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\nWarnings (${warnings.length}):`);
      for (const issue of warnings.slice(0, 2)) {
        console.log(`  ! [${issue.type}] ${issue.message}`);
      }
      if (warnings.length > 2) {
        console.log(`  ... and ${warnings.length - 2} more warnings`);
      }
    }

    console.log(`\nFull report: ${reportPath}`);

    if (!result.valid) {
      process.exitCode = 1;
    }
  });
