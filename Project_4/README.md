# VerityDraft

> Evidence-Ledger Copilot for Document-Grounded AI

VerityDraft is an AI assistant that generates **verified** answers and drafts from your document library. Every claim is traced back to source evidence, producing a transparent **Evidence Ledger** that shows exactly what's supported, what's weak, and what's missing.

---

## Key Features

- **3-LLM Verification Pipeline**: Writer generates, Skeptic challenges, Judge verifies
- **Evidence Ledger**: Claim-by-claim verification with verdicts and confidence scores
- **Inline Citations**: `[cite:chunk_id]` anchors linking claims to source documents
- **Two Modes**: Quick answers or comprehensive drafts with revision cycles
- **RAG-Powered**: Vector similarity search with pgvector for relevant context

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| Frontend | React 18 + TypeScript |
| Backend | Bun.serve |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth |
| LLM | OpenRouter API |
| Embeddings | OpenAI text-embedding-3-small |

---

## Project Structure

```
Project_4/
├── docs/                           # Documentation
│   ├── 00-project-constitution.md  # Guiding principles
│   ├── 01-architecture/            # System design
│   ├── 02-business-logic/          # Verification logic
│   ├── 03-api-design/              # REST & WebSocket APIs
│   ├── 04-backend/                 # Database, RAG, LLM
│   ├── 05-frontend/                # React components
│   ├── 06-user-workflows/          # User journeys
│   ├── 07-design-system/           # Visual guidelines
│   └── 08-testing/                 # Test strategies
├── src/                            # Application source
│   ├── frontend.tsx                # React app entry
│   ├── components/                 # UI components
│   ├── hooks/                      # React hooks
│   ├── services/                   # API clients
│   └── lib/                        # Core logic
├── tests/                          # Test suites
├── PRD.md                          # Product requirements
└── README.md                       # This file
```

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Supabase account
- OpenRouter API key
- OpenAI API key (for embeddings)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd Project_4
bun install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
bun run db:migrate

# Start development server
bun --hot src/index.ts
```

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key

# OpenAI (embeddings)
OPENAI_API_KEY=your-openai-key
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Project Constitution](docs/00-project-constitution.md) | Guiding principles and constraints |
| [System Architecture](docs/01-architecture/system-architecture.md) | High-level design |
| [LLM Orchestration](docs/01-architecture/llm-orchestration.md) | 3-LLM pipeline details |
| [Evidence Ledger](docs/02-business-logic/evidence-ledger.md) | Core verification logic |
| [API Specification](docs/03-api-design/api-specification.md) | REST endpoints |
| [Database Schema](docs/04-backend/database-schema.md) | PostgreSQL tables |
| [Frontend Architecture](docs/05-frontend/frontend-architecture.md) | React components |
| [User Journeys](docs/06-user-workflows/user-journeys.md) | End-to-end flows |
| [Testing Strategy](docs/08-testing/testing-strategy.md) | Test approach |

---

## Core Concepts

### Evidence Ledger

Every response includes a ledger that maps claims to evidence:

| Claim | Type | Verdict | Confidence |
|-------|------|---------|------------|
| Revenue grew 15% | numeric | supported | 95% |
| Market share increased | fact | weak | 62% |
| Future growth projected | prediction | not_found | 15% |

### Verdict Types

- **Supported**: Strong evidence match (>80% confidence)
- **Weak**: Partial evidence match (50-80% confidence)
- **Contradicted**: Evidence conflicts with claim
- **Not Found**: No relevant evidence in documents

### Quality Gates

- **Evidence Coverage**: ≥85% of claims must be supported/weak
- **Unsupported Rate**: ≤5% of claims can be "not found"
- **Revision Cycles**: Max 2 cycles to improve coverage

---

## API Overview

### REST Endpoints

```
POST   /api/auth/signup          # Create account
POST   /api/auth/login           # Sign in
POST   /api/workspaces           # Create workspace
POST   /api/documents/upload     # Upload document
POST   /api/query                # Submit query (returns session)
GET    /api/sessions/:id         # Get session details
GET    /api/sessions/:id/ledger  # Get Evidence Ledger
POST   /api/sessions/:id/export  # Export session
```

### WebSocket Events

```typescript
// Client → Server
{ type: 'query', payload: { query, mode, workspace_id } }

// Server → Client
{ type: 'session_created', session_id }
{ type: 'content_chunk', delta, citations }
{ type: 'claim_verified', claim_id, verdict, confidence }
{ type: 'ledger_updated', ledger }
{ type: 'generation_complete', summary }
```

---

## Development

### Running Tests

```bash
# Unit tests
bun test tests/unit

# Integration tests
bun test tests/integration

# E2E tests
bunx playwright test

# All tests with coverage
bun test --coverage
```

### Code Style

```bash
# Lint
bun run lint

# Format
bun run format

# Type check
bun run typecheck
```

---

## Architecture Highlights

### 3-LLM Verification Pipeline

```
User Query
    ↓
┌───────────┐     ┌───────────┐     ┌───────────┐
│  Writer   │ ──→ │  Skeptic  │ ──→ │   Judge   │
│(GPT-5Nano)│     │(KimiK2)   │     │ (GLM 4.7) │
└───────────┘     └───────────┘     └───────────┘
    ↓                               ↓
Response                    Evidence Ledger
```

### RAG Pipeline

```
Query → Embedding → Vector Search → Context Assembly → LLM
         ↓              ↓
    OpenAI API      pgvector
```

---

## Contributing

1. Read the [Project Constitution](docs/00-project-constitution.md)
2. Follow the existing patterns in documentation
3. Write tests for new features
4. Ensure 80%+ code coverage
5. Submit PR with clear description

---

## License

[License details here]

---

## Support

- GitHub Issues for bug reports and feature requests
- Documentation in `/docs` for implementation details
