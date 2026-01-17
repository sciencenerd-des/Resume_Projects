# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VerityDraft is an Evidence-Ledger Copilot - a document-grounded AI assistant that generates verified answers and drafts. Every claim is traced back to source evidence, producing a transparent Evidence Ledger showing what's supported, weak, or missing.

## Technology Stack

- **Runtime:** Bun (full-stack) - NOT Node.js
- **Frontend:** React 18 + TypeScript (bundled by Bun, no Vite)
- **Backend:** Convex (real-time database and functions)
- **Server:** Bun.serve() for static files only
- **Database:** Convex (document database with real-time subscriptions)
- **Auth:** Clerk (integrated with Convex)
- **LLM:** OpenRouter API
  - **Writer:** GPT-5 Nano (`openai/gpt-5-nano`)
  - **Skeptic:** GLM 4.7 (`z-ai/glm-4.7`)
  - **Judge:** DeepSeek V3.2 Speciale (`deepseek/deepseek-v3.2-speciale`)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)

## Commands

```bash
# Install dependencies
bun install

# Start development server (Convex + Bun frontend)
bun run dev

# Start Convex only
bun run dev:convex

# Start frontend only
bun run dev:frontend

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

# Deploy Convex
bun run convex:deploy
```

## Architecture

### 3-LLM Verification Pipeline

The core differentiator is an adversarial verification loop:

1. **Writer** (GPT-5 Nano) - Generates content with `[cite:N]` for document claims, `[unverified]` for LLM knowledge
2. **Skeptic** (GLM 4.7) - Challenges claims, identifies gaps, contradictions, and misuse of tags
3. **Judge** (DeepSeek V3.2 Speciale) - Verifies claims against evidence, produces Evidence Ledger with verdicts

Pipeline flow: Query → Retrieve chunks → Writer → Skeptic → Judge → (Revision loop up to 2x) → Final response + Ledger

### Expert Knowledge System

Each LLM in the pipeline is a domain expert capable of:
1. **Verifying claims** against both documents AND established knowledge
2. **Adding expert knowledge** when documents lack information
3. **Flagging conflicts** between documents and established facts

**Expert Domains:** Physics, Mathematics, Chemistry, Biology, Statistics, Medicine, Engineering, Computer Science, Economics, Law, History, Geography, Astronomy

### Citation Tags

- `[cite:N]` - Claim sourced from document N
- `[llm:writer]` - Expert knowledge from Writer LLM
- `[llm:skeptic]` - Expert knowledge/additions from Skeptic LLM
- `[llm:judge]` - Expert knowledge/corrections from Judge LLM

### Conflict Handling

When documents contradict established facts (e.g., scientific laws):
- **Inline comparison format**: "Document states X [cite:1], however established physics indicates Y [llm:writer]"
- Both views are presented for user decision
- Documents and established facts have **equal weight**

### Conversation Memory

Sessions maintain conversation history for multi-turn interactions:
- Previous Q&A pairs are passed to the Writer LLM
- Follow-up questions understand context ("it", "that", "the above")
- Limited to last 6 exchanges to manage token budget

### Key Data Structures

**Evidence Ledger** maps claims to verdicts:
- `supported` - Strong evidence from documents, verified by expert knowledge
- `weak` - Partial document evidence
- `contradicted` - Conflicts with documents OR expert knowledge (factually wrong)
- `not_found` - No relevant evidence in documents
- `expert_verified` - LLM knowledge verified correct by expert assessment
- `conflict_flagged` - Document contradicts established facts (both views presented)

**Quality Gates:**
- Evidence coverage ≥ 85% of material claims (excluding conflict_flagged)
- Unsupported claim rate ≤ 5%
- Max 2 revision cycles
- All conflicts must present both views inline

### Document Processing Pipeline

Upload → Extract text (PDF.js/mammoth) → Chunk (1500 chars, 100 overlap) → Generate embeddings → Store in Convex

Chunk IDs use content hashes for stable citation references.

### Database Schema (Convex)

Core tables: `workspaces`, `documents`, `documentChunks` (with vector embeddings), `sessions`

Data access is scoped to authenticated users via Clerk integration.

## Bun-Specific Patterns

```typescript
// Server with routes (static files only - data via Convex)
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/health": () => new Response(JSON.stringify({ status: "healthy" })),
  },
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

## Convex Patterns

```typescript
// Query with real-time subscription
const sessions = useQuery(api.sessions.list, { workspaceId });

// Mutation
const createSession = useMutation(api.sessions.create);
await createSession({ workspaceId, query, mode: "answer" });

// Internal action for LLM calls
export const generate = internalAction({
  args: { sessionId: v.id("sessions"), query: v.string() },
  handler: async (ctx, args) => {
    // Call OpenRouter API
  }
});
```

## API Structure

All data operations via Convex:
- `api.workspaces.*` - Workspace CRUD
- `api.documents.*` - Document upload and management
- `api.sessions.*` - Query sessions and history
- `api.pipeline.orchestrator.*` - LLM pipeline execution

## Documentation

Key docs in `/docs`:
- `00-project-constitution.md` - Guiding principles
- `01-architecture/llm-orchestration.md` - 3-LLM pipeline details
- `02-business-logic/evidence-ledger.md` - Verification logic

## Environment Variables

Frontend (in `.env`):
```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
```

Convex Dashboard (Settings > Environment Variables):
```
CLERK_ISSUER_URL=https://your-clerk-domain.clerk.accounts.dev
OPENROUTER_API_KEY=your-openrouter-api-key
OPENAI_API_KEY=your-openai-api-key
```

Bun automatically loads `.env` - do not use dotenv.
