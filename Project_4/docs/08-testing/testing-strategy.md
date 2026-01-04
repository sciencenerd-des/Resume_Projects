# Testing Strategy

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

VerityDraft's testing strategy ensures reliability across the document processing pipeline, LLM orchestration, and user-facing features.

---

## 2. Test Pyramid

```
          ╱╲
         ╱  ╲
        ╱ E2E╲         10% - Critical user journeys
       ╱  10% ╲
      ╱────────╲
     ╱Integration╲      30% - API, DB, LLM mocks
    ╱    30%      ╲
   ╱────────────────╲
  ╱    Unit Tests    ╲   60% - Pure functions, logic
 ╱       60%          ╲
╱──────────────────────╲
```

| Layer | Coverage | Focus |
|-------|----------|-------|
| Unit | 60% | Pure functions, data transformations |
| Integration | 30% | API endpoints, database operations |
| E2E | 10% | Critical user flows |

---

## 3. Testing Framework

### 3.1 Tools

| Tool | Purpose |
|------|---------|
| `bun test` | Unit and integration tests |
| Playwright | E2E browser testing |
| MSW | API mocking |
| Testcontainers | Database testing |

### 3.2 Test Configuration

```typescript
// bunfig.toml
[test]
preload = ["./tests/setup.ts"]
coverage = true
coverageThreshold = {
  statements = 80
  branches = 75
  functions = 80
  lines = 80
}
```

---

## 4. Test Categories

### 4.1 Unit Tests

**Scope**: Pure functions with no external dependencies

```typescript
// tests/unit/chunking.test.ts
import { describe, test, expect } from 'bun:test';
import { chunkDocument } from '../../src/lib/chunking';

describe('chunkDocument', () => {
  test('splits text at paragraph boundaries', () => {
    const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
    const chunks = chunkDocument(text, { maxSize: 30 });

    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toBe('Paragraph 1.');
  });

  test('respects maximum chunk size', () => {
    const text = 'A'.repeat(2000);
    const chunks = chunkDocument(text, { maxSize: 500 });

    expect(chunks.every(c => c.content.length <= 500)).toBe(true);
  });

  test('maintains overlap between chunks', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    const chunks = chunkDocument(text, { maxSize: 40, overlap: 10 });

    // Last 10 chars of chunk 0 should appear in chunk 1
    const overlap = chunks[0].content.slice(-10);
    expect(chunks[1].content.startsWith(overlap)).toBe(true);
  });
});
```

### 4.2 Integration Tests

**Scope**: API endpoints, database operations, external service mocks

```typescript
// tests/integration/documents-api.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { setupTestServer, createTestUser, createTestWorkspace } from '../helpers';

describe('Documents API', () => {
  let server: TestServer;
  let authToken: string;
  let workspaceId: string;

  beforeAll(async () => {
    server = await setupTestServer();
    const { token, userId } = await createTestUser();
    authToken = token;
    workspaceId = await createTestWorkspace(userId);
  });

  afterAll(async () => {
    await server.close();
  });

  test('POST /documents/upload succeeds with valid PDF', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['%PDF-1.4...'], { type: 'application/pdf' }), 'test.pdf');

    const response = await fetch(`${server.url}/api/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.status).toBe('processing');
  });

  test('POST /documents/upload rejects files over 50MB', async () => {
    const largeFile = new Blob([new ArrayBuffer(60 * 1024 * 1024)]);
    const formData = new FormData();
    formData.append('file', largeFile, 'large.pdf');

    const response = await fetch(`${server.url}/api/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    expect(response.status).toBe(400);
  });
});
```

### 4.3 E2E Tests

**Scope**: Full user journeys in a browser

```typescript
// tests/e2e/document-qa.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Document Q&A Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/workspaces');
  });

  test('user can upload document and ask questions', async ({ page }) => {
    // Navigate to workspace
    await page.click('text=Test Workspace');

    // Upload document
    await page.click('text=Documents');
    await page.setInputFiles('input[type="file"]', './fixtures/sample.pdf');
    await expect(page.locator('text=Ready')).toBeVisible({ timeout: 30000 });

    // Ask a question
    await page.click('text=Chat');
    await page.fill('[placeholder*="Ask a question"]', 'What is the main topic?');
    await page.click('button:has-text("Send")');

    // Verify response appears
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();

    // Verify citations are present
    await expect(page.locator('[data-testid="citation-anchor"]').first()).toBeVisible();

    // Verify Evidence Ledger updates
    await expect(page.locator('text=Evidence Ledger')).toBeVisible();
    await expect(page.locator('[data-verdict="supported"]')).toBeVisible();
  });
});
```

---

## 5. LLM Testing Strategy

### 5.1 Deterministic Mocking

For unit/integration tests, mock LLM responses:

```typescript
// tests/mocks/llm.ts
export const mockLLMResponses = {
  writer: {
    answer: 'The maximum LTV ratio is 80% [cite:abc123].',
    claims: [
      { text: 'Maximum LTV is 80%', type: 'numeric' },
    ],
  },
  skeptic: {
    claims: [
      { id: '1', text: 'Maximum LTV is 80%', importance: 'critical' },
    ],
  },
  judge: {
    verdicts: [
      { claimId: '1', verdict: 'supported', confidence: 0.95 },
    ],
  },
};

export function setupLLMMock(server: MSWServer) {
  server.use(
    rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
      const { messages } = req.body;
      const role = detectRole(messages);
      return res(ctx.json({
        choices: [{ message: { content: JSON.stringify(mockLLMResponses[role]) } }],
      }));
    })
  );
}
```

### 5.2 Heuristic Testing

For integration tests, validate LLM output structure:

```typescript
// tests/integration/llm-pipeline.test.ts
test('writer produces citeable content', async () => {
  const response = await pipeline.runWriter(query, context);

  // Structure validation
  expect(response).toMatch(/\[cite:[a-f0-9]{12}\]/);

  // Quality heuristics
  const citations = extractCitations(response);
  expect(citations.length).toBeGreaterThan(0);
  expect(citations.every(c => context.chunkIds.includes(c.chunkId))).toBe(true);
});
```

### 5.3 Golden Set Testing

Maintain a set of known-good query/response pairs:

```typescript
// tests/golden/qa-responses.test.ts
import { goldenSet } from './fixtures/golden-qa.json';

describe('Golden Set Validation', () => {
  for (const { query, expectedClaims, expectedVerdicts } of goldenSet) {
    test(`query: "${query.slice(0, 50)}..."`, async () => {
      const result = await pipeline.process(query);

      // Verify claim extraction stability
      expect(result.claims.map(c => c.text)).toEqual(
        expect.arrayContaining(expectedClaims)
      );

      // Verify verdict consistency
      for (const expected of expectedVerdicts) {
        const actual = result.ledger.find(e => e.claimId === expected.claimId);
        expect(actual?.verdict).toBe(expected.verdict);
      }
    });
  }
});
```

---

## 6. Database Testing

### 6.1 Test Database Setup

```typescript
// tests/helpers/database.ts
import { PostgresContainer, StartedPostgresContainer } from '@testcontainers/postgresql';

let container: StartedPostgresContainer;

export async function setupTestDatabase() {
  container = await new PostgresContainer()
    .withExposedPorts(5432)
    .withDatabase('veritydraft_test')
    .start();

  // Run migrations
  await runMigrations(container.getConnectionUri());

  return container.getConnectionUri();
}

export async function teardownTestDatabase() {
  await container.stop();
}
```

### 6.2 Seeding Test Data

```typescript
// tests/fixtures/seed.ts
export async function seedTestData(db: Database) {
  // Create test user
  const userId = await db.insert('auth.users', {
    id: 'test-user-id',
    email: 'test@example.com',
  });

  // Create test workspace
  const workspaceId = await db.insert('workspaces', {
    name: 'Test Workspace',
    owner_id: userId,
  });

  // Create test documents with chunks
  const documentId = await db.insert('documents', {
    workspace_id: workspaceId,
    filename: 'policy.pdf',
    status: 'ready',
  });

  await db.insert('document_chunks', [
    { document_id: documentId, chunk_hash: 'abc123', content: 'Test content...' },
    { document_id: documentId, chunk_hash: 'def456', content: 'More content...' },
  ]);

  return { userId, workspaceId, documentId };
}
```

---

## 7. Component Testing

### 7.1 React Component Tests

```typescript
// tests/components/VerdictBadge.test.tsx
import { render, screen } from '@testing-library/react';
import { VerdictBadge } from '../../src/components/evidence/VerdictBadge';

describe('VerdictBadge', () => {
  test('renders supported verdict with green styling', () => {
    render(<VerdictBadge verdict="supported" />);

    const badge = screen.getByText('Supported');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  test('renders weak verdict with amber styling', () => {
    render(<VerdictBadge verdict="weak" />);

    const badge = screen.getByText('Weak');
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
  });

  test('includes icon when showIcon is true', () => {
    render(<VerdictBadge verdict="supported" showIcon />);

    expect(screen.getByTestId('verdict-icon')).toBeInTheDocument();
  });
});
```

### 7.2 Hook Testing

```typescript
// tests/hooks/useStreamingQuery.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStreamingQuery } from '../../src/hooks/useStreamingQuery';

describe('useStreamingQuery', () => {
  test('accumulates streaming content', async () => {
    const { result } = renderHook(() => useStreamingQuery('workspace-id'));

    act(() => {
      result.current.dispatch({ type: 'CONTENT_CHUNK', delta: 'Hello ' });
    });

    expect(result.current.content).toBe('Hello ');

    act(() => {
      result.current.dispatch({ type: 'CONTENT_CHUNK', delta: 'World' });
    });

    expect(result.current.content).toBe('Hello World');
  });

  test('updates ledger on claim verification', () => {
    const { result } = renderHook(() => useStreamingQuery('workspace-id'));

    act(() => {
      result.current.dispatch({
        type: 'CLAIM_VERIFIED',
        claim: { id: '1', verdict: 'supported', confidence: 0.9 },
      });
    });

    expect(result.current.claims).toHaveLength(1);
    expect(result.current.claims[0].verdict).toBe('supported');
  });
});
```

---

## 8. Performance Testing

### 8.1 Load Testing

```typescript
// tests/performance/load.test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 10 },   // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% under 2s
    http_req_failed: ['rate<0.01'],     // <1% failure rate
  },
};

export default function () {
  const response = http.post(
    'http://localhost:3000/api/query',
    JSON.stringify({
      query: 'What is the policy on refunds?',
      workspace_id: 'test-workspace',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}
```

### 8.2 Benchmarks

```typescript
// tests/benchmarks/chunking.bench.ts
import { bench, run } from 'mitata';
import { chunkDocument } from '../../src/lib/chunking';

const sampleDocument = Bun.file('./fixtures/large-document.txt').text();

bench('chunkDocument - small', () => {
  chunkDocument(sampleDocument.slice(0, 1000), { maxSize: 500 });
});

bench('chunkDocument - medium', () => {
  chunkDocument(sampleDocument.slice(0, 10000), { maxSize: 500 });
});

bench('chunkDocument - large', () => {
  chunkDocument(sampleDocument, { maxSize: 500 });
});

await run();
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/unit

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test tests/integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install
      - run: bun run build
      - run: bun run test:e2e
```

---

## 10. Test Coverage Requirements

| Module | Minimum Coverage |
|--------|------------------|
| Core business logic | 90% |
| API endpoints | 85% |
| Data transformations | 90% |
| React components | 75% |
| Overall | 80% |
