"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Process a document: extract text, chunk it, generate embeddings, and store.
 * Runs in Node.js runtime for better library compatibility.
 */
export const processDocument = internalAction({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    try {
      // Get document
      const document = await ctx.runQuery(internal.documents.getInternal, {
        documentId: args.documentId,
      });

      if (!document || !document.storageId) {
        throw new Error("Document or storage ID not found");
      }

      // Get file from storage
      const fileUrl = await ctx.storage.getUrl(document.storageId);
      if (!fileUrl) {
        throw new Error("File URL not found");
      }

      // Extract text using the Node.js action
      const text = await ctx.runAction(internal.documentActions.extractText, {
        fileUrl,
        fileType: document.fileType,
      });

      // Chunk text
      const chunks = chunkText(text, {
        chunkSize: 1500,
        overlap: 100,
      });

      // Generate embeddings and store chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding
        const embedding = await generateEmbedding(chunk.content);

        // Store chunk
        await ctx.runMutation(internal.documents.insertChunk, {
          documentId: args.documentId,
          chunkHash: hashContent(chunk.content),
          content: chunk.content,
          chunkIndex: i,
          pageNumber: chunk.pageNumber,
          headingPath: chunk.headingPath,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          embedding,
        });
      }

      // Update document status
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "ready",
        chunkCount: chunks.length,
      });
    } catch (error) {
      console.error("Document processing error:", error);
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * Extract text from PDF or DOCX files.
 * Runs in Node.js runtime with unpdf/mammoth libraries.
 */
export const extractText = internalAction({
  args: {
    fileUrl: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();

    if (args.fileType === "pdf") {
      // Use unpdf with proper initialization for Node.js runtime
      const { definePDFJSModule, extractText: extractPdfText, getDocumentProxy } = await import("unpdf");

      // Initialize the PDF.js module (required for proper operation)
      await definePDFJSModule(() => import("unpdf/pdfjs"));

      // Get document proxy and extract text
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractPdfText(pdf, { mergePages: true });
      return text;
    } else {
      // Use mammoth for DOCX
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      return result.value;
    }
  },
});

// Helper functions

function chunkText(
  text: string,
  options: { chunkSize: number; overlap: number }
): Array<{
  content: string;
  pageNumber?: number;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}> {
  const chunks: Array<{
    content: string;
    pageNumber?: number;
    headingPath: string[];
    startOffset: number;
    endOffset: number;
  }> = [];

  // Clean and normalize the text
  const cleanedText = text.replace(/\s+/g, " ").trim();

  let start = 0;
  while (start < cleanedText.length) {
    const end = Math.min(start + options.chunkSize, cleanedText.length);

    // Try to break at sentence boundary
    let breakPoint = end;
    if (end < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf(".", end);
      const lastNewline = cleanedText.lastIndexOf("\n", end);
      const lastBreak = Math.max(lastPeriod, lastNewline);

      if (lastBreak > start + options.chunkSize * 0.5) {
        breakPoint = lastBreak + 1;
      }
    }

    const content = cleanedText.slice(start, breakPoint).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        headingPath: [],
        startOffset: start,
        endOffset: breakPoint,
      });
    }

    start = breakPoint - options.overlap;
    if (start >= cleanedText.length - options.overlap) break;
    if (start <= chunks[chunks.length - 1]?.startOffset) break; // Prevent infinite loop
  }

  return chunks;
}

function hashContent(content: string): string {
  // Simple hash function - use crypto in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
