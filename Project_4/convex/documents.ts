import {
  query,
  mutation,
  internalMutation,
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

    // Schedule document processing (runs in Node.js runtime)
    await ctx.scheduler.runAfter(0, internal.documentActions.processDocument, {
      documentId,
    });

    return documentId;
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
