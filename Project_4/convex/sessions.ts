import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember, getUserId } from "./lib/auth";

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
              confidenceScore: entry.confidenceScore,
              evidenceSnippet: entry.evidenceSnippet,
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
