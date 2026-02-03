---
date: 2026-01-17
researcher: claude
topic: "VerityDraft to Multi-Model Chatbot Conversion"
tags: [research, architecture, chatbot, llm, convex]
status: complete
---

# Research: Converting VerityDraft to a Multi-Model Verification Chatbot

## Executive Summary

This report analyzes the conversion of VerityDraft from an evidence-ledger document QA system into a general-purpose chatbot where **three LLMs collaborate to verify answers and reduce hallucinations**. The existing 3-LLM architecture (Writer, Skeptic, Judge) provides an excellent foundation that can be adapted for this purpose.

**Key Insight**: The current Writer→Skeptic→Judge pipeline is already designed for answer verification. We can repurpose it by removing the document/RAG dependency and focusing on fact-based reasoning.

---

## 1. Current Architecture Analysis

### 1.1 The Existing 3-LLM Pipeline

Located in `/convex/pipeline/`:

| Role | Model | Current Purpose | Temperature |
|------|-------|-----------------|-------------|
| **Writer** | GPT-4o-mini | Generate content with citations | 0.7 |
| **Skeptic** | Claude 3 Haiku | Challenge claims against documents | 0.3 |
| **Judge** | GPT-4o-mini | Verify claims, produce evidence ledger | 0.2 |

**Current Flow:**
```
Query → RAG Retrieval → Writer → Skeptic → Judge → (Revision Loop ×2) → Response
```

### 1.2 What the Pipeline Currently Does

1. **Writer** (`writer.ts`):
   - Generates response with `[cite:N]` anchors
   - Streams content in real-time
   - Supports "answer" and "draft" modes

2. **Skeptic** (`skeptic.ts`):
   - Analyzes each claim in the Writer's response
   - Checks against retrieved document chunks
   - Flags: supported, weak, contradicted, not_found

3. **Judge** (`judge.ts`):
   - Final verification authority
   - Produces structured Evidence Ledger
   - Decides if revision is needed
   - Quality gates: 85% coverage, ≤5% unsupported

4. **Orchestrator** (`orchestrator.ts`):
   - Coordinates all phases
   - Tracks progress in real-time
   - Manages revision loops (max 2 cycles)

### 1.3 Database Schema (Current)

```
workspaces          → Keep
workspaceMembers    → Keep
documents           → REMOVE
documentChunks      → REMOVE (vector embeddings)
sessions            → Simplify
claims              → REMOVE
evidenceLedger      → REMOVE
pipelineProgress    → Keep (for streaming progress)
sessionFeedback     → Optional
```

---

## 2. Target Architecture: Multi-Model Verification Chatbot

### 2.1 Core Concept

A ChatGPT-like interface where three models collaborate:

```
User Message
     ↓
┌─────────────────────────────────────────────────┐
│  Model 1: GENERATOR                             │
│  - Produces initial response                    │
│  - Focuses on being helpful and comprehensive   │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Model 2: CRITIC                                │
│  - Reviews Generator's response                 │
│  - Identifies potential issues:                 │
│    • Factual accuracy concerns                  │
│    • Logical inconsistencies                    │
│    • Overconfident claims                       │
│    • Missing caveats                            │
│  - Suggests improvements                        │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Model 3: SYNTHESIZER                           │
│  - Combines Generator response + Critic review  │
│  - Produces final verified response             │
│  - Adds confidence indicators where needed      │
│  - Decides: respond OR request revision         │
└─────────────────────────────────────────────────┘
     ↓
Final Response (or Revision Loop)
```

### 2.2 Role Definitions

#### Model 1: Generator
- **Purpose**: Produce helpful, comprehensive initial response
- **Model**: GPT-4o-mini or similar (balanced cost/quality)
- **Temperature**: 0.7 (creative but controlled)
- **Prompt Focus**:
  - Answer the user's question thoroughly
  - Be helpful and conversational
  - Don't worry about verification yet

#### Model 2: Critic
- **Purpose**: Adversarial review for quality and accuracy
- **Model**: Claude 3 Haiku (fast, analytical)
- **Temperature**: 0.2 (precise, consistent)
- **Prompt Focus**:
  - Review the Generator's response
  - Flag claims that seem uncertain or potentially incorrect
  - Identify logical gaps or inconsistencies
  - Suggest where caveats should be added
  - Note anything that requires revision

#### Model 3: Synthesizer
- **Purpose**: Final integration and verification
- **Model**: GPT-4o-mini or GPT-4o (quality-focused)
- **Temperature**: 0.3 (balanced precision)
- **Prompt Focus**:
  - Read the original response AND the Critic's review
  - Produce a final response that addresses the Critic's concerns
  - Add appropriate uncertainty language where needed
  - Ensure factual claims are qualified if uncertain
  - Decide if response is ready or needs another revision cycle

### 2.3 Key Differences from Current System

| Aspect | Current (Evidence Ledger) | New (Verification Chatbot) |
|--------|---------------------------|---------------------------|
| **Knowledge Source** | Uploaded documents | Model knowledge + reasoning |
| **Verification Against** | Document chunks | Internal consistency + known facts |
| **Citation System** | Required `[cite:N]` | Optional confidence indicators |
| **Evidence Ledger** | Detailed verdict per claim | Simplified quality check |
| **User Experience** | Document-grounded QA | General conversation |
| **RAG Pipeline** | Required | Removed |

---

## 3. What to Keep

### 3.1 Authentication & Authorization
- Clerk integration (OAuth, user management)
- Convex auth helpers (`requireAuth`, `getUserId`)
- Workspace-based multi-tenancy
- Role-based access control

**Files to keep:**
- `convex/auth.config.ts`
- `convex/lib/auth.ts`
- `src/contexts/ConvexClerkProvider.tsx`
- `src/components/auth/AuthGuard.tsx`

### 3.2 Workspace Management
- Multi-workspace support per user
- Workspace switching UI
- Member management (if needed)

**Files to keep:**
- `convex/workspaces.ts`
- `src/contexts/WorkspaceContext.tsx`
- `src/components/workspace/WorkspaceSwitcher.tsx`

### 3.3 Chat UI Components
- Message list rendering
- Input handling
- Streaming display
- Mode toggle (can repurpose for "quick" vs "verified" mode)

**Files to keep (with modifications):**
- `src/components/chat/ChatInterface.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/StreamingIndicator.tsx`
- `src/components/chat/QueryInput.tsx`

### 3.4 Real-time Infrastructure
- Convex subscriptions for live updates
- Progress tracking table
- Streaming content display

**Files to keep:**
- `convex/sessions.ts` (simplified)
- Progress tracking pattern from `pipelineProgress` table

### 3.5 Server & Frontend Infrastructure
- Bun.serve() setup
- React Router SPA
- Tailwind + shadcn/ui components
- Theme context (dark mode)
- Command palette

---

## 4. What to Remove

### 4.1 Document Processing Pipeline
- File upload components
- PDF/DOCX text extraction
- Chunking algorithm
- Embedding generation
- Vector storage

**Files to remove:**
- `convex/documents.ts`
- `convex/rag.ts`
- `src/components/documents/*`
- `src/pages/documents/*`
- `src/hooks/useConvexDocuments.ts`

### 4.2 Evidence Ledger System
- Claim extraction
- Evidence matching
- Verdict generation
- Ledger UI components

**Files to remove:**
- `src/components/evidence/*`
- Evidence ledger panel from ChatInterface
- Citation popover system

### 4.3 Database Tables to Remove
```typescript
// Remove from convex/schema.ts:
documents: defineTable({...})
documentChunks: defineTable({...}).vectorIndex(...)
claims: defineTable({...})
evidenceLedger: defineTable({...})
```

### 4.4 Routes to Remove
```typescript
// Remove from App.tsx:
/workspaces/:id/documents
/sessions/:id (evidence view)
```

---

## 5. Simplified Database Schema

### 5.1 New Schema

```typescript
// convex/schema.ts

export default defineSchema({
  // Keep: Workspace management
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
    settings: v.optional(v.object({
      defaultMode: v.union(v.literal("quick"), v.literal("verified")),
    })),
  }).index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  // Simplified: Chat sessions (conversations)
  conversations: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    title: v.optional(v.string()), // Auto-generated from first message
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  // New: Messages within conversations
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    mode: v.union(v.literal("quick"), v.literal("verified")),
    // Verification metadata (only for "verified" mode)
    verificationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("revised")
    )),
    revisionCount: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  // Keep: Pipeline progress for streaming UI
  messageProgress: defineTable({
    messageId: v.id("messages"),
    phase: v.union(
      v.literal("generating"),
      v.literal("reviewing"),
      v.literal("synthesizing"),
      v.literal("complete")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("error")
    ),
    streamedContent: v.optional(v.string()),
    error: v.optional(v.string()),
  }).index("by_message", ["messageId"]),
});
```

### 5.2 Schema Comparison

| Current Table | New Equivalent | Notes |
|---------------|----------------|-------|
| `workspaces` | `workspaces` | Keep as-is |
| `workspaceMembers` | `workspaceMembers` | Keep as-is |
| `sessions` | `conversations` | Renamed, simplified |
| `pipelineProgress` | `messageProgress` | Adapted for new phases |
| `documents` | ❌ Removed | No document upload |
| `documentChunks` | ❌ Removed | No RAG |
| `claims` | ❌ Removed | No claim extraction |
| `evidenceLedger` | ❌ Removed | No evidence ledger |

---

## 6. New Pipeline Architecture

### 6.1 Pipeline Flow

```typescript
// convex/pipeline/chat.ts

// Phase 1: Generate initial response
export const generate = internalAction({
  args: { messageId: v.id("messages"), userMessage: v.string(), history: v.array(...) },
  handler: async (ctx, args) => {
    // Call Generator model (GPT-4o-mini)
    // Stream response to messageProgress.streamedContent
    // Return initial response
  },
});

// Phase 2: Review response (only in "verified" mode)
export const review = internalAction({
  args: { messageId: v.id("messages"), initialResponse: v.string() },
  handler: async (ctx, args) => {
    // Call Critic model (Claude Haiku)
    // Analyze for issues, inconsistencies, uncertain claims
    // Return structured review
  },
});

// Phase 3: Synthesize final response
export const synthesize = internalAction({
  args: { messageId: v.id("messages"), initialResponse: v.string(), review: v.object(...) },
  handler: async (ctx, args) => {
    // Call Synthesizer model (GPT-4o-mini)
    // Integrate review feedback
    // Produce final verified response
    // Decide if revision needed
  },
});

// Orchestrator
export const processMessage = internalAction({
  args: { messageId: v.id("messages"), mode: v.union(v.literal("quick"), v.literal("verified")) },
  handler: async (ctx, args) => {
    if (args.mode === "quick") {
      // Single model, stream directly
      await ctx.runAction(internal.pipeline.chat.generate, {...});
    } else {
      // Full verification pipeline
      const initial = await ctx.runAction(internal.pipeline.chat.generate, {...});
      const review = await ctx.runAction(internal.pipeline.chat.review, {...});
      const final = await ctx.runAction(internal.pipeline.chat.synthesize, {...});

      // Revision loop if needed (max 2 cycles)
      if (final.needsRevision && revisionCount < 2) {
        // Re-run with revision instructions
      }
    }
  },
});
```

### 6.2 Two Modes

#### Quick Mode
- Single LLM call (Generator only)
- Fast response, no verification
- Streaming support
- Use case: Simple questions, casual chat

#### Verified Mode
- Full 3-model pipeline
- Generator → Critic → Synthesizer
- Revision loop if quality gates fail
- Use case: Important questions, fact-based queries

### 6.3 Quality Gates (Verified Mode)

The Synthesizer evaluates:

1. **Factual Confidence**: Are claims stated with appropriate certainty?
2. **Logical Consistency**: Does the response contradict itself?
3. **Completeness**: Are important caveats included?
4. **Helpfulness**: Does it actually answer the question?

If any gate fails, request revision (max 2 cycles).

---

## 7. Frontend Changes

### 7.1 ChatInterface Simplification

**Remove:**
- Evidence ledger panel
- Citation popovers
- Document context display
- Claim type badges

**Keep:**
- Message list
- Query input
- Mode toggle (repurpose for quick/verified)
- Streaming indicator
- Progress display

**Add:**
- Verification badge on messages (when in verified mode)
- "Verified by 3 models" indicator
- Revision count display (if revised)

### 7.2 New Mode Toggle

```tsx
// Instead of "answer" vs "draft":
<ModeToggle
  mode={mode}
  onChange={setMode}
  options={[
    { value: "quick", label: "Quick", description: "Fast response" },
    { value: "verified", label: "Verified", description: "3-model verification" },
  ]}
/>
```

### 7.3 Progress Indicator (Verified Mode)

```
[●○○] Generating response...
[●●○] Reviewing for accuracy...
[●●●] Finalizing verified answer...
```

---

## 8. API Integration

### 8.1 OpenRouter Configuration

Keep using OpenRouter for flexibility:

```typescript
const MODELS = {
  generator: "openai/gpt-4o-mini",
  critic: "anthropic/claude-3-haiku-20240307",
  synthesizer: "openai/gpt-4o-mini",
};
```

### 8.2 Environment Variables (Simplified)

```bash
# Required
VITE_CONVEX_URL=https://...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_ISSUER_URL=https://...clerk.accounts.dev
OPENROUTER_API_KEY=sk-or-...

# Removed
# OPENAI_API_KEY (no embeddings needed)
```

---

## 9. Migration Path

### 9.1 Phase 1: Schema Migration
1. Create new schema with `conversations` and `messages` tables
2. Keep old tables temporarily
3. Run Convex migration

### 9.2 Phase 2: Pipeline Refactor
1. Create new `convex/pipeline/chat.ts`
2. Adapt Generator from Writer
3. Adapt Critic from Skeptic
4. Create new Synthesizer (simplified Judge)
5. Simplify Orchestrator

### 9.3 Phase 3: Frontend Cleanup
1. Remove document components
2. Remove evidence ledger components
3. Simplify ChatInterface
4. Update mode toggle
5. Add verification indicators

### 9.4 Phase 4: Route Cleanup
1. Remove `/workspaces/:id/documents`
2. Update workspace home page
3. Simplify navigation

### 9.5 Phase 5: Final Cleanup
1. Remove unused files
2. Remove unused dependencies (pdf-parse, mammoth, unpdf, pdfjs-dist)
3. Update documentation

---

## 10. Risk Assessment

### 10.1 Low Risk
- Authentication (no changes needed)
- Workspace management (minimal changes)
- UI components (mostly removal)

### 10.2 Medium Risk
- Pipeline refactor (adapting existing code)
- Schema migration (Convex handles gracefully)
- Real-time streaming (same pattern, different content)

### 10.3 Considerations
- **Cost**: 3 LLM calls per message in verified mode (mitigated by quick mode option)
- **Latency**: Sequential LLM calls add latency (mitigated by streaming)
- **Accuracy**: Without documents, verification is based on model knowledge

---

## 11. Success Criteria

1. **Functional**: Users can send messages and receive responses
2. **Two Modes**: Quick (fast) and Verified (3-model) modes work
3. **Streaming**: Real-time response streaming in both modes
4. **Verification Visible**: Users can see when verification is happening
5. **No RAG**: No document upload or processing
6. **Auth Works**: Clerk + Convex authentication intact
7. **Multi-tenant**: Workspace isolation maintained

---

## 12. File Change Summary

### Files to Create
- `convex/pipeline/chat.ts` (new orchestrator)
- `convex/conversations.ts` (conversation CRUD)
- `convex/messages.ts` (message CRUD)

### Files to Modify
- `convex/schema.ts` (new schema)
- `src/App.tsx` (remove document routes)
- `src/components/chat/ChatInterface.tsx` (simplify)
- `src/pages/chat/ChatPage.tsx` (adapt for new schema)
- `src/pages/workspace/WorkspaceHomePage.tsx` (remove document stats)

### Files to Remove
- `convex/documents.ts`
- `convex/rag.ts`
- `convex/pipeline/writer.ts`
- `convex/pipeline/skeptic.ts`
- `convex/pipeline/judge.ts`
- `convex/pipeline/orchestrator.ts`
- `src/components/documents/*`
- `src/components/evidence/*`
- `src/hooks/useConvexDocuments.ts`
- `src/pages/documents/*`

---

## 13. User Decisions (Confirmed 2026-01-17)

1. **Mode Default**: **Verified mode** is the default

2. **Conversation History**: **Full conversation history** used for context in all models

3. **Revision Visibility**: **Yes** - show users when a response was revised (e.g., "Revised 1x for accuracy")

4. **Model Selection** (Confirmed):
   - Generator: **GPT-5 Nano** (via OpenRouter)
   - Critic: **GLM 4.7** (via OpenRouter)
   - Synthesizer: **DeepSeek V3.2 Speciale** (via OpenRouter)

5. **User Feedback**: **Yes** - users can flag inaccurate responses for improvement

---

## 14. Confidence Assessment

**Overall Confidence: 95%**

The conversion is well-scoped because:
- Existing 3-LLM pattern is directly adaptable
- Infrastructure (Convex, Clerk, React) remains unchanged
- Main work is simplification (removal) rather than creation
- Clear separation of concerns in current codebase

**Remaining 5% uncertainty**:
- Exact prompt engineering for Critic and Synthesizer
- Fine-tuning quality gates without document grounding
- Real-world verification effectiveness without source documents

---

## Appendix: Prompt Templates (Draft)

### Generator Prompt
```
You are a helpful AI assistant. Answer the user's question thoroughly and conversationally.

User: {userMessage}

Previous conversation:
{history}

Respond helpfully:
```

### Critic Prompt
```
You are a critical reviewer. Analyze the following AI response for issues.

User's question: {userMessage}
AI's response: {generatorResponse}

Review for:
1. Claims that seem uncertain or potentially incorrect
2. Logical inconsistencies
3. Missing important caveats
4. Overconfident statements about uncertain topics

Provide structured feedback:
- Issues found: [list]
- Suggested improvements: [list]
- Overall quality: [good/needs_revision]
```

### Synthesizer Prompt
```
You are a final reviewer. Integrate the feedback to produce a verified response.

Original question: {userMessage}
Initial response: {generatorResponse}
Reviewer feedback: {criticFeedback}

Produce a final response that:
1. Addresses the reviewer's concerns
2. Adds appropriate uncertainty language where needed
3. Maintains helpfulness
4. Is factually grounded

Final response:
```

---

*Research completed: 2026-01-17*
*Status: Ready for user review and approval before implementation*
