import { Command } from "commander";

export const doctorCommand = new Command("doctor")
  .description("Check system dependencies and configuration")
  .action(() => {
    console.log("doctor: not implemented");
  });
