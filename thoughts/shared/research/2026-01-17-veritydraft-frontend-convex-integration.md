---
date: 2026-01-17T14:51:20+0530
researcher: biswajitmondal
git_commit: 09249e99292f5d969e8ad4d04413598b6f486731
branch: feature/veritydraft-convex-migration
repository: Resume_Projects
topic: "VerityDraft Frontend Convex Integration Status"
tags: [research, codebase, convex, frontend, react, clerk, websocket]
status: complete
last_updated: 2026-01-17
last_updated_by: biswajitmondal
---

# Research: VerityDraft Frontend Convex Integration Status

**Date**: 2026-01-17T14:51:20+0530
**Researcher**: biswajitmondal
**Git Commit**: 09249e99292f5d969e8ad4d04413598b6f486731
**Branch**: feature/veritydraft-convex-migration
**Repository**: Resume_Projects

## Research Question

Has the frontend been appropriately refactored to work with the Convex backend migration? What issues exist in the current integration?

## Summary

The frontend has been **partially migrated** to Convex with a hybrid architecture:

1. **Fully Migrated to Convex**: Authentication (Clerk), Workspaces, Documents
2. **Hybrid Architecture**: Chat uses WebSocket for streaming + Convex for document queries
3. **Legacy Code Still Present**: Duplicate hooks exist (Supabase-based + Convex-based)
4. **Critical Issue Found**: Chat sends messages via WebSocket, but the Bun server's WebSocket handler calls Convex HTTP endpoints that return 404 errors

## Detailed Findings

### 1. Provider Architecture (Correctly Implemented)

**File**: `src/frontend.tsx` (lines 48-59)
**File**: `src/contexts/ConvexClerkProvider.tsx` (lines 32-40)

The provider hierarchy follows Convex documentation correctly:
```
ConvexClerkProvider (ClerkProvider + ConvexProviderWithClerk)
  └── BrowserRouter
        └── ThemeProvider
              └── WorkspaceProvider
                    └── CommandProvider
                          └── App
```

- Uses `ConvexProviderWithClerk` from `convex/react-clerk`
- Passes Clerk's `useAuth` hook to Convex provider
- Config loaded via `window.__APP_CONFIG__` injected by server

### 2. Hooks - Duplicate Implementations Exist

**Convex Hooks (New)**:
| Hook | File | Lines | Purpose |
|------|------|-------|---------|
| `useConvexAuth` | `src/hooks/useConvexAuth.ts` | 10-40 | Wraps Clerk auth with Convex |
| `useConvexDocuments` | `src/hooks/useConvexDocuments.ts` | 11-110 | Real-time document queries |
| `useConvexWorkspace` | `src/hooks/useConvexWorkspace.ts` | 11-84 | Real-time workspace queries |
| `useConvexSessions` | `src/hooks/useConvexSessions.ts` | 12-107 | Real-time session queries |

**Legacy Hooks (Still Present)**:
| Hook | File | Backend |
|------|------|---------|
| `useAuth` | `src/hooks/useAuth.ts` | Supabase + TanStack Query |
| `useDocuments` | `src/hooks/useDocuments.ts` | REST API + TanStack Query |
| `useWorkspace` | `src/hooks/useWorkspace.ts` | REST API + TanStack Query |
| `useSessions` | `src/hooks/useSessions.ts` | REST API + TanStack Query |

**WebSocket Hook**:
- `useWebSocket` (`src/hooks/useWebSocket.ts`) - Uses Clerk auth token for WebSocket connection

### 3. Components Using Convex

**Direct Convex Hook Usage**:
- `src/components/auth/AuthGuard.tsx` - Lines 3-4, 8-10
- `src/components/documents/DocumentLibrary.tsx` - Lines 3, 15
- `src/components/documents/DocumentUpload.tsx` - Lines 6, 24
- `src/components/layout/AppLayout.tsx` - Lines 14, 16, 21, 23
- `src/components/layout/Sidebar.tsx` - Lines 11, 17
- `src/components/command/CommandPalette.tsx` - Lines 18-19, 30-31

**Legacy API Usage Still Present**:
- `src/components/workspace/WorkspaceSwitcher.tsx` - Line 5, 118
  - Uses `api.createWorkspace()` from REST API service instead of Convex mutation

### 4. Chat Page - Hybrid Architecture

**File**: `src/pages/chat/ChatPage.tsx`

The chat page uses TWO data sources:
1. **Convex** (lines 37-40): Queries `api.documents.list` to check document availability
2. **WebSocket** (lines 21, 46-188): All chat interactions go through WebSocket

**WebSocket Event Flow**:
```
User sends message → WebSocket.send({ type: 'query', payload: {...} })
                   ↓
WebSocket handler on Bun server (src/server/websocket/handler.ts)
                   ↓
Calls Convex HTTP API → /api/sessions (POST) → 404 ERROR
```

### 5. Critical Issue: Convex HTTP API 404

**Observed Behavior**:
- When sending a chat message, the error "Convex API error: 404 -" appears
- The error originates from WebSocket handler trying to call Convex HTTP endpoints

**Root Cause Analysis**:

The Bun server's WebSocket handler (`src/server/websocket/handler.ts`) calls:
```typescript
const CONVEX_URL = process.env.CONVEX_URL || "https://your-deployment.convex.cloud";

async function createSession(...): Promise<string> {
  const result = await callConvexApi<{ sessionId: string }>("/api/sessions", {...});
  return result.sessionId;
}
```

This expects HTTP routes at `CONVEX_URL/api/sessions`, but the Convex HTTP router (`convex/http.ts`) may not be correctly configured or deployed.

**HTTP Router Definition** (`convex/http.ts`):
```typescript
http.route({
  path: "/api/sessions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {...}),
});
```

### 6. Authentication Flow

**Correctly Implemented**:
- `AuthGuard.tsx` uses triple auth check: `useConvexAuthState()`, `useClerkAuth()`, `useConvexAuth()`
- Detects Clerk/Convex JWT mismatch and shows configuration instructions
- WebSocket hook gets Clerk token via `getToken()` for connection auth

**Token Flow**:
```
Clerk SignIn → JWT Token → ConvexProviderWithClerk validates → useConvexAuth().isAuthenticated
                        → useWebSocket() attaches to WS URL as query param
```

### 7. Workspace Context

**File**: `src/contexts/WorkspaceContext.tsx`

- Uses `useQuery(api.workspaces.list)` for real-time workspace list (line 84-87)
- Uses `useQuery(api.workspaces.get)` for current workspace details (line 90-95)
- Validates Convex ID format (rejects legacy UUID format with dashes)
- Persists current workspace in localStorage

### 8. Data Fetching Patterns

**Pattern 1: Direct Convex Query** (WorkspaceHomePage)
```typescript
const documents = useQuery(
  api.documents.list,
  isValidConvexId ? { workspaceId } : "skip"
);
```

**Pattern 2: Custom Convex Hook** (DocumentLibrary)
```typescript
const { documents, uploadDocument, deleteDocument } = useConvexDocuments(workspaceId);
```

**Pattern 3: WebSocket Streaming** (ChatPage)
```typescript
const { send, on, off } = useWebSocket();
send({ type: 'query', payload: { workspace_id, query, mode } });
```

**Pattern 4: Legacy REST** (SessionViewPage)
```typescript
const { data: session } = useQuery({
  queryKey: ['session', sessionId],
  queryFn: () => api.getSession(sessionId),
});
```

## Code References

### Convex Integration Points
- `src/services/convex.ts:35` - Convex client initialization
- `src/contexts/ConvexClerkProvider.tsx:32-40` - Provider setup
- `src/hooks/useConvexAuth.ts:10-40` - Auth state wrapper

### WebSocket Integration
- `src/hooks/useWebSocket.ts:30-75` - WebSocket connection logic
- `src/pages/chat/ChatPage.tsx:46-188` - WebSocket event handlers
- `src/server/websocket/handler.ts:72-163` - Server-side WebSocket handler

### HTTP API Calls (Server → Convex)
- `src/server/websocket/handler.ts:33-52` - `callConvexApi()` function
- `src/server/pipeline/orchestrator.ts:17-36` - Pipeline's Convex API calls
- `convex/http.ts` - HTTP route definitions

## Architecture Documentation

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐    │
│  │ ClerkAuth  │───▶│  Convex    │───▶│  Real-time Queries │    │
│  │  Provider  │    │  Provider  │    │  (workspaces,docs) │    │
│  └────────────┘    └────────────┘    └────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    ChatPage                              │    │
│  │  ┌──────────┐         ┌─────────────────────────────┐   │    │
│  │  │ Convex   │         │       WebSocket            │   │    │
│  │  │ useQuery │         │  (streaming chat via Bun)   │   │    │
│  │  │(doc list)│         │                             │   │    │
│  │  └──────────┘         └─────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    WebSocket Connection (ws://localhost:8000/ws)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Bun Server (index.ts)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              WebSocket Handler                            │   │
│  │  - Validates Clerk JWT token                              │   │
│  │  - Creates session via Convex HTTP API  ◀── 404 ERROR    │   │
│  │  - Executes pipeline                                      │   │
│  │  - Streams events back to client                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                     │
│              HTTP POST to CONVEX_URL/api/sessions               │
│                            ▼                                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Backend                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │ HTTP Routes │     │  Mutations  │     │    Queries      │   │
│  │ (http.ts)   │     │             │     │                 │   │
│  │  /api/*     │     │ sessions.*  │     │ sessions.list   │   │
│  │             │     │ documents.* │     │ documents.list  │   │
│  └─────────────┘     └─────────────┘     └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Issues Identified

1. **HTTP Route 404**: The Bun server's WebSocket handler cannot reach Convex HTTP endpoints
2. **Duplicate Hooks**: Both Supabase-based and Convex-based hooks exist, causing confusion
3. **Legacy API Usage**: WorkspaceSwitcher still uses REST API for workspace creation
4. **SessionViewPage**: Uses legacy REST API instead of Convex queries

## Related Research

- `/thoughts/shared/research/2026-01-17-veritydraft-convex-migration-analysis.md`
- `/thoughts/shared/plans/2026-01-17-veritydraft-convex-migration.md`

## Open Questions

1. Is the Convex HTTP router (`convex/http.ts`) properly deployed to the development deployment?
2. Does `CONVEX_URL` in `.env` point to the correct `.convex.site` URL (not `.convex.cloud`)?
3. Is the `INTERNAL_API_KEY` environment variable set in both the Bun server and Convex environment?
4. Should the chat flow be migrated to use Convex actions/mutations directly instead of WebSocket + HTTP API?
