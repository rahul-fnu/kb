# kb: Project scaffolding and CLI skeleton

## Overview

Scaffold the `kb` CLI project — a local-first AI knowledge base compiler.

**Repo:** [https://github.com/rahul-fnu/kb](<https://github.com/rahul-fnu/kb>)

## Requirements

### Project setup

* TypeScript, Node 20+, pnpm
* package.json with bin entry pointing to `dist/cli.js`
* tsconfig.json targeting ES2022, module Node16
* vitest.config.ts
* Dependencies: commander, zod, execa
* Dev deps: typescript, vitest, @types/node

Create a .gitignore with node_modules/, dist/, build/, \*.tgz, .env

Ensure .gitignore exists and includes node_modules/, dist/, and build/. Do not commit these directories.

### Source structure

```
src/
  cli.ts          — Commander CLI entry point with subcommands stubbed
  commands/       — one file per command (init.ts, doctor.ts, etc — stubs ok)
  adapter/        — empty dir for Claude adapter
  utils/          — empty dir for utilities
  types.ts        — shared types and Zod schemas
```

### CLI entry

* Use Commander for CLI
* Register subcommands: init, ingest, compile, query, lint, doctor, status
* Each command can be a stub that prints "not implemented" for now
* Add shebang `#!/usr/bin/env node` to cli.ts
* Helpful --help output

### Config schema (types.ts)

* Define Zod schema for `.kb/config.json`: preferredAdapter, repoName, defaultTopic, queryOutputStyle
* Export TypeScript types derived from Zod schemas
* Define adapter interfaces: CompileResult, QueryResult, LintResult
* Define Manifest types for tracking file hashes
