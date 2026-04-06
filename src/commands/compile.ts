import { Command } from "commander";

export const compileCommand = new Command("compile")
  .description("Compile the knowledge base into optimized output")
  .action(() => {
    console.log("compile: not implemented");
  });
