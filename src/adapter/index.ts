import type { CompileInput, CompileOutput } from "../types.js";

export interface Adapter {
  compileSources(input: CompileInput): Promise<CompileOutput>;
}

export { ClaudeAdapter } from "./claude.js";
