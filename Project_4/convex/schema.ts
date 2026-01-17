import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // =====================
  // Workspaces
  // =====================
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(), // Clerk user ID (tokenIdentifier)
    settings: v.object({
      defaultMode: v.union(v.literal("answer"), v.literal("draft")),
      strictMode: v.boolean(),
    }),
  }).index("by_owner", ["ownerId"]),

  // =====================
  // Workspace Members
  // =====================
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(), // Clerk user ID
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  // =====================
  // Documents
  // =====================
  documents: defineTable({
    workspaceId: v.id("workspaces"),
    filename: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx")),
    fileSize: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
    tags: v.array(v.string()),
    metadata: v.any(),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    chunkCount: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  // =====================
  // Document Chunks (with vector embeddings)
  // =====================
  documentChunks: defineTable({
    documentId: v.id("documents"),
    chunkHash: v.string(),
    content: v.string(),
    chunkIndex: v.number(),
    pageNumber: v.optional(v.number()),
    headingPath: v.array(v.string()),
    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
    embedding: v.array(v.float64()), // 1536 dimensions
    metadata: v.any(),
  })
    .index("by_document", ["documentId"])
    .index("by_hash", ["documentId", "chunkHash"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["documentId"],
    }),

  // =====================
  // Sessions
  // =====================
  sessions: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
    settings: v.any(),
    response: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.optional(v.number()),
    tokenCount: v.optional(v.any()),
    evidenceCoverage: v.optional(v.float64()),
    unsupportedClaimCount: v.number(),
    revisionCycles: v.number(),
    completedAt: v.optional(v.number()), // Unix timestamp
    // Conversation history for multi-turn context
    conversationHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_status", ["workspaceId", "status"]),

  // =====================
  // Claims
  // =====================
  claims: defineTable({
    sessionId: v.id("sessions"),
    claimText: v.string(),
    claimType: v.union(
      v.literal("fact"),
      v.literal("policy"),
      v.literal("numeric"),
      v.literal("definition")
    ),
    importance: v.union(
      v.literal("critical"),
      v.literal("material"),
      v.literal("minor")
    ),
    requiresCitation: v.boolean(),
    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),

  // =====================
  // Evidence Ledger
  // =====================
  evidenceLedger: defineTable({
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
    sourceTag: v.optional(v.string()), // cite:N, llm:writer, llm:skeptic, llm:judge
    confidenceScore: v.float64(),
    chunkIds: v.array(v.id("documentChunks")),
    evidenceSnippet: v.optional(v.string()),
    expertAssessment: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_claim", ["claimId"])
    .index("by_session_verdict", ["sessionId", "verdict"]),

  // =====================
  // Session Feedback
  // =====================
  sessionFeedback: defineTable({
    sessionId: v.id("sessions"),
    userId: v.string(),
    feedbackType: v.union(
      v.literal("helpful"),
      v.literal("incorrect"),
      v.literal("missing_citation")
    ),
    comment: v.optional(v.string()),
    corrections: v.optional(v.any()),
  }).index("by_session", ["sessionId"]),

  // =====================
  // Pipeline Progress (for real-time UI updates)
  // =====================
  pipelineProgress: defineTable({
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
    streamedContent: v.optional(v.string()), // For streaming response
    revisionCycle: v.optional(v.number()),
  }).index("by_session", ["sessionId"]),
});
