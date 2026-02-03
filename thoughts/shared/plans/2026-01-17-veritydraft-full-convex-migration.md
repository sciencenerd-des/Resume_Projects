# VerityDraft Full Convex Migration Implementation Plan

## Overview

This plan eliminates ALL hybrid and legacy approaches, migrating VerityDraft to a pure Convex full-stack architecture. The chat system will use Convex real-time subscriptions instead of WebSocket streaming, and all legacy Supabase-based hooks/services will be removed.

## Current State Analysis

### Architecture Issues Identified

1. **Hybrid Chat Architecture**: Chat uses WebSocket (Bun server) + Convex HTTP API, causing 404 errors
2. **Duplicate Hooks**: Both Supabase-based and Convex-based hooks coexist
3. **Legacy Services**: REST API service (`api.ts`) and Supabase service still present
4. **WebSocket Dependency**: Chat streaming relies on Bun WebSocket handler that calls Convex HTTP endpoints

### Key Discoveries

- `src/hooks/useWebSocket.ts:42` - WebSocket connects to `ws://localhost:8000/ws?token=${token}`
- `src/server/websocket/handler.ts:63` - WebSocket handler calls Convex HTTP API (returns 404)
- `convex/pipeline/orchestrator.ts:26-65` - Convex already has `startQuery` mutation that schedules pipeline
- `convex/sessions.ts:198-206` - Real-time `getProgress` query exists for pipeline tracking
- `src/hooks/useConvexSessions.ts:88-107` - `useStartQuery` hook already calls Convex mutation directly

## Desired End State

```
Frontend (React + Convex React)
    │
    ├── useQuery(api.sessions.getWithLedger) ─────── Real-time session data
    ├── useQuery(api.sessions.getProgress) ──────── Real-time pipeline progress
    ├── useMutation(api.pipeline.orchestrator.startQuery) ─── Start query
    └── useQuery(api.documents.list) ─────────────── Real-time documents
         │
         ▼
┌────────────────────────────────────────────────────────────────────┐
│                        Convex Backend                               │
├────────────────────────────────────────────────────────────────────┤
│  startQuery mutation                                                │
│       │                                                             │
│       └──► scheduler.runAfter(0, executePipeline)                  │
│               │                                                     │
│               └──► Updates pipelineProgress table (real-time)      │
│                       │                                             │
│                       ├──► Phase: retrieval → writer → skeptic     │
│                       ├──► Phase: judge → revision                  │
│                       └──► Updates session.response when complete   │
└────────────────────────────────────────────────────────────────────┘
```

### Verification

- [ ] No WebSocket code remains in frontend
- [ ] No Supabase imports in codebase
- [ ] No REST API calls in hooks/services
- [ ] Chat works via Convex real-time subscriptions
- [ ] Pipeline progress shows in real-time via `useQuery`
- [ ] All tests pass: `bun test`
- [ ] Type check passes: `bun run typecheck`

## What We're NOT Doing

- NOT adding new features
- NOT changing the LLM pipeline logic
- NOT modifying the Convex schema
- NOT changing the authentication flow (Clerk + Convex already works)
- NOT adding streaming text deltas (will show complete response when ready)

---

## Phase 1: Remove WebSocket and Migrate Chat to Convex

### Overview
Replace the WebSocket-based chat with Convex real-time subscriptions. The `useStartQuery` hook already exists and calls the correct Convex mutation.

### Changes Required

#### 1. Create New Chat Hook
**File**: `src/hooks/useConvexChat.ts` (NEW)

This hook combines session management, progress tracking, and query submission into a single interface for the chat page.

```typescript
/**
 * useConvexChat Hook
 * Pure Convex implementation for chat functionality
 * Replaces WebSocket-based streaming with Convex real-time subscriptions
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type QueryMode = "answer" | "draft";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isVerified?: boolean;
  sessionId?: Id<"sessions">;
}

export function useConvexChat(workspaceId: Id<"workspaces"> | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<Id<"sessions"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Convex mutation to start a query
  const startQueryMutation = useMutation(api.pipeline.orchestrator.startQuery);

  // Real-time progress subscription (only when there's an active session)
  const progress = useQuery(
    api.sessions.getProgress,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  // Real-time session data subscription
  const sessionData = useQuery(
    api.sessions.getWithLedger,
    activeSessionId ? { sessionId: activeSessionId } : "skip"
  );

  // Computed states
  const isProcessing = progress?.status === "in_progress" || progress?.status === "pending";
  const currentPhase = progress?.phase ?? "idle";

  // Handle session completion - add response to messages
  useEffect(() => {
    if (sessionData?.status === "completed" && sessionData.response && activeSessionId) {
      // Check if we already have this message
      const hasMessage = messages.some(m => m.sessionId === activeSessionId && m.role === "assistant");

      if (!hasMessage) {
        setMessages(prev => [
          ...prev,
          {
            id: activeSessionId,
            role: "assistant",
            content: sessionData.response,
            timestamp: new Date(sessionData.completedAt ?? Date.now()),
            isVerified: true,
            sessionId: activeSessionId,
          }
        ]);
        setActiveSessionId(null);
      }
    }

    // Handle errors
    if (sessionData?.status === "error" && activeSessionId) {
      setError(sessionData.errorMessage ?? "An error occurred");
      setActiveSessionId(null);
    }
  }, [sessionData, activeSessionId, messages]);

  // Submit a new query
  const submitQuery = useCallback(async (query: string, mode: QueryMode) => {
    if (!workspaceId || !query.trim()) return;

    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Start the query via Convex mutation
      const sessionId = await startQueryMutation({
        workspaceId,
        query: query.trim(),
        mode,
      });

      // Set active session to trigger real-time subscriptions
      setActiveSessionId(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start query");
    }
  }, [workspaceId, startQueryMutation]);

  // Get ledger for the active session
  const ledger = sessionData?.ledger ?? null;

  return {
    // State
    messages,
    isProcessing,
    currentPhase,
    ledger,
    error,
    activeSessionId,

    // Progress details
    progress,

    // Actions
    submitQuery,
    clearError: () => setError(null),
    clearMessages: () => setMessages([]),
  };
}
```

#### 2. Update ChatPage to Use New Hook
**File**: `src/pages/chat/ChatPage.tsx`

Replace WebSocket logic with the new Convex-based hook.

```typescript
// REMOVE these imports:
// import { useWebSocket } from '../../hooks/useWebSocket';

// ADD this import:
import { useConvexChat } from '../../hooks/useConvexChat';
import type { Id } from '../../../convex/_generated/dataModel';

export default function ChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();

  // REPLACE WebSocket hook with Convex hook
  const isValidConvexId = workspaceId && !workspaceId.includes('-') && workspaceId.length > 0;
  const convexWorkspaceId = isValidConvexId ? workspaceId as Id<"workspaces"> : undefined;

  const {
    messages,
    isProcessing,
    currentPhase,
    ledger,
    error,
    progress,
    submitQuery,
    clearError,
  } = useConvexChat(convexWorkspaceId);

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<QueryMode>('answer');

  // Check if workspace has documents
  const documents = useQuery(
    api.documents.list,
    isValidConvexId ? { workspaceId: workspaceId as Id<"workspaces"> } : "skip"
  );

  const hasDocuments = (documents ?? []).length > 0;
  const readyDocuments = (documents ?? []).filter((d) => d.status === 'ready').length;

  // REMOVE the entire WebSocket useEffect block (lines 46-188)

  const handleSubmit = useCallback(() => {
    if (!query.trim() || isProcessing) return;
    submitQuery(query.trim(), mode);
    setQuery('');
  }, [query, mode, isProcessing, submitQuery]);

  // Map progress phase to pipeline phase for UI
  const pipelinePhase = isProcessing ? (currentPhase as PipelinePhase) : 'idle';
  const chunksRetrieved = progress?.details?.match(/(\d+) chunks/)?.[1] ?? 0;

  // ... rest of component remains similar but without WebSocket logic
}
```

#### 3. Delete WebSocket Hook
**File**: `src/hooks/useWebSocket.ts` - DELETE ENTIRELY

#### 4. Delete WebSocket Handler
**File**: `src/server/websocket/handler.ts` - DELETE ENTIRELY

#### 5. Update Bun Server to Remove WebSocket
**File**: `src/index.ts`

```typescript
// REMOVE these imports:
// import { handleWebSocket, type WSData } from "./server/websocket/handler";

// REMOVE websocket config from Bun.serve:
Bun.serve({
  port: PORT,

  routes: {
    // Keep all existing routes
    "/": indexHtml,
    "/login": indexHtml,
    // ... etc
  },

  // REMOVE the fetch handler that handles /ws upgrade
  // REMOVE the websocket config entirely
});
```

### Success Criteria

#### Automated Verification:
- [ ] No imports of `useWebSocket` in codebase: `grep -r "useWebSocket" src/`
- [ ] No WebSocket handler files exist: `ls src/server/websocket/`
- [ ] Type check passes: `bun run typecheck`
- [ ] Build succeeds: `bun build src/frontend.tsx`

#### Manual Verification:
- [ ] Chat page loads without errors
- [ ] Submitting a query creates a session
- [ ] Pipeline progress shows in real-time (phases update)
- [ ] Response appears when pipeline completes
- [ ] Evidence ledger displays correctly

---

## Phase 2: Remove Legacy Hooks and Services

### Overview
Delete all Supabase-based hooks and the legacy REST API service. Components should already be using Convex hooks.

### Changes Required

#### 1. Delete Legacy Hooks
**Files to DELETE**:
- `src/hooks/useAuth.ts` - Uses Supabase auth
- `src/hooks/useDocuments.ts` - Uses REST API
- `src/hooks/useWorkspace.ts` - Uses REST API
- `src/hooks/useSessions.ts` - Uses REST API

#### 2. Delete Legacy Services
**Files to DELETE**:
- `src/services/api.ts` - REST API calls using Supabase auth
- `src/services/supabase.ts` - Supabase client

#### 3. Delete Legacy Config Service
**File**: `src/services/config.ts`

Check if this is still needed. If it only fetches Supabase config, delete it.

#### 4. Update Any Remaining Legacy Imports

Search and update any components that might still import deleted hooks:

**Check these files for legacy imports**:
- `src/components/workspace/WorkspaceSwitcher.tsx` - Line 5 imports `api` from services

```typescript
// REPLACE:
// import { api } from '../../services/api';

// WITH:
import { useMutation } from 'convex/react';
import { api as convexApi } from '../../../convex/_generated/api';

// In component:
const createWorkspaceMutation = useMutation(convexApi.workspaces.create);
```

#### 5. Remove TanStack Query Provider (if not needed elsewhere)
**File**: `src/frontend.tsx`

Check if any components still use TanStack Query. If not, remove the provider.

```typescript
// REMOVE if not needed:
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// const queryClient = new QueryClient();
```

### Success Criteria

#### Automated Verification:
- [ ] No Supabase imports: `grep -r "supabase" src/ --include="*.ts" --include="*.tsx"`
- [ ] No legacy hook imports: `grep -r "from.*useAuth\|from.*useSessions\|from.*useDocuments\|from.*useWorkspace" src/`
- [ ] No TanStack Query imports (unless needed): `grep -r "tanstack" src/`
- [ ] Type check passes: `bun run typecheck`

#### Manual Verification:
- [ ] App loads without console errors
- [ ] Workspace switching works
- [ ] Document library works
- [ ] All existing Convex functionality unchanged

---

## Phase 3: Remove Legacy Server Endpoints

### Overview
Remove the Bun server's REST API endpoints that were used by legacy hooks.

### Changes Required

#### 1. Remove REST API Handler
**File**: `src/server/api.ts` - DELETE or simplify

The API handler was used for:
- `/api/workspaces` - Now handled by Convex queries/mutations
- `/api/documents` - Now handled by Convex queries/mutations
- `/api/sessions` - Now handled by Convex queries/mutations

If the file is only for legacy REST endpoints, delete it entirely.

#### 2. Update Bun Server Routes
**File**: `src/index.ts`

```typescript
// REMOVE:
// import { handleApiRequest } from "./server/api";

Bun.serve({
  port: PORT,

  routes: {
    // KEEP these static routes
    "/": indexHtml,
    "/login": indexHtml,
    "/login/*": indexHtml,
    "/signup": indexHtml,
    "/signup/*": indexHtml,
    "/workspaces": indexHtml,
    "/workspaces/*": indexHtml,
    "/sessions/*": indexHtml,

    // KEEP health check
    "/health": () => new Response(...),

    // KEEP app config (for Convex + Clerk URLs)
    "/api/app-config": () => new Response(...),

    // REMOVE legacy API handler:
    // "/api/*": (request: Request) => handleApiRequest(request),
  },
});
```

#### 3. Remove Convex HTTP Routes (No longer needed)
**File**: `convex/http.ts`

The HTTP routes were used for the Bun server to call Convex. Since we're now using Convex directly from the frontend, these can be simplified or removed.

```typescript
// REMOVE or simplify to only essential routes
// The /api/sessions, /api/claims, /api/ledger, /api/progress routes
// were for the WebSocket handler - no longer needed
```

#### 4. Remove Server Pipeline Orchestrator
**File**: `src/server/pipeline/orchestrator.ts` - DELETE

This file duplicates the Convex pipeline. All pipeline logic should be in `convex/pipeline/orchestrator.ts`.

### Success Criteria

#### Automated Verification:
- [ ] No REST API handler: `ls src/server/api.ts` should not exist
- [ ] No server pipeline: `ls src/server/pipeline/` should be empty or not exist
- [ ] Type check passes: `bun run typecheck`
- [ ] Server starts: `bun src/index.ts`

#### Manual Verification:
- [ ] Frontend loads correctly
- [ ] No 404 errors in console
- [ ] Pipeline executes via Convex scheduler

---

## Phase 4: Cleanup and Verification

### Overview
Final cleanup, remove unused dependencies, and verify everything works.

### Changes Required

#### 1. Update package.json
Remove unused dependencies:
```json
{
  "dependencies": {
    // REMOVE:
    // "@supabase/supabase-js": "...",
    // "@tanstack/react-query": "..." (if not used)
  }
}
```

#### 2. Update Environment Variables
**File**: `.env.example`

```bash
# REMOVE legacy Supabase variables:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...

# KEEP Convex + Clerk variables:
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
```

#### 3. Update TypeScript Config
**File**: `tsconfig.json`

Verify path mappings are correct for Convex imports.

#### 4. Run Full Test Suite
```bash
bun test
```

#### 5. Run E2E Tests
```bash
bunx playwright test
```

### Success Criteria

#### Automated Verification:
- [ ] All unit tests pass: `bun test`
- [ ] E2E tests pass: `bunx playwright test`
- [ ] Type check passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] Build succeeds: `bun build src/frontend.tsx`
- [ ] No unused dependencies: `bunx depcheck`

#### Manual Verification:
- [ ] Full user flow works: Login → Create workspace → Upload document → Ask question → See response with ledger
- [ ] Real-time updates work (progress phases visible)
- [ ] No console errors or warnings
- [ ] Network tab shows only Convex WebSocket (no REST calls)

---

## Testing Strategy

### Unit Tests
Update test files in `tests/unit/` to use Convex mocks:
- Remove Supabase mocks
- Remove TanStack Query mocks
- Use `convex-test` for Convex function testing

### Integration Tests
Update `tests/integration/` to:
- Test Convex hook behavior
- Test real-time subscription updates
- Test pipeline execution flow

### Manual Testing Steps
1. Login with Clerk
2. Create a new workspace
3. Upload a PDF document
4. Wait for processing to complete
5. Go to Chat page
6. Enter a question and submit
7. Verify pipeline phases show in real-time
8. Verify response appears with evidence ledger
9. Submit feedback on a claim
10. Delete session
11. Switch workspaces

---

## Performance Considerations

### Convex Real-Time Subscriptions
- Convex optimistically updates the UI
- No WebSocket connection management needed
- Automatic reconnection handled by Convex client

### Pipeline Progress
- Progress updates via Convex table mutations
- `useQuery` subscription triggers re-render when progress changes
- Consider debouncing UI updates if progress changes rapidly

### Bundle Size
- Removing Supabase client reduces bundle
- Removing TanStack Query reduces bundle (if not used)

---

## Migration Notes

### Data Migration
No data migration needed - Convex is already the source of truth for all data.

### Authentication
No changes - Clerk + Convex auth already works correctly.

### Rollback Plan
If issues arise:
1. Revert to previous commit
2. Re-enable WebSocket handler
3. Re-enable legacy hooks

---

## References

- Research document: `/thoughts/shared/research/2026-01-17-veritydraft-frontend-convex-integration.md`
- Convex docs: https://docs.convex.dev
- Existing Convex pipeline: `convex/pipeline/orchestrator.ts`
- Existing Convex hooks: `src/hooks/useConvexSessions.ts`
