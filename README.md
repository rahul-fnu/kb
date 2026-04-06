# kb — Local-First AI Knowledge Base Compiler

`kb` is a CLI tool that compiles a collection of raw markdown notes into a structured, interlinked wiki using AI. It tracks file changes with manifests, supports querying your knowledge base in natural language, and lints the output for consistency.

## Prerequisites

- **Node.js 20+**
- **pnpm**
- **Claude CLI** (for the default AI adapter)

## Installation

```bash
pnpm install && pnpm build && npm link
```

## Quick Start

```bash
# 1. Initialize a new knowledge base
kb init

# 2. Add source files to raw/ or ingest from a URL/path
kb ingest

# 3. Compile raw notes into structured wiki output
kb compile

# 4. Query your knowledge base
kb query "What are scaling laws?"

# 5. Lint the wiki for errors and warnings
kb lint
```

## Command Reference

| Command    | Description                                          |
| ---------- | ---------------------------------------------------- |
| `kb init`    | Initialize a new kb knowledge base in the current directory |
| `kb ingest`  | Ingest source files into the knowledge base          |
| `kb compile` | Compile raw notes into optimized wiki output         |
| `kb query`   | Query the knowledge base with a natural language question |
| `kb lint`    | Lint the wiki for errors and warnings                |
| `kb doctor`  | Check system dependencies and configuration          |
| `kb status`  | Show the current status of the knowledge base        |

## How It Works

```
raw/          →  kb compile  →  wiki/          →  kb query  →  outputs/
(your notes)                    (structured     (answers with
                                 wiki + INDEX    source citations)
                                 + LOG)
```

1. **raw/** — Drop your markdown notes here (or use `kb ingest`).
2. **kb compile** — The AI adapter reads your raw files, generates interlinked wiki pages, an `INDEX.md`, and appends to `LOG.md`.
3. **wiki/** — The compiled output: structured markdown files with cross-references.
4. **kb query** — Ask questions against the compiled wiki; get answers with source citations.
5. **outputs/** — Query results and reports.

## Architecture

```
kb/
├── src/
│   ├── cli.ts              # Commander CLI entry point
│   ├── types.ts            # Zod schemas and TypeScript types
│   ├── commands/
│   │   ├── init.ts         # Initialize knowledge base
│   │   ├── ingest.ts       # Ingest source files
│   │   ├── compile.ts      # Compile command (CLI wrapper)
│   │   ├── compile-logic.ts# Compile pipeline logic
│   │   ├── query.ts        # Query knowledge base
│   │   ├── lint.ts         # Lint wiki output
│   │   ├── doctor.ts       # Check dependencies
│   │   └── status.ts       # Show KB status
│   ├── adapter/
│   │   └── claude.ts       # AI adapter interface
│   └── utils/
│       ├── normalize.ts    # Path normalization utilities
│       └── manifest.ts     # Manifest read/write/diff
├── tests/                  # Unit and integration tests
├── sample/                 # Sample data for demo
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## Running Tests

```bash
npm test
```

## License

ISC
