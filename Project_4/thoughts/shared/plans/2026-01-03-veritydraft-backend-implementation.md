# VerityDraft Backend Implementation Plan

## Overview

This plan covers the complete backend implementation for VerityDraft, an Evidence-Ledger Copilot that generates verified answers and drafts. The frontend is largely complete with React components, hooks, and services already in place. **The backend is entirely missing** - currently the frontend expects API endpoints at `http://localhost:8000` but no server exists.

## Current State Analysis

### What Exists (Frontend Only)
- React 18 + TypeScript frontend with comprehensive UI components
- Supabase client for auth (`src/services/supabase.ts`)
- API service with endpoint stubs (`src/services/api.ts`)
- WebSocket client service (`src/services/websocket.ts`)
- TypeScript types for all data structures (`src/types/index.ts`)
- Hooks for workspaces, documents, sessions, auth

### What's Missing (Entire Backend)
- **No Bun server** (`src/index.ts` doesn't exist)
- **No API routes** - workspace, document, session, query endpoints
- **No WebSocket server** - real-time streaming
- **No LLM integration** - OpenRouter client, 3-LLM pipeline
- **No RAG pipeline** - embeddings, vector search
- **No document processing** - PDF/DOCX extraction, chunking
- **No database migrations** - Supabase schema setup

### Key Discoveries
- Frontend expects API at `/api/workspaces`, `/api/documents`, `/api/sessions`, `/api/query`
- WebSocket expected at `ws://localhost:3000`
- Using Supabase for auth (JWT tokens) and database (PostgreSQL + pgvector)
- OpenRouter for LLM access (GPT-5 Nano, KimiK2, GLM 4.7)
- OpenAI for embeddings (text-embedding-3-small)

## Desired End State

A fully functional Bun.serve() backend that:
1. Serves the frontend HTML and handles all API routes
2. Authenticates requests via Supabase JWT validation
3. Processes document uploads with chunking and embeddings
4. Executes the 3-LLM verification pipeline
5. Streams responses via WebSocket with real-time citation verification
6. Stores all data in Supabase PostgreSQL with RLS enforcement

### Verification Criteria
- `bun run src/index.ts` starts server on port 8000
- Frontend can authenticate, create workspaces, upload documents
- Queries return streaming responses with Evidence Ledger
- All API endpoints match `docs/03-api-design/api-specification.md`

## What We're NOT Doing

- Web verification (fetching external URLs) - MVP excludes this
- Slack/Teams integration - Enterprise feature for v1+
- Multi-user comments on sessions
- Fine-grained RBAC (basic owner/admin/member is sufficient)
- Custom model training
- PDF export (Markdown and JSON export only for MVP)

## Implementation Approach

The backend will be built in phases, each independently testable:

1. **Foundation**: Server setup, database migrations, auth middleware
2. **Core Data**: Workspace and document CRUD operations
3. **Document Processing**: PDF/DOCX extraction, chunking, embeddings
4. **RAG Pipeline**: Vector search, context assembly
5. **LLM Integration**: OpenRouter client, model configuration
6. **Verification Pipeline**: Writer → Skeptic → Judge flow
7. **Real-time**: WebSocket streaming, progressive ledger updates
8. **Polish**: Error handling, rate limiting, observability

---

## Phase 1: Server Foundation & Database

### Overview
Set up Bun.serve() with HTML imports, database migrations in Supabase, and JWT auth middleware.

### Changes Required

#### 1. Create Server Entry Point
**File**: `src/index.ts`
**Changes**: New file - Bun server with routes and WebSocket

```typescript
import index from "./index.html";
import { handleApiRequest } from "./server/api";
import { handleWebSocket } from "./server/websocket";
import { validateAuth } from "./server/middleware/auth";

const PORT = process.env.PORT || 8000;

Bun.serve({
  port: PORT,

  routes: {
    "/": index,
    "/api/*": handleApiRequest,
  },

  websocket: {
    open: handleWebSocket.open,
    message: handleWebSocket.message,
    close: handleWebSocket.close,
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running on http://localhost:${PORT}`);
```

#### 2. Create Database Migrations
**File**: `supabase/migrations/001_initial_schema.sql`
**Changes**: New file - Complete database schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  settings JSONB DEFAULT '{"default_mode": "answer", "strict_mode": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE TRIGGER set_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Workspace members table
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  file_size INTEGER,
  storage_path TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Document chunks table with vector embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  heading_path TEXT[] DEFAULT '{}',
  start_offset INTEGER,
  end_offset INTEGER,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, chunk_hash)
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_hash ON document_chunks(chunk_hash);
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  query TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('answer', 'draft')),
  settings JSONB DEFAULT '{}'::jsonb,
  response TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  processing_time_ms INTEGER,
  token_count JSONB,
  evidence_coverage FLOAT,
  unsupported_claim_count INTEGER DEFAULT 0,
  revision_cycles INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('fact', 'policy', 'numeric', 'definition')),
  importance TEXT NOT NULL CHECK (importance IN ('critical', 'material', 'minor')),
  requires_citation BOOLEAN DEFAULT true,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claims_session ON claims(session_id);

-- Evidence ledger table
CREATE TABLE evidence_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  verdict TEXT NOT NULL CHECK (verdict IN ('supported', 'weak', 'contradicted', 'not_found')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  chunk_ids UUID[] DEFAULT '{}',
  evidence_snippet TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, claim_id)
);

CREATE INDEX idx_ledger_session ON evidence_ledger(session_id);
CREATE INDEX idx_ledger_verdict ON evidence_ledger(verdict);

-- Session feedback table
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'incorrect', 'missing_citation')),
  comment TEXT,
  corrections JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feedback_session ON session_feedback(session_id);
```

#### 3. Create RLS Policies
**File**: `supabase/migrations/002_rls_policies.sql`
**Changes**: New file - Row-Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY workspace_select ON workspaces FOR SELECT USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY workspace_insert ON workspaces FOR INSERT WITH CHECK (
  owner_id = auth.uid()
);

CREATE POLICY workspace_update ON workspaces FOR UPDATE USING (
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY workspace_delete ON workspaces FOR DELETE USING (
  owner_id = auth.uid()
);

-- Document policies (through workspace membership)
CREATE POLICY document_access ON documents FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Chunk policies (through document workspace)
CREATE POLICY chunk_access ON document_chunks FOR ALL USING (
  document_id IN (
    SELECT d.id FROM documents d
    JOIN workspace_members wm ON d.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Session policies
CREATE POLICY session_access ON sessions FOR ALL USING (
  workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

-- Claims policies (through session)
CREATE POLICY claims_access ON claims FOR ALL USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Evidence ledger policies (through session)
CREATE POLICY ledger_access ON evidence_ledger FOR ALL USING (
  session_id IN (
    SELECT s.id FROM sessions s
    JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);
```

#### 4. Create Vector Search Function
**File**: `supabase/migrations/003_functions.sql`
**Changes**: New file - Database functions

```sql
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  workspace_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  chunk_hash TEXT,
  content TEXT,
  heading_path TEXT[],
  page_number INT,
  similarity FLOAT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    dc.chunk_hash,
    dc.content,
    dc.heading_path,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.workspace_id = workspace_id_param
    AND d.status = 'ready'
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

#### 5. Create Auth Middleware
**File**: `src/server/middleware/auth.ts`
**Changes**: New file - JWT validation

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthUser {
  id: string;
  email: string;
}

export async function validateAuth(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
  };
}

export function requireAuth(handler: (req: Request, user: AuthUser) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    const user = await validateAuth(request);

    if (!user) {
      return Response.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' } },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}
```

### Success Criteria

#### Automated Verification
- [ ] `bun run src/index.ts` starts without errors
- [ ] `bunx supabase db push` applies migrations successfully
- [ ] TypeScript compiles: `bun run typecheck`

#### Manual Verification
- [ ] Server responds to `GET /` with frontend HTML
- [ ] Unauthenticated API requests return 401
- [ ] Authenticated requests pass middleware

---

## Phase 2: Workspace & Document CRUD

### Overview
Implement REST endpoints for workspace and document management.

### Changes Required

#### 1. Create API Router
**File**: `src/server/api/index.ts`
**Changes**: New file - Route dispatcher

```typescript
import { requireAuth, AuthUser } from '../middleware/auth';
import * as workspaces from './workspaces';
import * as documents from './documents';
import * as sessions from './sessions';
import * as query from './query';

export async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Parse route
  const routes: Record<string, (req: Request) => Promise<Response>> = {
    // Workspaces
    'GET /api/workspaces': requireAuth(workspaces.list),
    'POST /api/workspaces': requireAuth(workspaces.create),
    'GET /api/workspaces/:id': requireAuth(workspaces.get),
    'PUT /api/workspaces/:id': requireAuth(workspaces.update),
    'DELETE /api/workspaces/:id': requireAuth(workspaces.remove),

    // Documents
    'GET /api/workspaces/:id/documents': requireAuth(documents.list),
    'POST /api/workspaces/:id/documents': requireAuth(documents.upload),
    'GET /api/documents/:id': requireAuth(documents.get),
    'DELETE /api/documents/:id': requireAuth(documents.remove),
    'GET /api/documents/:id/chunks': requireAuth(documents.getChunks),

    // Sessions
    'GET /api/workspaces/:id/sessions': requireAuth(sessions.list),
    'GET /api/sessions/:id': requireAuth(sessions.get),
    'GET /api/sessions/:id/messages': requireAuth(sessions.getMessages),
    'GET /api/sessions/:id/ledger': requireAuth(sessions.getLedger),
    'DELETE /api/sessions/:id': requireAuth(sessions.remove),
    'GET /api/sessions/:id/export': requireAuth(sessions.exportSession),

    // Query
    'POST /api/workspaces/:id/query': requireAuth(query.submit),
  };

  // Match route (simplified - use a proper router in production)
  for (const [routeKey, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = routeKey.split(' ');
    if (method === routeMethod && matchPath(path, routePath)) {
      return handler(request);
    }
  }

  return Response.json(
    { success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
    { status: 404 }
  );
}
```

#### 2. Workspace Handlers
**File**: `src/server/api/workspaces.ts`
**Changes**: New file - Workspace CRUD

```typescript
import { AuthUser } from '../middleware/auth';
import { db } from '../db';

export async function list(request: Request, user: AuthUser): Promise<Response> {
  const workspaces = await db.query(`
    SELECT w.*, wm.role,
           (SELECT COUNT(*) FROM documents WHERE workspace_id = w.id) as document_count,
           (SELECT COUNT(*) FROM sessions WHERE workspace_id = w.id) as session_count
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = $1
    ORDER BY w.created_at DESC
  `, [user.id]);

  return Response.json({ success: true, data: { workspaces } });
}

export async function create(request: Request, user: AuthUser): Promise<Response> {
  const { name, settings } = await request.json();

  if (!name) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required' } },
      { status: 400 }
    );
  }

  // Create workspace and add owner as member in transaction
  const workspace = await db.transaction(async (tx) => {
    const [ws] = await tx.query(`
      INSERT INTO workspaces (name, owner_id, settings)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, user.id, settings || {}]);

    await tx.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES ($1, $2, 'owner')
    `, [ws.id, user.id]);

    return ws;
  });

  return Response.json({ success: true, data: { workspace } }, { status: 201 });
}

// ... get, update, remove handlers
```

#### 3. Document Handlers
**File**: `src/server/api/documents.ts`
**Changes**: New file - Document management

```typescript
import { AuthUser } from '../middleware/auth';
import { db } from '../db';
import { processDocument } from '../processing/document-processor';

export async function upload(request: Request, user: AuthUser): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } },
      { status: 400 }
    );
  }

  const workspaceId = extractWorkspaceId(request.url);

  // Validate file type
  const fileType = file.name.endsWith('.pdf') ? 'pdf' :
                   file.name.endsWith('.docx') ? 'docx' : null;

  if (!fileType) {
    return Response.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Only PDF and DOCX files are supported' } },
      { status: 400 }
    );
  }

  // Create document record
  const [document] = await db.query(`
    INSERT INTO documents (workspace_id, filename, file_type, file_size, status)
    VALUES ($1, $2, $3, $4, 'processing')
    RETURNING *
  `, [workspaceId, file.name, fileType, file.size]);

  // Process document async (chunking, embeddings)
  processDocument(document.id, file).catch(console.error);

  return Response.json({ success: true, data: { document } }, { status: 201 });
}

// ... list, get, remove, getChunks handlers
```

### Success Criteria

#### Automated Verification
- [ ] API tests pass: `bun test tests/api/workspaces.test.ts`
- [ ] API tests pass: `bun test tests/api/documents.test.ts`
- [ ] TypeScript compiles without errors

#### Manual Verification
- [ ] Can create workspace via frontend
- [ ] Can upload PDF/DOCX document
- [ ] Document appears in library after processing

---

## Phase 3: Document Processing Pipeline

### Overview
Extract text from PDFs/DOCX, chunk documents, generate embeddings, store in pgvector.

### Changes Required

#### 1. PDF Text Extraction
**File**: `src/server/processing/extractors/pdf.ts`
**Changes**: New file - PDF.js integration

```typescript
import * as pdfjs from 'pdfjs-dist';

export async function extractPdfText(file: File): Promise<ExtractedText> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;

  const pages: PageContent[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');

    pages.push({
      pageNumber: i,
      content: text,
    });
  }

  return { pages, totalPages: pdf.numPages };
}
```

#### 2. DOCX Text Extraction
**File**: `src/server/processing/extractors/docx.ts`
**Changes**: New file - Mammoth integration

```typescript
import mammoth from 'mammoth';

export async function extractDocxText(file: File): Promise<ExtractedText> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });

  return {
    pages: [{ pageNumber: 1, content: result.value }],
    totalPages: 1,
  };
}
```

#### 3. Text Chunker
**File**: `src/server/processing/chunker.ts`
**Changes**: New file - Semantic chunking

```typescript
import { createHash } from 'crypto';

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 100;

export interface Chunk {
  content: string;
  chunkHash: string;
  chunkIndex: number;
  pageNumber?: number;
  startOffset: number;
  endOffset: number;
}

export function chunkDocument(pages: PageContent[]): Chunk[] {
  const chunks: Chunk[] = [];
  let globalOffset = 0;
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.content;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      const content = text.slice(start, end);

      chunks.push({
        content,
        chunkHash: generateChunkHash(content),
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        startOffset: globalOffset + start,
        endOffset: globalOffset + end,
      });

      start = end - CHUNK_OVERLAP;
    }

    globalOffset += text.length;
  }

  return chunks;
}

function generateChunkHash(content: string): string {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex').substring(0, 8);
}
```

#### 4. Embedding Generator
**File**: `src/server/processing/embeddings.ts`
**Changes**: New file - OpenAI embeddings

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    dimensions: 1536,
  });

  return response.data.map(d => d.embedding);
}
```

#### 5. Document Processor Orchestrator
**File**: `src/server/processing/document-processor.ts`
**Changes**: New file - Full pipeline

```typescript
import { extractPdfText } from './extractors/pdf';
import { extractDocxText } from './extractors/docx';
import { chunkDocument } from './chunker';
import { generateEmbeddings } from './embeddings';
import { db } from '../db';

export async function processDocument(documentId: string, file: File): Promise<void> {
  try {
    // 1. Extract text
    const extracted = file.name.endsWith('.pdf')
      ? await extractPdfText(file)
      : await extractDocxText(file);

    // 2. Chunk document
    const chunks = chunkDocument(extracted.pages);

    // 3. Generate embeddings (batch)
    const embeddings = await generateEmbeddings(chunks.map(c => c.content));

    // 4. Store chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await db.query(`
        INSERT INTO document_chunks
        (document_id, chunk_hash, content, chunk_index, page_number, start_offset, end_offset, embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        documentId,
        chunks[i].chunkHash,
        chunks[i].content,
        chunks[i].chunkIndex,
        chunks[i].pageNumber,
        chunks[i].startOffset,
        chunks[i].endOffset,
        JSON.stringify(embeddings[i]),
      ]);
    }

    // 5. Update document status
    await db.query(`
      UPDATE documents SET status = 'ready', chunk_count = $1 WHERE id = $2
    `, [chunks.length, documentId]);

  } catch (error) {
    await db.query(`
      UPDATE documents SET status = 'error', error_message = $1 WHERE id = $2
    `, [error.message, documentId]);
  }
}
```

### Success Criteria

#### Automated Verification
- [ ] Chunking tests pass: `bun test tests/unit/chunking.test.ts`
- [ ] Embedding tests pass with mocks
- [ ] TypeScript compiles

#### Manual Verification
- [ ] Upload PDF, verify chunks created in database
- [ ] Verify embeddings have 1536 dimensions
- [ ] Document status transitions: uploading → processing → ready

---

## Phase 4: RAG Pipeline

### Overview
Implement vector similarity search and context assembly for retrieval.

### Changes Required

#### 1. Vector Search Service
**File**: `src/server/rag/retrieval.ts`
**Changes**: New file - pgvector search

```typescript
import { generateEmbeddings } from '../processing/embeddings';
import { db } from '../db';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  chunkHash: string;
  content: string;
  headingPath: string[];
  pageNumber: number;
  similarity: number;
  filename?: string;
}

export async function retrieveChunks(
  query: string,
  workspaceId: string,
  options: { threshold?: number; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const { threshold = 0.7, limit = 10 } = options;

  // Generate query embedding
  const [embedding] = await generateEmbeddings([query]);

  // Vector search
  const chunks = await db.query(`
    SELECT * FROM match_chunks($1, $2, $3, $4)
  `, [JSON.stringify(embedding), workspaceId, threshold, limit]);

  // Fetch document names
  const docIds = [...new Set(chunks.map(c => c.document_id))];
  const docs = await db.query(`
    SELECT id, filename FROM documents WHERE id = ANY($1)
  `, [docIds]);

  const docMap = new Map(docs.map(d => [d.id, d.filename]));

  return chunks.map(c => ({
    ...c,
    filename: docMap.get(c.document_id),
  }));
}
```

#### 2. Context Assembler
**File**: `src/server/rag/context.ts`
**Changes**: New file - Format context for LLM

```typescript
import { RetrievedChunk } from './retrieval';

export interface AssembledContext {
  formatted: string;
  chunks: RetrievedChunk[];
  totalTokens: number;
}

export function assembleContext(
  chunks: RetrievedChunk[],
  maxTokens: number = 50000
): AssembledContext {
  const selected: RetrievedChunk[] = [];
  let tokenCount = 0;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokens(chunk.content);
    if (tokenCount + chunkTokens > maxTokens) break;
    selected.push(chunk);
    tokenCount += chunkTokens;
  }

  const formatted = `## Source Documents

${selected.map(c => `
### [${c.chunkHash}] ${c.filename}, Page ${c.pageNumber}

${c.content}
`).join('\n---\n')}

## Citation Instructions
When citing, use [cite:CHUNK_HASH] format.
Available chunk hashes: ${selected.map(c => c.chunkHash).join(', ')}
`;

  return { formatted, chunks: selected, totalTokens: tokenCount };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

### Success Criteria

#### Automated Verification
- [ ] Retrieval tests pass: `bun test tests/unit/retrieval.test.ts`
- [ ] Context assembly produces valid format

#### Manual Verification
- [ ] Query returns relevant chunks from uploaded documents
- [ ] Similarity scores are reasonable (0.7-1.0 range)

---

## Phase 5: LLM Integration

### Overview
Create OpenRouter client with model configuration, retry logic, and streaming support.

### Changes Required

#### 1. OpenRouter Client
**File**: `src/server/llm/openrouter.ts`
**Changes**: New file - API client

```typescript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const BASE_URL = 'https://openrouter.ai/api/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export const models: Record<string, ModelConfig> = {
  writer: {
    model: 'openai/gpt-5-nano',
    maxTokens: 4096,
    temperature: 0.7,
  },
  skeptic: {
    model: 'moonshotai/kimi-k2-instruct',
    maxTokens: 8192,
    temperature: 0.3,
  },
  judge: {
    model: 'zhipu/glm-4.7',
    maxTokens: 4096,
    temperature: 0.2,
  },
};

export async function chat(
  role: 'writer' | 'skeptic' | 'judge',
  messages: ChatMessage[]
): Promise<string> {
  const config = models[role];

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://veritydraft.com',
      'X-Title': 'VerityDraft',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function* chatStream(
  role: 'writer' | 'skeptic' | 'judge',
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const config = models[role];

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://veritydraft.com',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') return;

      const parsed = JSON.parse(data);
      const content = parsed.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
```

#### 2. Prompt Templates
**File**: `src/server/llm/prompts.ts`
**Changes**: New file - System prompts for each role

(Contains Writer, Skeptic, Judge prompts as defined in docs/01-architecture/llm-orchestration.md)

### Success Criteria

#### Automated Verification
- [ ] LLM client tests pass with mocks
- [ ] Streaming works correctly

#### Manual Verification
- [ ] Writer generates response with citations
- [ ] Skeptic produces critique JSON
- [ ] Judge outputs verification ledger

---

## Phase 6: Verification Pipeline

### Overview
Orchestrate the 3-LLM verification flow: Writer → Skeptic → Judge with revision loop.

### Changes Required

#### 1. Pipeline Orchestrator
**File**: `src/server/pipeline/orchestrator.ts`
**Changes**: New file - Full pipeline execution

```typescript
import { retrieveChunks } from '../rag/retrieval';
import { assembleContext } from '../rag/context';
import { chat, chatStream } from '../llm/openrouter';
import { writerPrompt, skepticPrompt, judgePrompt } from '../llm/prompts';
import { db } from '../db';

export interface PipelineResult {
  response: string;
  ledger: EvidenceLedger;
  metrics: PipelineMetrics;
}

export async function* executePipeline(
  sessionId: string,
  query: string,
  workspaceId: string,
  mode: 'answer' | 'draft'
): AsyncGenerator<PipelineEvent> {
  const startTime = Date.now();

  // Phase 1: Retrieval
  yield { type: 'retrieval_started' };
  const chunks = await retrieveChunks(query, workspaceId);
  const context = assembleContext(chunks);
  yield { type: 'retrieval_complete', chunksRetrieved: chunks.length };

  // Phase 2: Writer
  yield { type: 'generation_started', phase: 'writer' };
  let writerResponse = '';

  for await (const delta of chatStream('writer', [
    { role: 'system', content: writerPrompt(context.formatted, mode) },
    { role: 'user', content: query },
  ])) {
    writerResponse += delta;
    yield { type: 'content_chunk', delta, citations: extractCitations(delta) };
  }

  // Phase 3: Skeptic
  yield { type: 'generation_started', phase: 'skeptic' };
  const skepticReport = await chat('skeptic', [
    { role: 'system', content: skepticPrompt(context.formatted) },
    { role: 'user', content: writerResponse },
  ]);

  // Phase 4: Judge
  yield { type: 'generation_started', phase: 'judge' };
  const judgeOutput = await chat('judge', [
    { role: 'system', content: judgePrompt(context.formatted) },
    { role: 'user', content: JSON.stringify({ writer: writerResponse, skeptic: skepticReport }) },
  ]);

  const parsed = JSON.parse(judgeOutput);

  // Check if revision needed
  if (parsed.revision_needed && parsed.revision_cycles < 2) {
    // Revision loop (simplified)
    yield { type: 'revision_started', cycle: parsed.revision_cycles + 1 };
    // ... revision logic
  }

  // Store results
  await storeLedger(sessionId, parsed);

  yield {
    type: 'generation_complete',
    sessionId,
    response: parsed.verified_response,
    ledger: parsed.ledger,
    metrics: {
      processingTimeMs: Date.now() - startTime,
      evidenceCoverage: parsed.summary.evidence_coverage,
    },
  };
}
```

### Success Criteria

#### Automated Verification
- [ ] Pipeline integration tests pass
- [ ] Ledger stored correctly in database

#### Manual Verification
- [ ] Full query flow produces response + ledger
- [ ] Citations link to correct chunks
- [ ] Verdict assignments are reasonable

---

## Phase 7: WebSocket Streaming

### Overview
Implement WebSocket server for real-time response streaming.

### Changes Required

#### 1. WebSocket Handler
**File**: `src/server/websocket/handler.ts`
**Changes**: New file - WS event handling

```typescript
import { validateAuth } from '../middleware/auth';
import { executePipeline } from '../pipeline/orchestrator';
import type { ServerWebSocket } from 'bun';

interface WSData {
  userId: string;
  workspaceId?: string;
}

export const handleWebSocket = {
  async open(ws: ServerWebSocket<WSData>) {
    console.log('[WS] Connection opened');
  },

  async message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
    try {
      const msg = JSON.parse(message.toString());

      switch (msg.type) {
        case 'query':
          await handleQuery(ws, msg.payload);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
          break;
        case 'cancel':
          // Handle cancellation
          break;
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: error.message },
      }));
    }
  },

  close(ws: ServerWebSocket<WSData>) {
    console.log('[WS] Connection closed');
  },
};

async function handleQuery(ws: ServerWebSocket<WSData>, payload: QueryPayload) {
  const { workspace_id, query, mode, request_id } = payload;

  // Create session
  const sessionId = await createSession(workspace_id, ws.data.userId, query, mode);
  ws.send(JSON.stringify({ type: 'session_created', payload: { session_id: sessionId, request_id } }));

  // Execute pipeline with streaming
  for await (const event of executePipeline(sessionId, query, workspace_id, mode)) {
    ws.send(JSON.stringify(event));
  }
}
```

### Success Criteria

#### Automated Verification
- [ ] WebSocket tests pass

#### Manual Verification
- [ ] Frontend receives streaming updates
- [ ] Content chunks render progressively
- [ ] Ledger updates appear in real-time

---

## Phase 8: Polish & Production Readiness

### Overview
Add error handling, rate limiting, logging, and final integration testing.

### Changes Required

1. **Rate Limiting Middleware**: Implement token bucket rate limiter
2. **Error Handler**: Centralized error handling with proper codes
3. **Logging Service**: Structured JSON logging for observability
4. **Health Check Endpoint**: `/health` for monitoring
5. **Graceful Shutdown**: Handle SIGTERM properly

### Success Criteria

#### Automated Verification
- [ ] All unit tests pass: `bun test`
- [ ] Integration tests pass: `bun test tests/integration`
- [ ] E2E tests pass: `bunx playwright test`
- [ ] TypeScript compiles: `bun run typecheck`
- [ ] No linting errors: `bun run lint`

#### Manual Verification
- [ ] Full user journey works: Login → Create workspace → Upload doc → Query → Export
- [ ] Rate limiting works (returns 429 after limit)
- [ ] Errors display user-friendly messages
- [ ] Logs are structured and queryable

---

## Testing Strategy

### Unit Tests
- Chunking logic (`tests/unit/chunking.test.ts`)
- Citation extraction (`tests/unit/citations.test.ts`)
- Embedding generation (mocked)
- Context assembly
- Verdict assignment logic

### Integration Tests
- API endpoint tests with real database
- Pipeline execution with mocked LLMs
- WebSocket message flow

### E2E Tests (Playwright)
- User authentication flow
- Document upload and processing
- Query submission and response
- Ledger display and interaction

---

## Performance Considerations

1. **Embedding Batching**: Process up to 100 chunks per API call
2. **HNSW Index Tuning**: m=16, ef_construction=64 for balance of speed/accuracy
3. **Connection Pooling**: Use Supabase connection pooling
4. **Caching**: Cache embeddings for repeated queries (1-hour TTL)
5. **Streaming**: Start showing content before full response complete

---

## Dependencies to Add

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "pdfjs-dist": "^4.0.0",
    "mammoth": "^1.6.0",
    "@supabase/supabase-js": "^2.89.0"
  }
}
```

---

## Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# LLM APIs
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key

# Server
PORT=8000
```

---

## References

- Project Constitution: `docs/00-project-constitution.md`
- LLM Orchestration: `docs/01-architecture/llm-orchestration.md`
- Database Schema: `docs/04-backend/database-schema.md`
- API Specification: `docs/03-api-design/api-specification.md`
- WebSocket Protocol: `docs/03-api-design/websocket-protocol.md`
- Evidence Ledger: `docs/02-business-logic/evidence-ledger.md`
