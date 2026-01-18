import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember, getUserId } from "./lib/auth";
import { Id } from "./_generated/dataModel";

// ========================
// Internal Functions (for HTTP API)
// ========================

export const createInternal = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      workspaceId: args.workspaceId,
      userId: args.userId,
      query: args.query,
      mode: args.mode,
      settings: {},
      status: "processing",
      unsupportedClaimCount: 0,
      revisionCycles: 0,
    });
  },
});

export const updateInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("error")
      )
    ),
    response: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
    evidenceCoverage: v.optional(v.float64()),
    unsupportedClaimCount: v.optional(v.number()),
    revisionCycles: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    await ctx.db.patch(sessionId, filteredUpdates);
  },
});

export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const createClaimInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    claimText: v.string(),
    claimType: v.union(
      v.literal("fact"),
      v.literal("policy"),
      v.literal("numeric"),
      v.literal("definition"),
      v.literal("scientific"),
      v.literal("historical"),
      v.literal("legal")
    ),
    importance: v.union(
      v.literal("critical"),
      v.literal("material"),
      v.literal("minor")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("claims", {
      sessionId: args.sessionId,
      claimText: args.claimText,
      claimType: args.claimType,
      importance: args.importance,
      requiresCitation: true,
    });
  },
});

export const createLedgerEntryInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    claimId: v.id("claims"),
    verdict: v.union(
      v.literal("supported"),
      v.literal("weak"),
      v.literal("contradicted"),
      v.literal("not_found"),
      v.literal("expert_verified"),
      v.literal("conflict_flagged")
    ),
    sourceTag: v.optional(v.string()),
    confidenceScore: v.float64(),
    chunkIds: v.array(v.id("documentChunks")),
    evidenceSnippet: v.optional(v.string()),
    expertAssessment: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("evidenceLedger", {
      sessionId: args.sessionId,
      claimId: args.claimId,
      verdict: args.verdict,
      sourceTag: args.sourceTag,
      confidenceScore: args.confidenceScore,
      chunkIds: args.chunkIds,
      evidenceSnippet: args.evidenceSnippet,
      expertAssessment: args.expertAssessment,
      notes: args.notes,
    });
  },
});

export const updateProgressInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    phase: v.union(
      v.literal("retrieval"),
      v.literal("writer"),
      v.literal("skeptic"),
      v.literal("judge"),
      v.literal("revision")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("error")
    ),
    details: v.optional(v.string()),
    streamedContent: v.optional(v.string()),
    revisionCycle: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { sessionId, ...data } = args;

    // Upsert: find existing progress or create new
    const existing = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("pipelineProgress", {
        sessionId,
        ...data,
      });
    }
  },
});

// ========================
// Public Functions
// ========================

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);

    return await ctx.db
      .query("sessions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .take(50);
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    await requireWorkspaceMember(ctx, session.workspaceId);
    return session;
  },
});

export const getProgress = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const getLedger = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    await requireWorkspaceMember(ctx, session.workspaceId);

    const claims = await ctx.db
      .query("claims")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const entries = await Promise.all(
      claims.map(async (claim) => {
        const ledgerEntry = await ctx.db
          .query("evidenceLedger")
          .withIndex("by_claim", (q) => q.eq("claimId", claim._id))
          .first();

        return {
          ...claim,
          ...ledgerEntry,
        };
      })
    );

    // Calculate summary
    const summary = {
      totalClaims: entries.length,
      supported: entries.filter((e) => e.verdict === "supported").length,
      weak: entries.filter((e) => e.verdict === "weak").length,
      contradicted: entries.filter((e) => e.verdict === "contradicted").length,
      notFound: entries.filter((e) => e.verdict === "not_found").length,
      expertVerified: entries.filter((e) => e.verdict === "expert_verified").length,
      conflictFlagged: entries.filter((e) => e.verdict === "conflict_flagged").length,
    };

    return {
      sessionId: args.sessionId,
      summary,
      entries,
    };
  },
});

export const getWithLedger = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    await requireWorkspaceMember(ctx, session.workspaceId);

    // Get progress
    const progress = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // Get ledger entries
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const ledgerEntries = await Promise.all(
      claims.map(async (claim) => {
        const entry = await ctx.db
          .query("evidenceLedger")
          .withIndex("by_claim", (q) => q.eq("claimId", claim._id))
          .first();

        return entry
          ? {
              claimText: claim.claimText,
              claimType: claim.claimType,
              importance: claim.importance,
              verdict: entry.verdict,
              sourceTag: entry.sourceTag,
              confidenceScore: entry.confidenceScore,
              evidenceSnippet: entry.evidenceSnippet,
              expertAssessment: entry.expertAssessment,
              notes: entry.notes,
            }
          : null;
      })
    );

    return {
      ...session,
      progress,
      ledger: ledgerEntries.filter(Boolean),
    };
  },
});

export const submitFeedback = mutation({
  args: {
    sessionId: v.id("sessions"),
    feedbackType: v.union(
      v.literal("helpful"),
      v.literal("incorrect"),
      v.literal("missing_citation")
    ),
    comment: v.optional(v.string()),
    corrections: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await requireWorkspaceMember(ctx, session.workspaceId);
    const userId = await getUserId(ctx);

    return await ctx.db.insert("sessionFeedback", {
      sessionId: args.sessionId,
      userId,
      feedbackType: args.feedbackType,
      comment: args.comment,
      corrections: args.corrections,
    });
  },
});

export const cancel = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await requireWorkspaceMember(ctx, session.workspaceId);

    // Only cancel if still processing
    if (session.status === "processing" || session.status === "pending") {
      await ctx.db.patch(args.sessionId, {
        status: "error",
        errorMessage: "Cancelled by user",
      });
    }
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await requireWorkspaceMember(ctx, session.workspaceId);

    // Delete claims and ledger entries
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const claim of claims) {
      const ledgerEntries = await ctx.db
        .query("evidenceLedger")
        .withIndex("by_claim", (q) => q.eq("claimId", claim._id))
        .collect();

      for (const entry of ledgerEntries) {
        await ctx.db.delete(entry._id);
      }

      await ctx.db.delete(claim._id);
    }

    // Delete pipeline progress
    const progress = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const p of progress) {
      await ctx.db.delete(p._id);
    }

    // Delete feedback
    const feedback = await ctx.db
      .query("sessionFeedback")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const f of feedback) {
      await ctx.db.delete(f._id);
    }

    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});
