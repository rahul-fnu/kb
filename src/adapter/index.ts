import Anthropic from "@anthropic-ai/sdk";
import type { QueryResult } from "../types.js";

const client = new Anthropic();

export interface WikiContent {
  path: string;
  content: string;
}

export async function answerQuery(
  question: string,
  wikiPages: WikiContent[],
): Promise<QueryResult> {
  const wikiContext = wikiPages
    .map((page) => `--- ${page.path} ---\n${page.content}`)
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a knowledge base assistant. Answer the following question based ONLY on the provided wiki content. If the wiki content does not contain enough information to answer the question, say so clearly.

## Wiki Content

${wikiContext}

## Question

${question}

Provide a clear, well-structured markdown answer. Reference specific wiki pages when citing information.`,
      },
    ],
  });

  const answer =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract which wiki pages were likely referenced based on mentions in the answer
  const sources = wikiPages
    .filter((page) => {
      const pageName = page.path.replace(/^wiki\//, "").replace(/\.md$/, "");
      return (
        answer.toLowerCase().includes(pageName.toLowerCase()) ||
        answer.includes(page.path)
      );
    })
    .map((page) => page.path);

  // If no specific sources detected, list all consulted pages
  const finalSources = sources.length > 0 ? sources : wikiPages.map((p) => p.path);

  return {
    answer,
    sources: finalSources,
    confidence: 1,
  };
}
