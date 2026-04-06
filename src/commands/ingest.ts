import { Command } from "commander";

export const ingestCommand = new Command("ingest")
  .description("Ingest source files into the knowledge base")
  .action(() => {
    console.log("ingest: not implemented");
  });
