import { Command } from "commander";

export const statusCommand = new Command("status")
  .description("Show the current status of the knowledge base")
  .action(() => {
    console.log("status: not implemented");
  });
