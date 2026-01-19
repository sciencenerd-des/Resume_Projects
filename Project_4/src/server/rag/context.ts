/**
 * Context Assembly
 * Formats retrieved chunks into context for LLM prompts
 */
import type { RetrievedChunk } from "./retrieval";

export interface AssembledContext {
  formatted: string;
  chunks: RetrievedChunk[];
  totalTokens: number;
  chunkMap: Map<string, RetrievedChunk>;
}

// Token estimation: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 50000;

/**
 * Assemble context from retrieved chunks
 */
export function assembleContext(
  chunks: RetrievedChunk[],
  maxTokens: number = DEFAULT_MAX_TOKENS
): AssembledContext {
  const selected: RetrievedChunk[] = [];
  const chunkMap = new Map<string, RetrievedChunk>();
  let tokenCount = 0;

  // Select chunks within token budget
  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.content);

    if (tokenCount + chunkTokens > maxTokens) {
      break;
    }

    selected.push(chunk);
    chunkMap.set(chunk.chunkHash, chunk);
    tokenCount += chunkTokens;
  }

  // Format context for LLM
  const formatted = formatContext(selected);

  return {
    formatted,
    chunks: selected,
    totalTokens: tokenCount,
    chunkMap,
  };
}

/**
 * Format chunks into structured context
 */
function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `## Source Documents

No relevant documents found in the knowledge base.

## Citation Instructions
Since no sources are available, you cannot cite evidence. Please inform the user that you don't have relevant information to answer their query.
`;
  }

  // Group chunks by document
  const byDocument = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.documentId;
    if (!byDocument.has(key)) {
      byDocument.set(key, []);
    }
    byDocument.get(key)!.push(chunk);
  }

  // Build formatted sections
  const sections: string[] = ["## Source Documents\n"];

  let docIndex = 0;
  for (const [docId, docChunks] of byDocument) {
    const firstChunk = docChunks[0];
    const filename = firstChunk.filename || `Document ${docIndex + 1}`;

    sections.push(`### ${filename}\n`);

    for (const chunk of docChunks) {
      const location = chunk.pageNumber
        ? `Page ${chunk.pageNumber}`
        : `Section ${chunk.chunkHash}`;

      const heading = chunk.headingPath.length > 0
        ? `> ${chunk.headingPath.join(" > ")}\n`
        : "";

      sections.push(`
**[${chunk.chunkHash}]** ${location} (Relevance: ${(chunk.similarity * 100).toFixed(0)}%)
${heading}
${chunk.content.trim()}

---
`);
    }

    docIndex++;
  }

  // Add citation instructions
  sections.push(`
## Citation Instructions

When making claims based on the source documents above, you MUST cite them using the format [cite:CHUNK_HASH].

For example:
- "The policy allows refunds within 30 days [cite:abc12345]."
- "Revenue increased by 15% [cite:def67890]."

Available chunk hashes for citation:
${chunks.map((c) => `- [${c.chunkHash}] from ${c.filename || "unknown"}`).join("\n")}

IMPORTANT:
- Only cite information that is directly stated in the source documents
- If information is not in the sources, explicitly state this
- Do not make claims without supporting citations
- Multiple citations can be combined: [cite:abc12345][cite:def67890]
`);

  return sections.join("\n");
}

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Create a minimal context for follow-up questions
 * Includes only the most relevant chunks
 */
export function assembleMinimalContext(
  chunks: RetrievedChunk[],
  maxChunks: number = 3
): AssembledContext {
  // Take only top N chunks
  const topChunks = chunks.slice(0, maxChunks);
  return assembleContext(topChunks);
}

/**
 * Format a single chunk for display
 */
export function formatChunkForDisplay(chunk: RetrievedChunk): string {
  return `[${chunk.chunkHash}] ${chunk.filename || "Unknown"}, Page ${chunk.pageNumber || "?"}\n${chunk.content}`;
}

/**
 * Extract citation hashes from response text
 */
export function extractCitations(text: string): string[] {
  const citationPattern = /\[cite:([a-f0-9]{8})\]/g;
  const citations: string[] = [];
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    if (!citations.includes(match[1])) {
      citations.push(match[1]);
    }
  }

  return citations;
}

/**
 * Verify that citations are valid
 */
export function verifyCitations(
  citations: string[],
  chunkMap: Map<string, RetrievedChunk>
): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const hash of citations) {
    if (chunkMap.has(hash)) {
      valid.push(hash);
    } else {
      invalid.push(hash);
    }
  }

  return { valid, invalid };
}
