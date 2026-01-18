---
date: 2026-01-17
author: claude
topic: "VerityDraft to Multi-Model Chatbot Conversion"
tags: [plan, implementation, chatbot, llm, convex]
status: pending_approval
related_research: 2026-01-17-veritydraft-chatbot-conversion-research.md
---

# Implementation Plan: Multi-Model Verification Chatbot

## Overview

Convert VerityDraft from a document-grounded evidence ledger system into a general-purpose chatbot where three LLMs collaborate to verify answers and reduce hallucinations.

**Confidence Level**: 95%

---

## Confirmed Specifications

| Decision | Value |
|----------|-------|
| Default Mode | Verified (3-model pipeline) |
| Conversation Context | Full history passed to all models |
| Revision Visibility | Yes, show "Revised Nx" indicator |
| Generator Model | GPT-5 Nano |
| Critic Model | GLM 4.7 |
| Synthesizer Model | DeepSeek V3.2 Speciale |
| User Feedback | Yes, flag inaccurate responses |

---

## Phase 1: Database Schema Migration

### 1.1 Create New Schema

**File**: `convex/schema.ts`

**Changes**:
- Add `conversations` table (replaces `sessions`)
- Add `messages` table (new)
- Add `messageProgress` table (adapted from `pipelineProgress`)
- Add `responseFeedback` table (new, for flagging)
- Remove `documents`, `documentChunks`, `claims`, `evidenceLedger` tables

**New Schema**:

```typescript
// conversations - Chat conversation containers
conversations: defineTable({
  workspaceId: v.id("workspaces"),
  userId: v.string(),
  title: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_workspace", ["workspaceId"])
  .index("by_user", ["userId"])
  .index("by_workspace_updated", ["workspaceId", "updatedAt"]),

// messages - Individual messages in conversations
messages: defineTable({
  conversationId: v.id("conversations"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  mode: v.union(v.literal("quick"), v.literal("verified")),
  // Verification metadata (assistant messages only)
  verificationStatus: v.optional(v.union(
    v.literal("generating"),
    v.literal("reviewing"),
    v.literal("synthesizing"),
    v.literal("complete"),
    v.literal("error")
  )),
  revisionCount: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_conversation_time", ["conversationId", "createdAt"]),

// messageProgress - Real-time streaming progress
messageProgress: defineTable({
  messageId: v.id("messages"),
  phase: v.union(
    v.literal("generating"),
    v.literal("reviewing"),
    v.literal("synthesizing"),
    v.literal("complete"),
    v.literal("error")
  ),
  streamedContent: v.optional(v.string()),
  error: v.optional(v.string()),
  updatedAt: v.number(),
})
  .index("by_message", ["messageId"]),

// responseFeedback - User flags for inaccurate responses
responseFeedback: defineTable({
  messageId: v.id("messages"),
  userId: v.string(),
  feedbackType: v.union(
    v.literal("inaccurate"),
    v.literal("unhelpful"),
    v.literal("inappropriate"),
    v.literal("other")
  ),
  comment: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_user", ["userId"]),
```

### 1.2 Keep Existing Tables
- `workspaces` - No changes
- `workspaceMembers` - No changes

### 1.3 Migration Steps
1. Add new tables to schema
2. Deploy schema changes: `bunx convex deploy`
3. Old tables will be ignored (can remove later)

---

## Phase 2: Backend Pipeline

### 2.1 Create Chat Pipeline

**New File**: `convex/pipeline/chat.ts`

**Functions to create**:

```typescript
// 1. Generator - Initial response generation
export const generate = internalAction({
  args: {
    messageId: v.id("messages"),
    userMessage: v.string(),
    conversationHistory: v.array(v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Call GPT-5 Nano via OpenRouter
    // Stream response chunks to messageProgress
    // Return full response
  },
});

// 2. Critic - Review for issues
export const review = internalAction({
  args: {
    messageId: v.id("messages"),
    userMessage: v.string(),
    generatorResponse: v.string(),
    conversationHistory: v.array(...),
  },
  handler: async (ctx, args) => {
    // Call GLM 4.7 via OpenRouter
    // Return structured review: { issues: [], suggestions: [], needsRevision: bool }
  },
});

// 3. Synthesizer - Final verified response
export const synthesize = internalAction({
  args: {
    messageId: v.id("messages"),
    userMessage: v.string(),
    generatorResponse: v.string(),
    criticReview: v.object({
      issues: v.array(v.string()),
      suggestions: v.array(v.string()),
      needsRevision: v.boolean(),
    }),
    conversationHistory: v.array(...),
    revisionCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Call DeepSeek V3.2 Speciale via OpenRouter
    // Return: { finalResponse: string, needsRevision: bool, revisionInstructions?: string }
  },
});

// 4. Orchestrator - Coordinate all phases
export const processMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    mode: v.union(v.literal("quick"), v.literal("verified")),
  },
  handler: async (ctx, args) => {
    // Get conversation history
    // If quick mode: generate only
    // If verified mode: generate → review → synthesize → (revision loop max 2x)
    // Update message with final content
  },
});
```

### 2.2 Create Conversation Functions

**New File**: `convex/conversations.ts`

```typescript
// List conversations for workspace
export const list = query({...});

// Get single conversation with messages
export const get = query({...});

// Create new conversation
export const create = mutation({...});

// Delete conversation
export const remove = mutation({...});

// Update conversation title
export const updateTitle = mutation({...});
```

### 2.3 Create Message Functions

**New File**: `convex/messages.ts`

```typescript
// List messages in conversation
export const list = query({...});

// Get message with progress
export const getWithProgress = query({...});

// Send message (creates user message + triggers pipeline)
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    mode: v.union(v.literal("quick"), v.literal("verified")),
  },
  handler: async (ctx, args) => {
    // 1. Insert user message
    // 2. Create assistant message placeholder
    // 3. Create messageProgress record
    // 4. Schedule pipeline execution
    // Return assistant message ID
  },
});

// Submit feedback (flag inaccurate)
export const submitFeedback = mutation({...});
```

### 2.4 OpenRouter Integration

**Update File**: `convex/lib/openrouter.ts` (or create if doesn't exist)

```typescript
const MODELS = {
  generator: "openai/gpt-5-nano", // Verify exact model ID on OpenRouter
  critic: "thudm/glm-4-9b-chat", // Verify exact model ID
  synthesizer: "deepseek/deepseek-chat", // Verify exact model ID
};

export async function callLLM(
  model: keyof typeof MODELS,
  messages: Array<{ role: string; content: string }>,
  options?: { stream?: boolean; temperature?: number }
) {
  // OpenRouter API call with streaming support
}
```

### 2.5 Remove Old Pipeline Files

**Delete**:
- `convex/pipeline/writer.ts`
- `convex/pipeline/skeptic.ts`
- `convex/pipeline/judge.ts`
- `convex/pipeline/orchestrator.ts`
- `convex/pipeline/revise.ts`
- `convex/documents.ts`
- `convex/rag.ts`

---

## Phase 3: Frontend Updates

### 3.1 Update Chat Page

**File**: `src/pages/chat/ChatPage.tsx`

**Changes**:
- Replace session-based logic with conversation-based
- Use new `useConvexConversations` hook
- Update mode toggle default to "verified"
- Add revision indicator to messages
- Remove evidence ledger panel

### 3.2 Simplify Chat Interface

**File**: `src/components/chat/ChatInterface.tsx`

**Remove**:
- Evidence ledger panel (`EvidenceLedgerPanel`)
- Citation handling
- Document context display

**Add**:
- Verification status badge on assistant messages
- "Revised Nx" indicator when applicable
- Flag response button

### 3.3 Update Message Bubble

**File**: `src/components/chat/MessageBubble.tsx`

**Add**:
- Verification badge (when mode=verified)
- Revision count display
- Flag button for assistant messages

### 3.4 Create New Hooks

**New File**: `src/hooks/useConvexConversations.ts`

```typescript
export function useConvexConversations(workspaceId) {
  // Real-time conversation list
  // Create/delete conversations
}

export function useConvexMessages(conversationId) {
  // Real-time message list
  // Send message function
  // Submit feedback function
}

export function useMessageProgress(messageId) {
  // Real-time progress for streaming
}
```

### 3.5 Update Progress Indicator

**File**: `src/components/chat/StreamingIndicator.tsx` (or new component)

**New phases**:
```
[●○○] Generating response...
[●●○] Reviewing for accuracy...
[●●●] Finalizing verified answer...
```

### 3.6 Remove Document Components

**Delete entire directories**:
- `src/components/documents/`
- `src/components/evidence/`
- `src/pages/documents/`

**Delete files**:
- `src/hooks/useConvexDocuments.ts`

### 3.7 Update Routes

**File**: `src/App.tsx`

**Remove**:
```tsx
<Route path="documents" element={<DocumentLibraryPage />} />
```

**Keep/Update**:
```tsx
<Route path="chat" element={<ChatPage />} />
<Route path="chat/:conversationId" element={<ChatPage />} />
```

### 3.8 Update Workspace Home

**File**: `src/pages/workspace/WorkspaceHomePage.tsx`

**Remove**:
- Document stats card
- Document status badges
- Upload quick action

**Keep**:
- Conversation stats
- Start new chat action
- Recent conversations list

---

## Phase 4: Navigation & UI Cleanup

### 4.1 Update Sidebar

**File**: `src/components/layout/Sidebar.tsx`

**Remove**:
- Documents link
- Any document-related navigation

**Keep**:
- Chat/Conversations link
- Workspace switcher
- Settings

### 4.2 Update Header

**File**: `src/components/layout/Header.tsx`

**Update**:
- Remove any document-related actions
- Keep workspace switcher, theme toggle, user menu

### 4.3 Command Palette

**File**: `src/components/command/CommandPalette.tsx`

**Remove**:
- Document-related commands
- Upload commands

---

## Phase 5: Cleanup & Testing

### 5.1 Remove Unused Dependencies

**Update**: `package.json`

**Remove**:
```json
"mammoth": "^1.11.0",
"pdf-parse": "^2.4.5",
"pdfjs-dist": "^5.4.530",
"unpdf": "^1.4.0"
```

### 5.2 Update Tests

**Remove test files for**:
- Document upload
- Document processing
- Evidence ledger
- RAG search

**Update test files for**:
- Chat page (new conversation flow)
- Message sending
- Verification pipeline

### 5.3 Update Environment Variables

**File**: `.env.example`

**Keep**:
```bash
VITE_CONVEX_URL=https://...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_ISSUER_URL=https://...
OPENROUTER_API_KEY=sk-or-...
```

**Remove**:
```bash
# OPENAI_API_KEY (no longer needed for embeddings)
```

---

## Implementation Order

### Step 1: Schema First
1. Update `convex/schema.ts` with new tables
2. Deploy: `bunx convex deploy`
3. Verify tables created in Convex Dashboard

### Step 2: Backend Pipeline
1. Create `convex/lib/openrouter.ts` (if not exists)
2. Create `convex/pipeline/chat.ts`
3. Create `convex/conversations.ts`
4. Create `convex/messages.ts`
5. Test pipeline in isolation (Convex Dashboard)

### Step 3: Frontend Hooks
1. Create `src/hooks/useConvexConversations.ts`
2. Test hooks with simple component

### Step 4: Chat UI
1. Update `ChatPage.tsx`
2. Update `ChatInterface.tsx`
3. Update `MessageBubble.tsx`
4. Add verification indicators

### Step 5: Cleanup
1. Remove document components
2. Remove evidence components
3. Update routes
4. Update navigation
5. Remove unused files

### Step 6: Final
1. Remove unused dependencies
2. Update tests
3. Update documentation
4. Full E2E test

---

## Prompt Templates

### Generator Prompt (GPT-5 Nano)

```
You are a helpful AI assistant engaged in a conversation. Answer the user's question thoroughly, accurately, and conversationally.

## Conversation History
{conversationHistory}

## Current Message
User: {userMessage}

## Guidelines
- Be helpful and informative
- Use clear, natural language
- If uncertain about something, acknowledge it
- Provide relevant context and explanations

Respond:
```

### Critic Prompt (GLM 4.7)

```
You are a critical reviewer analyzing an AI assistant's response for accuracy and quality.

## Context
User's question: {userMessage}
Conversation history: {conversationHistory}

## Response to Review
{generatorResponse}

## Your Task
Analyze the response and identify:
1. Claims that may be inaccurate or uncertain
2. Logical inconsistencies or contradictions
3. Important missing caveats or qualifications
4. Overconfident statements about uncertain topics
5. Any information that seems outdated or incorrect

## Output Format (JSON)
{
  "issues": [
    {"type": "accuracy|logic|caveat|confidence|outdated", "description": "...", "quote": "..."}
  ],
  "suggestions": ["..."],
  "overallQuality": "good|acceptable|needs_revision",
  "needsRevision": true/false
}

Analyze:
```

### Synthesizer Prompt (DeepSeek V3.2 Speciale)

```
You are a final reviewer producing a verified response. You have the original response and a critical review. Your task is to produce the best possible answer.

## Context
User's question: {userMessage}
Conversation history: {conversationHistory}

## Original Response
{generatorResponse}

## Critical Review
{criticReview}

## Your Task
1. Address all issues identified in the review
2. Add appropriate uncertainty language where needed (e.g., "This may...", "Generally...", "As of my knowledge...")
3. Maintain helpfulness and readability
4. Do NOT simply repeat the original - integrate improvements naturally

## Revision Count
This is revision #{revisionCount}. {revisionCount >= 2 ? "This is the final revision - produce your best answer." : "If significant issues remain, indicate revision is needed."}

## Output Format (JSON)
{
  "finalResponse": "Your verified response here...",
  "needsRevision": true/false,
  "revisionReason": "..." // Only if needsRevision is true
}

Produce verified response:
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Model API failures | Retry logic with exponential backoff |
| Slow response times | Streaming + progress indicators |
| High costs (3x calls) | Quick mode option, usage monitoring |
| Quality degradation | Revision loop with quality gates |
| Breaking existing data | New tables, don't delete old until verified |

---

## Success Metrics

1. ✅ User can start a conversation and receive verified responses
2. ✅ Progress indicator shows all three phases
3. ✅ Revision count visible when applicable
4. ✅ Users can flag inaccurate responses
5. ✅ Quick mode works for fast responses
6. ✅ Full conversation history maintained
7. ✅ Real-time streaming works
8. ✅ Authentication and workspaces function correctly

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Schema Migration | ~1 hour |
| Backend Pipeline | ~4-6 hours |
| Frontend Hooks | ~2 hours |
| Chat UI Updates | ~3-4 hours |
| Cleanup & Removal | ~2 hours |
| Testing | ~2-3 hours |
| **Total** | **~14-18 hours** |

---

*Plan created: 2026-01-17*
*Status: Awaiting user approval to begin implementation*
