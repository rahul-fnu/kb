import { Command } from "commander";

export const initCommand = new Command("init")
  .description("Initialize a new kb knowledge base in the current directory")
  .action(() => {
    console.log("init: not implemented");
  });
