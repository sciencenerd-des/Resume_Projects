---
date: 2026-01-17T00:12:00+0530
researcher: Biswajit Mondal
git_commit: 656868236287c6c510ed71acb05e0d0f82f1d60f
branch: feature/veritydraft-dark-theme-frontend
repository: project_profile
topic: "VerityDraft Backend & Database Analysis for Convex Migration"
tags: [research, codebase, backend, database, convex, supabase, postgresql, bun, websocket, rag]
status: complete
last_updated: 2026-01-17
last_updated_by: Biswajit Mondal
---

# Research: VerityDraft Backend & Database Analysis for Convex Migration

**Date**: 2026-01-17T00:12:00+0530
**Researcher**: Biswajit Mondal
**Git Commit**: 656868236287c6c510ed71acb05e0d0f82f1d60f
**Branch**: feature/veritydraft-dark-theme-frontend
**Repository**: project_profile

## Research Question

Document the current backend and database architecture of VerityDraft (Project_4) to understand the scope of refactoring to Convex.

## Summary

VerityDraft is an Evidence-Ledger Copilot built on:
- **Runtime**: Bun.serve() with WebSocket support
- **Database**: Supabase (PostgreSQL + pgvector for vector embeddings)
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: WebSocket streaming + Server-Sent Events (SSE)
- **LLM Pipeline**: 3-LLM adversarial verification (Writer → Skeptic → Judge)

The architecture consists of 8 database tables, 21 server-side files, 6 SECURITY DEFINER functions, and a streaming pipeline orchestrator.

---

## 1. Database Schema

### 1.1 Tables Overview

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| `workspaces` | Tenant isolation | id, name, owner_id, settings | 1:many → documents, sessions |
| `workspace_members` | Access control | workspace_id, user_id, role | Junction: user ↔ workspace |
| `documents` | Document metadata | id, workspace_id, filename, status, chunk_count | 1:many → chunks |
| `document_chunks` | RAG content + embeddings | id, document_id, chunk_hash, content, embedding | Used in vector search |
| `sessions` | Query/response tracking | id, workspace_id, query, mode, response, evidence_coverage | 1:many → claims |
| `claims` | Extracted claims | id, session_id, claim_text, claim_type, importance | 1:1 → evidence_ledger |
| `evidence_ledger` | Verification results | id, session_id, claim_id, verdict, confidence_score, chunk_ids | Links claims to evidence |
| `session_feedback` | User feedback | id, session_id, feedback_type, comment | Optional feedback |

### 1.2 Schema Files

- `Project_4/supabase/migrations/001_initial_schema.sql` - Core tables, indexes, triggers
- `Project_4/supabase/migrations/002_rls_policies.sql` - Row-Level Security policies
- `Project_4/supabase/migrations/003_functions.sql` - Database functions (match_chunks, etc.)
- `Project_4/supabase/migrations/008-012_*.sql` - SECURITY DEFINER helper functions

### 1.3 Vector Search Infrastructure

**pgvector Configuration:**
- Extension: `vector` (pgvector)
- Embedding dimension: 1536 (OpenAI text-embedding-3-small)
- Column: `document_chunks.embedding vector(1536)`
- Index: HNSW with cosine similarity (`vector_cosine_ops`, m=16, ef_construction=64)

**match_chunks() Function:**
```sql
match_chunks(
  query_embedding vector(1536),
  workspace_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
```
- Uses cosine distance operator: `<=>`
- Filters by workspace boundary and document status='ready'
- Returns: chunk_id, document_id, chunk_hash, content, heading_path, page_number, similarity

### 1.4 Row-Level Security (RLS)

All 8 tables have RLS enabled. Access pattern:
- Workspace-based isolation via `workspace_members` junction table
- Query pattern: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())`
- Cascading policies: documents → chunks, sessions → claims → evidence_ledger

### 1.5 SECURITY DEFINER Functions

| Function | Purpose | File |
|----------|---------|------|
| `create_workspace_for_user()` | Atomic workspace + membership creation | `008_create_workspace_function.sql` |
| `upload_document_for_user()` | Document creation with access validation | `009_create_document_upload_function.sql` |
| `update_document_status()` | Status updates for async workers | `010_create_document_status_function.sql` |
| `insert_document_chunks()` | Bulk chunk insertion with type conversion | `011_create_insert_chunks_function.sql` |
| `match_chunks()` | Vector similarity search | `003_functions.sql` |
| `search_chunks_text()` | Full-text search fallback | `003_functions.sql` |

---

## 2. Server Architecture

### 2.1 Entry Point

**File**: `Project_4/src/index.ts`

```typescript
Bun.serve({
  port: process.env.PORT || 8000,
  routes: {
    "/": indexHtml,           // SPA frontend
    "/api/*": handleApiRequest,
    "/health": healthCheck,
    "/api/config": publicConfig,
  },
  fetch(request) {
    // WebSocket upgrade at /ws
    if (url.pathname === "/ws") {
      server.upgrade(request, { data: { token } });
    }
  },
  websocket: handleWebSocket,
});
```

### 2.2 Directory Structure

```
Project_4/src/server/
├── api/                      # REST API handlers
│   ├── index.ts             # Router with regex pattern matching
│   ├── workspaces.ts        # CRUD for workspaces
│   ├── documents.ts         # Upload, list, delete documents
│   ├── sessions.ts          # Session management, ledger retrieval
│   └── query.ts             # Query submission (SSE streaming)
├── middleware/
│   ├── auth.ts              # JWT validation, requireAuth()
│   ├── rate-limit.ts        # Request rate limiting
│   └── error-handler.ts     # Error formatting
├── websocket/
│   └── handler.ts           # WebSocket connection management
├── db/
│   └── index.ts             # Supabase client factory
├── pipeline/
│   └── orchestrator.ts      # 3-LLM verification pipeline
├── llm/
│   ├── openrouter.ts        # OpenRouter API client
│   └── prompts.ts           # Writer/Skeptic/Judge prompts
├── rag/
│   ├── retrieval.ts         # Vector search operations
│   └── context.ts           # Context assembly for LLM
└── processing/
    ├── document-processor.ts # Document processing orchestration
    ├── chunker.ts           # Text chunking logic
    ├── embeddings.ts        # OpenAI embedding generation
    └── extractors/
        ├── pdf.ts           # PDF text extraction
        └── docx.ts          # DOCX text extraction
```

### 2.3 API Routes

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| GET | `/api/workspaces` | `workspaces.list` | List user's workspaces |
| POST | `/api/workspaces` | `workspaces.create` | Create workspace |
| GET | `/api/workspaces/:id` | `workspaces.get` | Get workspace |
| PUT | `/api/workspaces/:id` | `workspaces.update` | Update workspace |
| DELETE | `/api/workspaces/:id` | `workspaces.remove` | Delete workspace |
| GET | `/api/workspaces/:id/documents` | `documents.list` | List documents |
| POST | `/api/workspaces/:id/documents` | `documents.upload` | Upload document |
| GET | `/api/documents/:id` | `documents.get` | Get document |
| GET | `/api/documents/:id/chunks` | `documents.getChunks` | Get chunks (paginated) |
| DELETE | `/api/documents/:id` | `documents.remove` | Delete document |
| GET | `/api/workspaces/:id/sessions` | `sessions.list` | List sessions |
| GET | `/api/sessions/:id` | `sessions.get` | Get session |
| GET | `/api/sessions/:id/messages` | `sessions.getMessages` | Reconstruct messages |
| GET | `/api/sessions/:id/ledger` | `sessions.getLedger` | Get evidence ledger |
| GET | `/api/sessions/:id/export` | `sessions.exportSession` | Export (JSON/Markdown) |
| DELETE | `/api/sessions/:id` | `sessions.remove` | Delete session |
| POST | `/api/workspaces/:id/query` | `query.submit` | Submit query (SSE) |

---

## 3. Authentication

### 3.1 Flow

1. **Client** sends `Authorization: Bearer <jwt>` header
2. **Middleware** calls `validateAuth()`:
   - Extracts token from header
   - Calls `supabase.auth.getUser(token)` to validate
   - Returns `AuthUser { id, email, accessToken }`
3. **Handler** uses `createAuthenticatedClient(accessToken)` for RLS-scoped queries

### 3.2 Dual Client Strategy

| Client | Use Case | Key |
|--------|----------|-----|
| `supabaseAdmin` | System operations (bypass RLS) | Service role key |
| `createAuthenticatedClient(token)` | User-scoped operations | Anon key + user JWT |

### 3.3 WebSocket Authentication

1. Token passed in query param: `ws://host/ws?token=<jwt>`
2. Fast JWT parsing via `extractUserIdFromToken()` (no network call)
3. Fallback to `supabase.auth.getUser()` if fast parsing fails

---

## 4. Real-time Streaming

### 4.1 WebSocket Messages

| Event Type | Direction | Payload |
|------------|-----------|---------|
| `connected` | Server→Client | `{ timestamp }` |
| `session_created` | Server→Client | `{ session_id }` |
| `content_chunk` | Server→Client | `{ delta, citations? }` |
| `claim_verified` | Server→Client | `{ claim: LedgerEntry }` |
| `ledger_updated` | Server→Client | `{ ledger: EvidenceLedger }` |
| `generation_complete` | Server→Client | `{ session_id, metrics }` |
| `error` | Server→Client | `{ message }` |
| `query` | Client→Server | `{ workspace_id, query, mode }` |
| `cancel` | Client→Server | `{ session_id }` |
| `ping` | Client→Server | `{}` |

### 4.2 SSE Alternative

HTTP endpoint `/api/workspaces/:id/query` supports:
- `Accept: text/event-stream` → Returns SSE stream
- Otherwise → Returns JSON with final result

SSE format:
```
event: content_chunk
data: {"delta":"text...","citations":[]}

event: generation_complete
data: {"session_id":"...","metrics":{}}

event: done
data: {}
```

### 4.3 Connection Management

- `connections: Map<userId, WebSocket>` - Active connections
- `activePipelines: Map<sessionId, AbortController>` - Cancellation support
- Client can send `{ type: "cancel" }` to abort running pipeline

---

## 5. LLM Pipeline

### 5.1 Pipeline Flow

```
User Query
    ↓
Retrieve chunks (pgvector similarity search)
    ↓
Writer (GPT-4o-mini, temp=0.7) → Response with [cite:hash] anchors
    ↓
Skeptic (Claude-3-Haiku, temp=0.3) → Critical analysis
    ↓
Judge (GPT-4o-mini, temp=0.2) → Verification + Evidence Ledger
    ↓
[Optional] Revision loop (max 2 cycles)
    ↓
Store results → Return to client
```

### 5.2 Pipeline Orchestrator

**File**: `Project_4/src/server/pipeline/orchestrator.ts`

```typescript
async function* executePipeline(
  sessionId: string,
  query: string,
  workspaceId: string,
  mode: "answer" | "draft"
): AsyncGenerator<PipelineEvent>
```

Key constants:
- `MAX_REVISION_CYCLES = 2`
- Retrieval threshold: `0.3`
- Max chunks: `15`
- Context token limit: `50,000`

### 5.3 Quality Gates

Judge evaluates:
- Evidence coverage ≥ 85% of material/critical claims
- No contradicted critical claims
- Unsupported rate ≤ 5%

If gates fail → `revision_needed: true` → Writer revises

### 5.4 Verdict Types

| Verdict | Confidence | Meaning |
|---------|------------|---------|
| `supported` | > 0.8 | Strong evidence match |
| `weak` | 0.5 - 0.8 | Partial evidence |
| `contradicted` | - | Evidence conflicts with claim |
| `not_found` | < 0.5 | No relevant evidence |

---

## 6. Document Processing

### 6.1 Upload Flow

1. Client uploads file (multipart/form-data)
2. Server validates type (PDF/DOCX) and size (≤50MB)
3. Creates document record (status='processing')
4. Returns immediately to client
5. Background: `processDocument()` extracts text, chunks, generates embeddings
6. Updates status to 'ready' or 'error'

### 6.2 Chunking Strategy

- Chunk size: 1500 characters
- Overlap: 100 characters
- Content hash for stable IDs
- Preserves heading path for context

### 6.3 Embedding Generation

```typescript
// OpenAI text-embedding-3-small
generateEmbedding(text: string): Promise<number[]>  // 1536 dimensions
generateEmbeddings(texts: string[]): Promise<number[][]>  // Batch
```

---

## 7. Services Layer

### 7.1 Client-Side Services

| File | Purpose |
|------|---------|
| `src/services/api.ts` | REST API client with `fetchWithAuth()` |
| `src/services/websocket.ts` | WebSocket service singleton |
| `src/services/supabase.ts` | Supabase client initialization |
| `src/services/config.ts` | Runtime configuration from `/api/config` |

### 7.2 External Integrations

| Service | File | Purpose |
|---------|------|---------|
| OpenRouter | `src/server/llm/openrouter.ts` | LLM API (GPT-4o-mini, Claude-3-Haiku) |
| OpenAI | `src/server/processing/embeddings.ts` | Embeddings API |
| Supabase | `src/server/db/index.ts` | Database + Auth |
| Supabase Storage | (via documents.ts) | File storage |

---

## 8. Type Definitions

### 8.1 Core Entities

**File**: `Project_4/src/types/index.ts`

```typescript
interface Workspace { id, name, owner_id, created_at, updated_at }
interface Document { id, workspace_id, filename, file_type, status, chunk_count, tags? }
interface Chunk { id, document_id, content, chunk_hash, page_number?, heading_path }
interface ChatSession { id, workspace_id, query, mode, status }
interface LedgerEntry { id, claim_text, claim_type, importance, verdict, confidence, chunk_ids }
interface EvidenceLedger { session_id, summary, entries, risk_flags }
```

### 8.2 WebSocket Events

```typescript
type WSEvents =
  | ContentChunkMessage
  | ClaimVerifiedMessage
  | LedgerUpdatedMessage
  | GenerationCompleteMessage
  | SessionCreatedMessage
  | ErrorMessage;
```

---

## 9. Key Architectural Patterns

### 9.1 Workspace Isolation
- All data scoped to workspaces
- RLS enforces access via `workspace_members` junction
- Every API handler verifies membership before operations

### 9.2 Async Generator Streaming
- Pipeline uses `async function*` generator pattern
- Events yielded incrementally for real-time streaming
- Same generator consumed by WebSocket and SSE handlers

### 9.3 SECURITY DEFINER for Atomic Operations
- Workspace creation needs both `workspaces` and `workspace_members` inserts
- RLS would block one insert → use elevated-privilege function
- Document upload validates membership before insert

### 9.4 Dual Authentication
- REST: Full Supabase validation per request
- WebSocket: Fast JWT parsing (no network), fallback to full validation

### 9.5 Fire-and-Forget Processing
- Document upload returns immediately
- `processDocument()` runs in background with `.catch()` for errors
- Status polling via GET endpoint

---

## 10. Migration Considerations for Convex

### 10.1 Database Tables → Convex Tables

| Supabase Table | Convex Table Notes |
|----------------|-------------------|
| `workspaces` | Standard table with `owner_id` index |
| `workspace_members` | Junction table for access control |
| `documents` | Include status field for processing state |
| `document_chunks` | **Vector embeddings need external service** |
| `sessions` | Store response inline or separate |
| `claims` | Link to session via ID |
| `evidence_ledger` | Link to claim via ID |

### 10.2 Vector Search

Convex doesn't have built-in vector search. Options:
1. **External vector DB** (Pinecone, Weaviate, Qdrant)
2. **Convex + vector search service** via HTTP actions
3. **Store embeddings in Convex**, query externally

### 10.3 Real-time Updates

- Convex has built-in real-time subscriptions
- Replace WebSocket with Convex `useQuery()` subscriptions
- Pipeline events can use Convex mutations that clients subscribe to

### 10.4 Authentication

- Convex has built-in auth via Clerk, Auth0, or custom
- Replace Supabase Auth with Convex auth provider
- `ctx.auth.getUserIdentity()` for user info

### 10.5 Streaming LLM Responses

- Convex Actions for external API calls (OpenRouter, OpenAI)
- HTTP Actions for streaming responses
- Store chunks in Convex table, subscribe for updates

### 10.6 Background Processing

- Convex has built-in scheduling via `ctx.scheduler`
- Replace fire-and-forget with scheduled functions
- Better error handling and retry logic

### 10.7 File Storage

- Convex has file storage API
- Replace Supabase Storage with Convex file storage
- Store file references in document table

---

## Code References

### Server Entry
- `Project_4/src/index.ts:13-89` - Bun.serve() configuration

### API Router
- `Project_4/src/server/api/index.ts:28-122` - Route definitions
- `Project_4/src/server/api/index.ts:151-202` - Request handler

### Authentication
- `Project_4/src/server/middleware/auth.ts:26-67` - Token validation
- `Project_4/src/server/middleware/auth.ts:80-99` - requireAuth wrapper

### WebSocket
- `Project_4/src/server/websocket/handler.ts:61-88` - Connection open
- `Project_4/src/server/websocket/handler.ts:153-233` - Query handling

### Pipeline
- `Project_4/src/server/pipeline/orchestrator.ts:71-271` - Main pipeline flow
- `Project_4/src/server/pipeline/orchestrator.ts:376-422` - Result storage

### Database
- `Project_4/supabase/migrations/001_initial_schema.sql:20-175` - All tables
- `Project_4/supabase/migrations/003_functions.sql:9-42` - match_chunks()
- `Project_4/src/server/db/index.ts:28-71` - Supabase clients

### Types
- `Project_4/src/types/index.ts:1-189` - All type definitions

---

## Related Research

- `thoughts/shared/research/2026-01-16-veritydraft-frontend-comprehensive-analysis.md` - Frontend analysis
- `thoughts/shared/plans/2026-01-16-veritydraft-dark-theme-migration.md` - Dark theme migration plan

---

## Open Questions

1. **Vector search strategy**: Which external vector service to use with Convex?
2. **LLM streaming**: How to stream pipeline events via Convex subscriptions?
3. **Migration path**: Migrate incrementally or full rewrite?
4. **Auth migration**: How to migrate existing Supabase users to Convex auth?
5. **File storage migration**: Strategy for migrating existing documents?
