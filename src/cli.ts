#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { ingestCommand } from "./commands/ingest.js";
import { compileCommand } from "./commands/compile.js";
import { queryCommand } from "./commands/query.js";
import { lintCommand } from "./commands/lint.js";
import { doctorCommand } from "./commands/doctor.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("kb")
  .description("A local-first AI knowledge base compiler")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(ingestCommand);
program.addCommand(compileCommand);
program.addCommand(queryCommand);
program.addCommand(lintCommand);
program.addCommand(doctorCommand);
program.addCommand(statusCommand);

program.parse();
