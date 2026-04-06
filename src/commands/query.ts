import { Command } from "commander";

export const queryCommand = new Command("query")
  .description("Query the knowledge base")
  .argument("[question]", "Question to ask the knowledge base")
  .action((question?: string) => {
    console.log("query: not implemented");
  });
