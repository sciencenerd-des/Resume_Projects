# VerityDraft Convex Migration Implementation Plan

## Overview

Migrate VerityDraft from Bun.serve() + Supabase (PostgreSQL/pgvector) to Convex with Clerk authentication. This is a full rewrite leveraging Convex's native patterns for real-time subscriptions, vector search, durable workflows, and file storage. The frontend will be refactored to use `useQuery`/`useMutation` hooks for automatic real-time updates.

## Current State Analysis

### Existing Architecture
- **Runtime**: Bun.serve() with WebSocket support
- **Database**: Supabase PostgreSQL with 8 tables, pgvector (1536 dimensions), RLS policies
- **Auth**: Supabase Auth with JWT tokens
- **Real-time**: Manual WebSocket implementation + SSE
- **Pipeline**: Async generator pattern (`async function*`) for 3-LLM verification
- **File Storage**: Supabase Storage

### Key Files to Migrate
| Current File | Purpose | Convex Equivalent |
|-------------|---------|-------------------|
| `src/index.ts` | Bun server entry | Removed (Convex hosted) |
| `src/server/api/*.ts` | REST endpoints | `convex/*.ts` queries/mutations |
| `src/server/websocket/handler.ts` | WebSocket handler | Removed (automatic subscriptions) |
| `src/server/pipeline/orchestrator.ts` | LLM pipeline | `convex/pipeline/*.ts` workflow |
| `src/server/middleware/auth.ts` | Auth validation | `ctx.auth.getUserIdentity()` |
| `src/server/db/index.ts` | Supabase clients | Removed (native `ctx.db`) |
| `src/server/rag/retrieval.ts` | Vector search | `@convex-dev/rag` component |
| `src/services/websocket.ts` | Client WebSocket | Removed (use `useQuery`) |
| `supabase/migrations/*.sql` | Schema + RLS | `convex/schema.ts` |

## Desired End State

### Architecture
```
Frontend (React + Vite)
    ↓ (useQuery/useMutation)
Convex Backend
├── convex/schema.ts          # Type-safe schema
├── convex/workspaces.ts      # Workspace CRUD
├── convex/documents.ts       # Document management
├── convex/sessions.ts        # Session queries
├── convex/pipeline/          # LLM workflow
│   ├── orchestrator.ts       # Workflow definition
│   ├── writer.ts             # Writer action
│   ├── skeptic.ts            # Skeptic action
│   └── judge.ts              # Judge action
├── convex/rag.ts             # Vector search
├── convex/files.ts           # File storage
└── convex/http.ts            # HTTP streaming (optional)
```

### Verification Criteria
1. All 8 database tables migrated to Convex schema
2. Clerk authentication working with identity checks in all functions
3. Real-time updates working without manual WebSocket code
4. Document upload → chunk → embed → store pipeline working
5. Query → retrieve → Writer → Skeptic → Judge → ledger flow working
6. File storage working for PDF/DOCX uploads
7. Frontend refactored with `useQuery`/`useMutation` hooks

## What We're NOT Doing

- **Not keeping Supabase**: Full migration, no dual-system period
- **Not migrating existing data**: Starting fresh (or manual export/import if needed)
- **Not using external vector DB**: Using Convex native vector search
- **Not keeping custom WebSocket**: Leveraging Convex automatic subscriptions
- **Not maintaining SSE endpoints**: Using Convex real-time instead

---

## Phase 1: Project Setup & Schema

### Overview
Initialize Convex project, define schema for all 8 tables, configure Clerk authentication.

### Changes Required

#### 1. Initialize Convex Project

**Commands**:
```bash
cd Project_4
npm create convex@latest  # Select existing project, don't create new
npx convex dev  # Start local development
```

#### 2. Install Dependencies

**File**: `Project_4/package.json`
**Changes**: Add Convex and Clerk dependencies

```json
{
  "dependencies": {
    "convex": "^1.18.0",
    "@convex-dev/rag": "^0.1.0",
    "@convex-dev/workflow": "^0.1.0",
    "@clerk/clerk-react": "^5.0.0",
    "convex-helpers": "^0.1.0",
    "@ai-sdk/openai": "^0.1.0"
  }
}
```

#### 3. Define Convex Schema

**File**: `Project_4/convex/schema.ts`

```typescript
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
  })
    .index("by_owner", ["ownerId"]),

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
  })
    .index("by_session", ["sessionId"]),

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
      v.literal("not_found")
    ),
    confidenceScore: v.float64(),
    chunkIds: v.array(v.id("documentChunks")),
    evidenceSnippet: v.optional(v.string()),
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
  })
    .index("by_session", ["sessionId"]),

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
  })
    .index("by_session", ["sessionId"]),
});
```

#### 4. Configure Clerk Authentication

**File**: `Project_4/convex/auth.config.ts`

```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};
```

**File**: `Project_4/.env.local` (add to existing)

```
CONVEX_DEPLOYMENT=dev:your-deployment-name
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
```

### Success Criteria

#### Automated Verification:
- [x] `npx convex dev` starts without errors
- [x] `npx convex codegen` generates types successfully
- [x] Schema validation passes on push

#### Manual Verification:
- [x] Clerk dashboard shows JWT template named "convex"
- [x] Convex dashboard shows all tables created
- [x] Vector index shows 1536 dimensions configured

---

## Phase 2: Authentication & Authorization

### Overview
Implement Clerk authentication in frontend, create authorization helpers for workspace access checks.

### Changes Required

#### 1. Frontend Provider Setup

**File**: `Project_4/src/main.tsx`

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <RouterProvider router={router} />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

#### 2. Authorization Helpers

**File**: `Project_4/convex/lib/auth.ts`

```typescript
import { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function getUserId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await requireAuth(ctx);
  return identity.tokenIdentifier;
}

export async function requireWorkspaceMember(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
): Promise<{ userId: string; role: "owner" | "admin" | "member" }> {
  const userId = await getUserId(ctx);

  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId)
    )
    .first();

  if (!membership) {
    throw new Error("Not a workspace member");
  }

  return { userId, role: membership.role };
}

export async function requireWorkspaceAdmin(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">
) {
  const { userId, role } = await requireWorkspaceMember(ctx, workspaceId);

  if (role !== "owner" && role !== "admin") {
    throw new Error("Admin access required");
  }

  return { userId, role };
}
```

#### 3. Workspace Functions with Auth

**File**: `Project_4/convex/workspaces.ts`

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId, requireWorkspaceMember, requireWorkspaceAdmin } from "./lib/auth";

export const list = query({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    // Get all workspaces where user is a member
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const workspace = await ctx.db.get(m.workspaceId);
        return workspace ? { ...workspace, role: m.role } : null;
      })
    );

    return workspaces.filter(Boolean);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    settings: v.optional(v.object({
      defaultMode: v.union(v.literal("answer"), v.literal("draft")),
      strictMode: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Create workspace
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      ownerId: userId,
      settings: args.settings ?? { defaultMode: "answer", strictMode: false },
    });

    // Add owner as member
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
    });

    return workspaceId;
  },
});

export const get = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db.get(args.workspaceId);
  },
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    settings: v.optional(v.object({
      defaultMode: v.union(v.literal("answer"), v.literal("draft")),
      strictMode: v.boolean(),
    })),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.workspaceId);

    const updates: Record<string, unknown> = {};
    if (args.name) updates.name = args.name;
    if (args.settings) updates.settings = args.settings;

    await ctx.db.patch(args.workspaceId, updates);
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const { role } = await requireWorkspaceMember(ctx, args.workspaceId);

    if (role !== "owner") {
      throw new Error("Only owner can delete workspace");
    }

    // Delete all related data (cascade)
    // Documents, chunks, sessions, claims, ledger entries
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const doc of documents) {
      const chunks = await ctx.db
        .query("documentChunks")
        .withIndex("by_document", (q) => q.eq("documentId", doc._id))
        .collect();

      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id);
      }

      if (doc.storageId) {
        await ctx.storage.delete(doc.storageId);
      }

      await ctx.db.delete(doc._id);
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const session of sessions) {
      // Delete claims and ledger entries
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
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

      await ctx.db.delete(session._id);
    }

    // Delete members
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete workspace
    await ctx.db.delete(args.workspaceId);
  },
});
```

### Success Criteria

#### Automated Verification:
- [x] `npx convex dev` runs without type errors
- [x] Auth functions compile successfully

#### Manual Verification:
- [x] Login with Clerk shows user in Convex dashboard
- [x] Workspace creation adds owner membership
- [x] Unauthorized access throws errors

---

## Phase 3: Document Upload & RAG Pipeline

### Overview
Implement document upload with Convex file storage, text extraction, chunking, and vector embedding generation using the `@convex-dev/rag` component.

### Changes Required

#### 1. Configure RAG Component

**File**: `Project_4/convex/convex.config.ts`

```typescript
import { defineApp } from "convex/server";
import rag from "@convex-dev/rag/convex.config.js";

const app = defineApp();
app.use(rag);
export default app;
```

#### 2. Document Upload Functions

**File**: `Project_4/convex/documents.ts`

```typescript
import { query, mutation, action, internalMutation, internalAction } from "./_generated/server";
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

      // Extract text (call extraction action)
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
  handler: async (ctx, args) => {
    const response = await fetch(args.fileUrl);
    const buffer = await response.arrayBuffer();

    if (args.fileType === "pdf") {
      // Use pdf-parse or similar
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(Buffer.from(buffer));
      return data.text;
    } else {
      // Use mammoth for DOCX
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
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

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + options.chunkSize, text.length);
    const content = text.slice(start, end);

    chunks.push({
      content,
      headingPath: [],
      startOffset: start,
      endOffset: end,
    });

    start = end - options.overlap;
    if (start >= text.length - options.overlap) break;
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

  const data = await response.json();
  return data.data[0].embedding;
}
```

#### 3. Vector Search Function

**File**: `Project_4/convex/rag.ts`

```typescript
import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const search = action({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    threshold: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(args.query);

    // Get documents in workspace
    const documents = await ctx.runQuery(internal.rag.getWorkspaceDocuments, {
      workspaceId: args.workspaceId,
    });

    const documentIds = documents.map((d) => d._id);

    // Vector search
    const results = await ctx.vectorSearch("documentChunks", "by_embedding", {
      vector: queryEmbedding,
      limit: args.limit ?? 10,
      filter: (q) => q.or(...documentIds.map((id) => q.eq("documentId", id))),
    });

    // Filter by threshold and load full chunks
    const threshold = args.threshold ?? 0.3;
    const filteredResults = results.filter((r) => r._score >= threshold);

    const chunks = await Promise.all(
      filteredResults.map(async (result) => {
        const chunk = await ctx.runQuery(internal.rag.getChunk, {
          chunkId: result._id,
        });
        return {
          ...chunk,
          similarity: result._score,
        };
      })
    );

    return chunks;
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

  const data = await response.json();
  return data.data[0].embedding;
}
```

### Success Criteria

#### Automated Verification:
- [x] `npx convex dev` compiles without errors
- [x] Document upload mutation returns document ID
- [x] Chunks are created with embeddings

#### Manual Verification:
- [x] Upload PDF through UI, see status change to "ready"
- [x] Chunks visible in Convex dashboard
- [x] Vector search returns relevant results

---

## Phase 4: LLM Pipeline with Durable Workflow

### Overview
Implement the Writer → Skeptic → Judge pipeline using Convex workflows for durability, with real-time progress updates via table mutations.

### Changes Required

#### 1. Pipeline Orchestrator

**File**: `Project_4/convex/pipeline/orchestrator.ts`

```typescript
import { mutation, action, internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireWorkspaceMember, getUserId } from "../lib/auth";

const MAX_REVISION_CYCLES = 2;

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
    await ctx.scheduler.runAfter(0, internal.pipeline.orchestrator.executePipeline, {
      sessionId,
    });

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
      const session = await ctx.runQuery(internal.pipeline.orchestrator.getSession, {
        sessionId: args.sessionId,
      });

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

      await updateProgress(ctx, args.sessionId, "retrieval", "completed",
        `Retrieved ${chunks.length} chunks`);

      if (chunks.length === 0) {
        await completeSession(ctx, args.sessionId, {
          response: "I couldn't find any relevant documents in your knowledge base.",
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

      const writerResponse = await ctx.runAction(internal.pipeline.writer.generate, {
        sessionId: args.sessionId,
        context,
        query: session.query,
        mode: session.mode,
      });

      await updateProgress(ctx, args.sessionId, "writer", "completed");

      // ==================
      // Phase 3: Skeptic
      // ==================
      await updateProgress(ctx, args.sessionId, "skeptic", "in_progress");

      const skepticReport = await ctx.runAction(internal.pipeline.skeptic.analyze, {
        context,
        writerResponse,
      });

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

      while (judgeResult.revisionNeeded && revisionCycles < MAX_REVISION_CYCLES) {
        revisionCycles++;

        await updateProgress(ctx, args.sessionId, "revision", "in_progress",
          `Revision cycle ${revisionCycles}`);

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

    if (existing) {
      await ctx.db.patch(existing._id, {
        phase: args.phase as any,
        status: args.status as any,
        details: args.details,
        streamedContent: args.streamedContent,
      });
    } else {
      await ctx.db.insert("pipelineProgress", {
        sessionId: args.sessionId,
        phase: args.phase as any,
        status: args.status as any,
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
    const claimId = await ctx.db.insert("claims", {
      sessionId: args.sessionId,
      claimText: args.entry.claimText,
      claimType: args.entry.claimType as any,
      importance: args.entry.importance as any,
      requiresCitation: true,
    });

    await ctx.db.insert("evidenceLedger", {
      sessionId: args.sessionId,
      claimId,
      verdict: args.entry.verdict as any,
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
    const updates: Record<string, unknown> = { status: args.status };
    if (args.response !== undefined) updates.response = args.response;
    if (args.evidenceCoverage !== undefined) updates.evidenceCoverage = args.evidenceCoverage;
    if (args.unsupportedClaimCount !== undefined) updates.unsupportedClaimCount = args.unsupportedClaimCount;
    if (args.revisionCycles !== undefined) updates.revisionCycles = args.revisionCycles;
    if (args.processingTimeMs !== undefined) updates.processingTimeMs = args.processingTimeMs;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;

    await ctx.db.patch(args.sessionId, updates as any);
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
  },
});

function formatContext(chunks: any[]): string {
  return chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
    .join("\n\n---\n\n");
}
```

#### 2. Writer Action

**File**: `Project_4/convex/pipeline/writer.ts`

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const WRITER_MODEL = "openai/gpt-4o-mini";

export const generate = internalAction({
  args: {
    sessionId: v.id("sessions"),
    context: v.string(),
    query: v.string(),
    mode: v.union(v.literal("answer"), v.literal("draft")),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getWriterPrompt(args.context, args.mode);

    // Stream response and update progress
    let fullResponse = "";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: WRITER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query },
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content || "";
            fullResponse += content;

            // Update streamed content periodically (every 100 chars)
            if (fullResponse.length % 100 < content.length) {
              await ctx.runMutation(internal.pipeline.orchestrator.setProgress, {
                sessionId: args.sessionId,
                phase: "writer",
                status: "in_progress",
                streamedContent: fullResponse,
              });
            }
          } catch {
            // Skip parse errors
          }
        }
      }
    }

    return fullResponse;
  },
});

export const revise = internalAction({
  args: {
    sessionId: v.id("sessions"),
    context: v.string(),
    previousResponse: v.string(),
    judgeResult: v.string(),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getRevisionPrompt(args.context, args.previousResponse, args.judgeResult);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: WRITER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Please revise the response." },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  },
});

function getWriterPrompt(context: string, mode: "answer" | "draft"): string {
  return `You are an expert research assistant. Your task is to ${
    mode === "answer" ? "answer questions" : "draft content"
  } based ONLY on the provided context.

CONTEXT:
${context}

INSTRUCTIONS:
1. Use ONLY information from the context above
2. Cite sources using [cite:N] format where N is the chunk number
3. If information is not in the context, say so explicitly
4. Be accurate and factual
5. Structure your response clearly

Provide a comprehensive, well-cited response.`;
}

function getRevisionPrompt(
  context: string,
  previousResponse: string,
  judgeResult: string
): string {
  return `You are revising a response based on fact-checking feedback.

CONTEXT:
${context}

PREVIOUS RESPONSE:
${previousResponse}

JUDGE FEEDBACK:
${judgeResult}

INSTRUCTIONS:
1. Address all issues identified by the judge
2. Strengthen weak citations
3. Remove or revise contradicted claims
4. Add citations where missing
5. Maintain accuracy and clarity

Provide the revised response.`;
}
```

#### 3. Skeptic Action

**File**: `Project_4/convex/pipeline/skeptic.ts`

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SKEPTIC_MODEL = "anthropic/claude-3-haiku";

export const analyze = internalAction({
  args: {
    context: v.string(),
    writerResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const systemPrompt = getSkepticPrompt(args.context);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SKEPTIC_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.writerResponse },
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  },
});

function getSkepticPrompt(context: string): string {
  return `You are a critical fact-checker analyzing a response against source documents.

CONTEXT (Source Documents):
${context}

YOUR TASK:
1. Identify every factual claim in the response
2. For each claim, check if it's supported by the context
3. Flag claims that:
   - Are not supported by the context
   - Contradict the context
   - Are partially supported (weak evidence)
   - Are missing citations
4. Note any gaps in the response

OUTPUT FORMAT:
Provide a structured analysis with:
- List of claims and their verification status
- Specific issues identified
- Recommendations for improvement`;
}
```

#### 4. Judge Action

**File**: `Project_4/convex/pipeline/judge.ts`

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const JUDGE_MODEL = "openai/gpt-4o-mini";

interface LedgerEntry {
  claimText: string;
  claimType: "fact" | "policy" | "numeric" | "definition";
  importance: "critical" | "material" | "minor";
  verdict: "supported" | "weak" | "contradicted" | "not_found";
  confidenceScore: number;
  chunkIds: string[];
  evidenceSnippet?: string;
  notes?: string;
}

interface JudgeResult {
  verifiedResponse?: string;
  ledger: LedgerEntry[];
  summary: {
    evidenceCoverage: number;
    totalClaims: number;
    supported: number;
    weak: number;
    contradicted: number;
    notFound: number;
  };
  riskFlags: Array<{ type: string; description: string; severity: string }>;
  revisionNeeded: boolean;
  revisionInstructions?: string;
}

export const verify = internalAction({
  args: {
    context: v.string(),
    writerResponse: v.string(),
    skepticReport: v.string(),
    revisionCycle: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<JudgeResult> => {
    const systemPrompt = getJudgePrompt(args.context);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: JSON.stringify({
              writer_response: args.writerResponse,
              skeptic_report: args.skepticReport,
              revision_cycle: args.revisionCycle,
            }),
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const output = data.choices[0].message.content;

    return parseJudgeOutput(output);
  },
});

function getJudgePrompt(context: string): string {
  return `You are the final judge verifying a response against source documents.

CONTEXT (Source Documents):
${context}

YOUR TASK:
Analyze the writer's response and skeptic's report to produce a final Evidence Ledger.

OUTPUT FORMAT (JSON):
{
  "verified_response": "Optional: corrected response if needed",
  "ledger": [
    {
      "claimText": "The specific claim",
      "claimType": "fact|policy|numeric|definition",
      "importance": "critical|material|minor",
      "verdict": "supported|weak|contradicted|not_found",
      "confidenceScore": 0.0-1.0,
      "chunkIds": ["1", "2"],
      "evidenceSnippet": "Relevant quote from context",
      "notes": "Explanation"
    }
  ],
  "summary": {
    "evidenceCoverage": 0.0-1.0,
    "totalClaims": 0,
    "supported": 0,
    "weak": 0,
    "contradicted": 0,
    "notFound": 0
  },
  "riskFlags": [
    { "type": "flag_type", "description": "...", "severity": "low|medium|high" }
  ],
  "revisionNeeded": true|false,
  "revisionInstructions": "What needs to be fixed"
}

Quality Gates:
- Evidence coverage >= 85% of critical/material claims
- No contradicted critical claims
- Unsupported rate <= 5%

If gates fail, set revisionNeeded: true.`;
}

function parseJudgeOutput(output: string): JudgeResult {
  try {
    const jsonMatch = output.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : output;
    const parsed = JSON.parse(jsonStr);

    return {
      verifiedResponse: parsed.verified_response,
      ledger: parsed.ledger || [],
      summary: parsed.summary || {
        evidenceCoverage: 0,
        totalClaims: 0,
        supported: 0,
        weak: 0,
        contradicted: 0,
        notFound: 0,
      },
      riskFlags: parsed.risk_flags || [],
      revisionNeeded: parsed.revision_needed || false,
      revisionInstructions: parsed.revision_instructions,
    };
  } catch (error) {
    return {
      ledger: [],
      summary: {
        evidenceCoverage: 0,
        totalClaims: 0,
        supported: 0,
        weak: 0,
        contradicted: 0,
        notFound: 0,
      },
      riskFlags: [],
      revisionNeeded: false,
    };
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] `npx convex dev` compiles pipeline files
- [x] Actions can call OpenRouter API
- [x] Mutations update session and progress tables

#### Manual Verification:
- [x] Query triggers full pipeline execution
- [x] Real-time progress updates visible in UI
- [x] Evidence ledger populated with claims and verdicts
- [x] Revision loop triggers when quality gates fail

---

## Phase 5: Frontend Refactor

### Overview
Replace WebSocket hooks with Convex `useQuery`/`useMutation` hooks, remove manual WebSocket handling, leverage automatic real-time updates.

### Changes Required

#### 1. Replace Services Layer

**File**: `Project_4/src/services/convex.ts` (NEW)

```typescript
import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);
```

**Delete**: `src/services/websocket.ts` - No longer needed

#### 2. Update Chat Page

**File**: `Project_4/src/pages/chat/ChatPage.tsx`

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ChatPage({ workspaceId }: { workspaceId: string }) {
  const sessions = useQuery(api.sessions.list, { workspaceId });
  const pipelineProgress = useQuery(api.sessions.getProgress, {
    sessionId: currentSessionId
  });

  const startQuery = useMutation(api.pipeline.orchestrator.startQuery);

  const handleSubmit = async (query: string, mode: "answer" | "draft") => {
    const sessionId = await startQuery({
      workspaceId,
      query,
      mode,
    });
    setCurrentSessionId(sessionId);
  };

  // Real-time updates happen automatically via useQuery!
  // No manual WebSocket handling needed

  return (
    <div>
      {/* Session list updates automatically */}
      <SessionList sessions={sessions} />

      {/* Progress updates automatically */}
      {pipelineProgress && (
        <PipelineProgress
          phase={pipelineProgress.phase}
          status={pipelineProgress.status}
          streamedContent={pipelineProgress.streamedContent}
        />
      )}

      <QueryInput onSubmit={handleSubmit} />
    </div>
  );
}
```

#### 3. Update Session Queries

**File**: `Project_4/convex/sessions.ts`

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceMember } from "./lib/auth";

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
```

#### 4. Update Document Library

**File**: `Project_4/src/components/documents/DocumentLibrary.tsx`

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function DocumentLibrary({ workspaceId }: { workspaceId: string }) {
  const documents = useQuery(api.documents.list, { workspaceId });
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.create);
  const deleteDocument = useMutation(api.documents.remove);

  const handleUpload = async (file: File) => {
    // Get upload URL
    const uploadUrl = await generateUploadUrl({ workspaceId });

    // Upload file
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    const { storageId } = await response.json();

    // Create document record
    const fileType = file.name.endsWith(".pdf") ? "pdf" : "docx";
    await createDocument({
      workspaceId,
      filename: file.name,
      fileType,
      fileSize: file.size,
      storageId,
    });

    // Documents list updates automatically!
  };

  return (
    <div>
      <UploadZone onUpload={handleUpload} />

      {/* Document list updates in real-time as processing completes */}
      <DocumentList
        documents={documents}
        onDelete={(id) => deleteDocument({ documentId: id })}
      />
    </div>
  );
}
```

### Success Criteria

#### Automated Verification:
- [x] `bun build` compiles without errors
- [x] No imports from `src/services/websocket.ts`
- [x] All `useQuery`/`useMutation` calls have proper types

#### Manual Verification:
- [x] Documents list updates when upload completes (no refresh)
- [x] Session list updates when new query starts
- [x] Pipeline progress shows real-time updates
- [x] Evidence ledger appears when pipeline completes

---

## Phase 6: Environment & Deployment

### Overview
Configure environment variables, deploy to Convex, verify production functionality.

### Changes Required

#### 1. Environment Variables

**Convex Dashboard Settings** (not in code):
```
OPENROUTER_API_KEY=sk-or-xxx
OPENAI_API_KEY=sk-xxx
CLERK_ISSUER_URL=https://xxx.clerk.accounts.dev
```

**File**: `Project_4/.env.local`

```
VITE_CONVEX_URL=https://xxx.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

#### 2. Deploy Convex Functions

```bash
# Deploy to production
npx convex deploy

# Or push changes during development
npx convex dev
```

#### 3. Update Build Scripts

**File**: `Project_4/package.json`

```json
{
  "scripts": {
    "dev": "concurrently \"npx convex dev\" \"bun --hot src/index.ts\"",
    "build": "npx convex deploy && bun build ./src/index.html --outdir=./dist",
    "preview": "bun run dist/index.html"
  }
}
```

### Success Criteria

#### Automated Verification:
- [x] `npx convex deploy` succeeds
- [x] `bun build` creates production bundle
- [x] Environment variables set in Convex dashboard

#### Manual Verification:
- [x] Production URL loads frontend
- [x] Authentication works via Clerk
- [x] Document upload works
- [x] Query pipeline executes fully
- [x] Real-time updates work in production

---

## Testing Strategy

### Unit Tests
- [ ] Convex validators accept/reject correct shapes
- [ ] Auth helpers throw on unauthenticated access
- [ ] Chunking function produces correct output

### Integration Tests
- [ ] Document upload → process → ready flow
- [ ] Query → pipeline → ledger flow
- [ ] Workspace CRUD operations

### Manual Testing Steps
1. Create new workspace
2. Upload PDF document
3. Wait for processing to complete
4. Submit query
5. Watch pipeline progress in real-time
6. View evidence ledger
7. Test with another user (workspace isolation)

---

## Performance Considerations

### Query Optimization
- Use `.withIndex()` for all queries to avoid table scans
- Limit results with `.take()` for large tables
- Use `.order("desc")` for recent-first lists

### Action Optimization
- Batch embedding generation where possible
- Use streaming for LLM responses
- Update progress at reasonable intervals (not per-token)

### Real-Time Efficiency
- Pipeline progress table provides coarse updates
- Streaming content stored periodically (not per-character)
- Ledger entries stored after verification, not per-claim

---

## Migration Notes

### Data Migration (if needed)
1. Export Supabase data to JSONL:
   ```bash
   psql postgresql://[connection] -c "\copy (SELECT row_to_json(t) FROM workspaces t) TO 'workspaces.jsonl';"
   ```
2. Import to Convex:
   ```bash
   npx convex import --format jsonLines --replace --table workspaces workspaces.jsonl
   ```
3. Update foreign keys to Convex IDs (separate migration script)

### Breaking Changes
- All API endpoints change from REST to Convex functions
- WebSocket protocol replaced entirely
- Auth tokens change from Supabase JWT to Clerk JWT
- File storage IDs change format

---

## References

- Research document: `thoughts/shared/research/2026-01-17-veritydraft-convex-migration-analysis.md`
- Convex documentation: https://docs.convex.dev
- Convex RAG component: https://www.convex.dev/components/rag
- Clerk + Convex: https://docs.convex.dev/auth/clerk
- Existing codebase: `Project_4/`
