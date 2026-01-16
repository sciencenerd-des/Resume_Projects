import {
  mutation,
  internalMutation,
  internalAction,
  internalQuery,
  ActionCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireWorkspaceMember, getUserId } from "../lib/auth";
import { Id } from "../_generated/dataModel";

const MAX_REVISION_CYCLES = 2;

interface LedgerEntry {
  claimText: string;
  claimType: string;
  importance: string;
  verdict: string;
  confidenceScore: number;
  chunkIds: string[];
  evidenceSnippet?: string;
  notes?: string;
}

export const startQuery = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    await requireWorkspaceMember(ctx, args.workspaceId);

    // Create session
    const sessionId = await ctx.db.insert("sessions", {
      workspaceId: args.workspaceId,
      userId,
      query: args.query,
      mode: args.mode,
      settings: {},
      status: "processing",
      unsupportedClaimCount: 0,
      revisionCycles: 0,
    });

    // Initialize pipeline progress
    await ctx.db.insert("pipelineProgress", {
      sessionId,
      phase: "retrieval",
      status: "pending",
    });

    // Schedule pipeline execution
    await ctx.scheduler.runAfter(
      0,
      internal.pipeline.orchestrator.executePipeline,
      {
        sessionId,
      }
    );

    return sessionId;
  },
});

export const executePipeline = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    let revisionCycles = 0;

    try {
      // Get session
      const session = await ctx.runQuery(
        internal.pipeline.orchestrator.getSession,
        {
          sessionId: args.sessionId,
        }
      );

      if (!session) throw new Error("Session not found");

      // ==================
      // Phase 1: Retrieval
      // ==================
      await updateProgress(ctx, args.sessionId, "retrieval", "in_progress");

      const chunks = await ctx.runAction(internal.rag.search, {
        workspaceId: session.workspaceId,
        query: session.query,
        threshold: 0.3,
        limit: 15,
      });

      await updateProgress(
        ctx,
        args.sessionId,
        "retrieval",
        "completed",
        `Retrieved ${chunks.length} chunks`
      );

      if (chunks.length === 0) {
        await completeSession(ctx, args.sessionId, {
          response:
            "I couldn't find any relevant documents in your knowledge base to answer this query. Please upload relevant documents first.",
          evidenceCoverage: 0,
          processingTimeMs: Date.now() - startTime,
        });
        return;
      }

      const context = formatContext(chunks);

      // ==================
      // Phase 2: Writer
      // ==================
      await updateProgress(ctx, args.sessionId, "writer", "in_progress");

      const writerResponse = await ctx.runAction(
        internal.pipeline.writer.generate,
        {
          sessionId: args.sessionId,
          context,
          query: session.query,
          mode: session.mode,
        }
      );

      await updateProgress(ctx, args.sessionId, "writer", "completed");

      // ==================
      // Phase 3: Skeptic
      // ==================
      await updateProgress(ctx, args.sessionId, "skeptic", "in_progress");

      const skepticReport = await ctx.runAction(
        internal.pipeline.skeptic.analyze,
        {
          context,
          writerResponse,
        }
      );

      await updateProgress(ctx, args.sessionId, "skeptic", "completed");

      // ==================
      // Phase 4: Judge
      // ==================
      await updateProgress(ctx, args.sessionId, "judge", "in_progress");

      let judgeResult = await ctx.runAction(internal.pipeline.judge.verify, {
        context,
        writerResponse,
        skepticReport,
      });

      // Store initial claims and ledger
      await storeLedger(ctx, args.sessionId, judgeResult.ledger);

      await updateProgress(ctx, args.sessionId, "judge", "completed");

      // ==================
      // Phase 5: Revision Loop
      // ==================
      let finalResponse = judgeResult.verifiedResponse || writerResponse;

      while (
        judgeResult.revisionNeeded &&
        revisionCycles < MAX_REVISION_CYCLES
      ) {
        revisionCycles++;

        await updateProgress(
          ctx,
          args.sessionId,
          "revision",
          "in_progress",
          `Revision cycle ${revisionCycles}`
        );

        // Revise response
        finalResponse = await ctx.runAction(internal.pipeline.writer.revise, {
          sessionId: args.sessionId,
          context,
          previousResponse: finalResponse,
          judgeResult: JSON.stringify(judgeResult),
        });

        // Re-verify
        judgeResult = await ctx.runAction(internal.pipeline.judge.verify, {
          context,
          writerResponse: finalResponse,
          skepticReport,
          revisionCycle: revisionCycles,
        });

        // Update ledger
        await storeLedger(ctx, args.sessionId, judgeResult.ledger);

        await updateProgress(ctx, args.sessionId, "revision", "completed");
      }

      // ==================
      // Phase 6: Complete
      // ==================
      await completeSession(ctx, args.sessionId, {
        response: finalResponse,
        evidenceCoverage: judgeResult.summary?.evidenceCoverage || 0,
        unsupportedClaimCount: judgeResult.summary?.notFound || 0,
        revisionCycles,
        processingTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Pipeline error:", error);
      await ctx.runMutation(internal.pipeline.orchestrator.failSession, {
        sessionId: args.sessionId,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Helper to update progress (triggers real-time UI update)
async function updateProgress(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  phase: string,
  status: string,
  details?: string
) {
  await ctx.runMutation(internal.pipeline.orchestrator.setProgress, {
    sessionId,
    phase,
    status,
    details,
  });
}

export const setProgress = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    phase: v.string(),
    status: v.string(),
    details: v.optional(v.string()),
    streamedContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get or create progress record
    const existing = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    const phaseValue = args.phase as
      | "retrieval"
      | "writer"
      | "skeptic"
      | "judge"
      | "revision";
    const statusValue = args.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "error";

    if (existing) {
      await ctx.db.patch(existing._id, {
        phase: phaseValue,
        status: statusValue,
        details: args.details,
        streamedContent: args.streamedContent,
      });
    } else {
      await ctx.db.insert("pipelineProgress", {
        sessionId: args.sessionId,
        phase: phaseValue,
        status: statusValue,
        details: args.details,
        streamedContent: args.streamedContent,
      });
    }
  },
});

export const getSession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

async function storeLedger(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  ledger: LedgerEntry[]
) {
  for (const entry of ledger) {
    await ctx.runMutation(internal.pipeline.orchestrator.insertClaim, {
      sessionId,
      entry,
    });
  }
}

export const insertClaim = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    entry: v.object({
      claimText: v.string(),
      claimType: v.string(),
      importance: v.string(),
      verdict: v.string(),
      confidenceScore: v.number(),
      chunkIds: v.array(v.string()),
      evidenceSnippet: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const claimType = args.entry.claimType as
      | "fact"
      | "policy"
      | "numeric"
      | "definition";
    const importance = args.entry.importance as
      | "critical"
      | "material"
      | "minor";
    const verdict = args.entry.verdict as
      | "supported"
      | "weak"
      | "contradicted"
      | "not_found";

    const claimId = await ctx.db.insert("claims", {
      sessionId: args.sessionId,
      claimText: args.entry.claimText,
      claimType,
      importance,
      requiresCitation: true,
    });

    await ctx.db.insert("evidenceLedger", {
      sessionId: args.sessionId,
      claimId,
      verdict,
      confidenceScore: args.entry.confidenceScore,
      chunkIds: [], // Would need proper chunk ID mapping
      evidenceSnippet: args.entry.evidenceSnippet,
      notes: args.entry.notes,
    });
  },
});

async function completeSession(
  ctx: ActionCtx,
  sessionId: Id<"sessions">,
  data: {
    response: string;
    evidenceCoverage: number;
    unsupportedClaimCount?: number;
    revisionCycles?: number;
    processingTimeMs: number;
  }
) {
  await ctx.runMutation(internal.pipeline.orchestrator.updateSession, {
    sessionId,
    status: "completed",
    response: data.response,
    evidenceCoverage: data.evidenceCoverage,
    unsupportedClaimCount: data.unsupportedClaimCount,
    revisionCycles: data.revisionCycles,
    processingTimeMs: data.processingTimeMs,
    completedAt: Date.now(),
  });
}

export const updateSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    status: v.string(),
    response: v.optional(v.string()),
    evidenceCoverage: v.optional(v.number()),
    unsupportedClaimCount: v.optional(v.number()),
    revisionCycles: v.optional(v.number()),
    processingTimeMs: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const status = args.status as
      | "pending"
      | "processing"
      | "completed"
      | "error";
    const updates: Record<string, unknown> = { status };
    if (args.response !== undefined) updates.response = args.response;
    if (args.evidenceCoverage !== undefined)
      updates.evidenceCoverage = args.evidenceCoverage;
    if (args.unsupportedClaimCount !== undefined)
      updates.unsupportedClaimCount = args.unsupportedClaimCount;
    if (args.revisionCycles !== undefined)
      updates.revisionCycles = args.revisionCycles;
    if (args.processingTimeMs !== undefined)
      updates.processingTimeMs = args.processingTimeMs;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;

    await ctx.db.patch(args.sessionId, updates);
  },
});

export const failSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "error",
      errorMessage: args.errorMessage,
    });

    // Also update progress to show error
    const progress = await ctx.db
      .query("pipelineProgress")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (progress) {
      await ctx.db.patch(progress._id, {
        status: "error",
        details: args.errorMessage,
      });
    }
  },
});

function formatContext(
  chunks: Array<{ content: string; documentFilename?: string }>
): string {
  return chunks
    .map(
      (chunk, i) =>
        `[${i + 1}]${chunk.documentFilename ? ` (${chunk.documentFilename})` : ""}\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
