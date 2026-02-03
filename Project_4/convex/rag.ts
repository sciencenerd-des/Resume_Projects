import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Type for document from workspace query
interface WorkspaceDocument {
  _id: Id<"documents">;
  workspaceId: Id<"workspaces">;
  filename: string;
  status: string;
}

// Type for vector search result
interface VectorSearchResult {
  _id: Id<"documentChunks">;
  _score: number;
}

// Type for chunk data
interface ChunkData {
  _id: Id<"documentChunks">;
  documentId: Id<"documents">;
  content: string;
  chunkHash: string;
  chunkIndex: number;
  pageNumber?: number;
  headingPath: string[];
}

export const search = internalAction({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    threshold: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<ChunkData & { documentFilename?: string; similarity: number }>> => {
    // Generate embedding for query
    const queryEmbedding: number[] = await generateEmbedding(args.query);

    // Get documents in workspace
    const documents: WorkspaceDocument[] = await ctx.runQuery(internal.rag.getWorkspaceDocuments, {
      workspaceId: args.workspaceId,
    });

    if (documents.length === 0) {
      return [];
    }

    const documentIds: Id<"documents">[] = documents.map((d: WorkspaceDocument) => d._id);

    // Vector search across all document chunks
    const results: VectorSearchResult[] = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit ?? 15,
      filter: (q) =>
        q.or(...documentIds.map((id: Id<"documents">) => q.eq("documentId", id))),
    });

    // Filter by threshold and load full chunks
    const threshold: number = args.threshold ?? 0.3;
    const filteredResults: VectorSearchResult[] = results.filter((r: VectorSearchResult) => r._score >= threshold);

    const chunks = await Promise.all(
      filteredResults.map(async (result: VectorSearchResult) => {
        const chunk: ChunkData | null = await ctx.runQuery(internal.rag.getChunk, {
          chunkId: result._id,
        });

        // Get document info for context
        const document: { filename: string; fileType: string } | null = chunk
          ? await ctx.runQuery(internal.rag.getDocumentInfo, {
              documentId: chunk.documentId,
            })
          : null;

        return {
          ...chunk,
          documentFilename: document?.filename,
          similarity: result._score,
        };
      })
    );

    return chunks.filter(Boolean) as Array<ChunkData & { documentFilename?: string; similarity: number }>;
  },
});

export const getWorkspaceDocuments = internalQuery({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("status", "ready")
      )
      .collect();
  },
});

export const getChunk = internalQuery({
  args: { chunkId: v.id("documentChunks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chunkId);
  },
});

export const getDocumentInfo = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.documentId);
    return doc ? { filename: doc.filename, fileType: doc.fileType } : null;
  },
});

// Get all chunks for a document
export const getDocumentChunks = internalQuery({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentChunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
  },
});

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
