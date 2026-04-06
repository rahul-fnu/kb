import { Command } from "commander";

export const lintCommand = new Command("lint")
  .description("Lint the knowledge base for errors and warnings")
  .action(() => {
    console.log("lint: not implemented");
  });
