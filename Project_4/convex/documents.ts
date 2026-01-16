import {
  query,
  mutation,
  action,
  internalMutation,
  internalAction,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireWorkspaceMember } from "./lib/auth";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);

    return await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;

    await requireWorkspaceMember(ctx, document.workspaceId);
    return document;
  },
});

export const generateUploadUrl = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    filename: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
    fileSize: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);

    const documentId = await ctx.db.insert("documents", {
      workspaceId: args.workspaceId,
      filename: args.filename,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      tags: [],
      metadata: {},
      status: "processing",
      chunkCount: 0,
    });

    // Schedule document processing
    await ctx.scheduler.runAfter(0, internal.documents.processDocument, {
      documentId,
    });

    return documentId;
  },
});

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

      // Extract text
      const text = await ctx.runAction(internal.documents.extractText, {
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

export const extractText = internalAction({
  args: {
    fileUrl: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
  },
  handler: async (_ctx, args) => {
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();

    if (args.fileType === "pdf") {
      // Use pdf-parse
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buffer: Buffer) => Promise<{ text: string }> }).default;
      const data = await pdfParse(Buffer.from(buffer));
      return data.text;
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

export const insertChunk = internalMutation({
  args: {
    documentId: v.id("documents"),
    chunkHash: v.string(),
    content: v.string(),
    chunkIndex: v.number(),
    pageNumber: v.optional(v.number()),
    headingPath: v.array(v.string()),
    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("documentChunks")
      .withIndex("by_hash", (q) =>
        q.eq("documentId", args.documentId).eq("chunkHash", args.chunkHash)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("documentChunks", {
      documentId: args.documentId,
      chunkHash: args.chunkHash,
      content: args.content,
      chunkIndex: args.chunkIndex,
      pageNumber: args.pageNumber,
      headingPath: args.headingPath,
      startOffset: args.startOffset,
      endOffset: args.endOffset,
      embedding: args.embedding,
      metadata: {},
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    documentId: v.id("documents"),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    chunkCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.chunkCount !== undefined) updates.chunkCount = args.chunkCount;
    if (args.errorMessage) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.documentId, updates);
  },
});

export const getInternal = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

export const getChunks = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return [];

    await requireWorkspaceMember(ctx, document.workspaceId);

    return await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await requireWorkspaceMember(ctx, document.workspaceId);

    // Delete chunks
    const chunks = await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete file from storage
    if (document.storageId) {
      await ctx.storage.delete(document.storageId);
    }

    // Delete document
    await ctx.db.delete(args.documentId);
  },
});

export const updateTags = mutation({
  args: {
    documentId: v.id("documents"),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    await requireWorkspaceMember(ctx, document.workspaceId);

    await ctx.db.patch(args.documentId, { tags: args.tags });
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
