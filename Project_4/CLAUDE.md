# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VerityDraft is an Evidence-Ledger Copilot - a document-grounded AI assistant that generates verified answers and drafts. Every claim is traced back to source evidence, producing a transparent Evidence Ledger showing what's supported, weak, or missing.

## Technology Stack

- **Runtime:** Bun (full-stack) - NOT Node.js
- **Frontend:** React 18 + TypeScript (bundled by Bun, no Vite)
- **Backend:** Bun.serve() with WebSocket support
- **Database:** Supabase (PostgreSQL + pgvector)
- **Auth:** Supabase Auth
- **LLM:** OpenRouter API (GPT-5 Nano for Writer, KimiK2 for Skeptic, GLM 4.7 for Judge)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)

## Commands

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun --hot src/index.ts

# Run all tests
bun test

# Run specific test file
bun test tests/unit/chunking.test.ts

# Run tests with coverage
bun test --coverage

# Run E2E tests
bunx playwright test

# Type check
bun run typecheck

# Lint
bun run lint

# Database migrations
bun run db:migrate
```

## Architecture

### 3-LLM Verification Pipeline

The core differentiator is an adversarial verification loop:

1. **Writer** (GPT-5 Nano) - Generates content with `[cite:chunk_hash]` citation anchors
2. **Skeptic** (KimiK2 Thinking) - Challenges claims, identifies gaps and contradictions
3. **Judge** (GLM 4.7) - Verifies claims against evidence, produces Evidence Ledger

Pipeline flow: Query → Retrieve chunks → Writer → Skeptic → Judge → (Revision loop up to 2x) → Final response + Ledger

### Key Data Structures

**Evidence Ledger** maps claims to verdicts:
- `supported` (confidence > 0.8) - Strong evidence match
- `weak` (0.5-0.8) - Partial evidence
- `contradicted` - Evidence conflicts
- `not_found` - No relevant evidence

**Quality Gates:**
- Evidence coverage ≥ 85% of material claims
- Unsupported claim rate ≤ 5%
- Max 2 revision cycles

### Document Processing Pipeline

Upload → Extract text (PDF.js/mammoth) → Chunk (1500 chars, 100 overlap) → Generate embeddings → Store in pgvector

Chunk IDs use content hashes for stable citation references.

### Database Schema

Core tables: `workspaces`, `documents`, `document_chunks` (with vector embeddings), `sessions`, `claims`, `evidence_ledger`

Row-Level Security enforces workspace isolation - all data access is scoped to workspace membership.

Vector search uses HNSW index with cosine similarity via `match_chunks()` function.

## Bun-Specific Patterns

```typescript
// Server with routes and WebSocket
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/v1/*": apiRouter,
  },
  websocket: { /* streaming handlers */ },
  development: { hmr: true, console: true }
});

// Testing
import { test, expect } from "bun:test";

// File operations
const content = await Bun.file("path").text();
await Bun.write("path", content);

// Shell commands
const output = Bun.$`ls -la`;
```

## API Structure

REST endpoints at `/api/v1/`:
- `POST /workspaces/:id/query` - Submit query (returns SSE stream)
- `GET /sessions/:id/ledger` - Get Evidence Ledger
- `POST /documents/upload` - Upload document (multipart)

WebSocket events for streaming: `content_chunk`, `claim_verified`, `ledger_updated`, `generation_complete`

## Documentation

Key docs in `/docs`:
- `00-project-constitution.md` - Guiding principles
- `01-architecture/llm-orchestration.md` - 3-LLM pipeline details
- `02-business-logic/evidence-ledger.md` - Verification logic
- `04-backend/database-schema.md` - PostgreSQL schema with RLS policies

## Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key
```

Bun automatically loads `.env` - do not use dotenv.
