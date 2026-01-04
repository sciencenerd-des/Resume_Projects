# LLM Test Patterns

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

Testing LLM-powered features presents unique challenges due to their non-deterministic nature. This guide covers strategies for testing VerityDraft's 3-LLM verification pipeline.

---

## 2. Testing Challenges

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| Non-determinism | Same input → different outputs | Heuristic assertions, golden sets |
| Cost | API calls are expensive | Mocking, caching, batching |
| Latency | Slow tests | Parallel execution, mocking |
| Model changes | Behavior drift | Regression baselines |

---

## 3. Testing Layers

```
┌─────────────────────────────────────────┐
│       E2E Tests (Live LLM)              │  5% - Smoke tests only
├─────────────────────────────────────────┤
│    Integration Tests (Mocked LLM)       │  25% - Full pipeline
├─────────────────────────────────────────┤
│      Unit Tests (No LLM)                │  70% - Logic only
└─────────────────────────────────────────┘
```

---

## 4. Deterministic Mocking

### 4.1 Response Fixtures

```typescript
// tests/fixtures/llm-responses.ts
export const writerResponses = {
  simpleAnswer: {
    content: 'The maximum loan-to-value ratio is 80% for primary residences [cite:abc123def456] and 75% for investment properties [cite:fed987cba654].',
  },
  draftWithMultipleClaims: {
    content: `
# Executive Summary

Revenue increased by 15% year-over-year [cite:rev001]. This growth was driven by:

1. Market expansion in Asia-Pacific [cite:asia001]
2. New product launches [cite:prod001]
3. Improved operational efficiency [cite:ops001]

The company projects continued growth of 10-12% next year [cite:proj001].
    `.trim(),
  },
  noEvidenceFound: {
    content: 'Based on the available documents, I could not find specific information about that topic.',
  },
};

export const skepticResponses = {
  simpleClaims: {
    claims: [
      { id: '1', text: 'Maximum LTV is 80%', type: 'numeric', importance: 'critical' },
      { id: '2', text: 'LTV is 75% for investment', type: 'numeric', importance: 'material' },
    ],
  },
  multipleClaims: {
    claims: [
      { id: '1', text: 'Revenue increased 15%', type: 'numeric', importance: 'critical' },
      { id: '2', text: 'Growth from Asia-Pacific expansion', type: 'fact', importance: 'material' },
      { id: '3', text: 'New product launches contributed', type: 'fact', importance: 'material' },
      { id: '4', text: 'Improved operational efficiency', type: 'fact', importance: 'minor' },
      { id: '5', text: 'Projected growth 10-12%', type: 'numeric', importance: 'critical' },
    ],
  },
};

export const judgeResponses = {
  allSupported: {
    verdicts: [
      { claimId: '1', verdict: 'supported', confidence: 0.95, chunkIds: ['abc123'] },
      { claimId: '2', verdict: 'supported', confidence: 0.88, chunkIds: ['def456'] },
    ],
  },
  mixedVerdicts: {
    verdicts: [
      { claimId: '1', verdict: 'supported', confidence: 0.92, chunkIds: ['rev001'] },
      { claimId: '2', verdict: 'supported', confidence: 0.85, chunkIds: ['asia001'] },
      { claimId: '3', verdict: 'weak', confidence: 0.62, chunkIds: ['prod001'] },
      { claimId: '4', verdict: 'supported', confidence: 0.78, chunkIds: ['ops001'] },
      { claimId: '5', verdict: 'not_found', confidence: 0.15, chunkIds: [] },
    ],
  },
};
```

### 4.2 Mock Implementation

```typescript
// tests/mocks/llm-mock.ts
import { http, HttpResponse } from 'msw';
import { writerResponses, skepticResponses, judgeResponses } from '../fixtures/llm-responses';

type LLMRole = 'writer' | 'skeptic' | 'judge';

function detectRole(messages: any[]): LLMRole {
  const systemPrompt = messages[0]?.content || '';

  if (systemPrompt.includes('research assistant')) return 'writer';
  if (systemPrompt.includes('extract claims')) return 'skeptic';
  if (systemPrompt.includes('verify')) return 'judge';

  return 'writer';
}

function getResponse(role: LLMRole, scenario: string = 'default'): any {
  const responses: Record<LLMRole, Record<string, any>> = {
    writer: {
      default: writerResponses.simpleAnswer,
      draft: writerResponses.draftWithMultipleClaims,
      noEvidence: writerResponses.noEvidenceFound,
    },
    skeptic: {
      default: skepticResponses.simpleClaims,
      draft: skepticResponses.multipleClaims,
    },
    judge: {
      default: judgeResponses.allSupported,
      mixed: judgeResponses.mixedVerdicts,
    },
  };

  return responses[role][scenario] || responses[role].default;
}

export const llmHandlers = [
  http.post('https://openrouter.ai/api/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as any;
    const role = detectRole(body.messages);
    const scenario = (request.headers.get('X-Test-Scenario') as string) || 'default';

    const response = getResponse(role, scenario);

    return HttpResponse.json({
      id: 'mock-response',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: typeof response === 'string' ? response : JSON.stringify(response),
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      },
    });
  }),
];
```

### 4.3 Using Mocks in Tests

```typescript
// tests/integration/pipeline.test.ts
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { setupServer } from 'msw/node';
import { llmHandlers } from '../mocks/llm-mock';
import { runPipeline } from '../../src/pipeline';

const server = setupServer(...llmHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LLM Pipeline', () => {
  test('processes query and returns verified response', async () => {
    const result = await runPipeline({
      query: 'What is the maximum LTV?',
      workspaceId: 'test-workspace',
      mode: 'answer',
    });

    expect(result.response).toContain('80%');
    expect(result.ledger.entries).toHaveLength(2);
    expect(result.ledger.entries.every(e => e.verdict === 'supported')).toBe(true);
  });

  test('handles draft mode with revision cycles', async () => {
    const result = await runPipeline({
      query: 'Write an executive summary',
      workspaceId: 'test-workspace',
      mode: 'draft',
    }, { scenario: 'draft' });

    expect(result.response).toContain('Executive Summary');
    expect(result.ledger.entries.length).toBeGreaterThan(3);
  });
});
```

---

## 5. Heuristic Testing

### 5.1 Output Structure Validation

```typescript
// tests/integration/llm-output-validation.test.ts
import { describe, test, expect } from 'bun:test';

describe('Writer Output Validation', () => {
  test('response contains expected structure', async () => {
    const response = await callWriter(query, context);

    // Has content
    expect(response.length).toBeGreaterThan(50);

    // Contains citations
    expect(response).toMatch(/\[cite:[a-f0-9]{12}\]/);

    // Citations reference valid chunks
    const citations = extractCitations(response);
    expect(citations.every(c => context.chunkIds.includes(c.chunkId))).toBe(true);

    // No hallucinated citations
    expect(citations.length).toBeLessThanOrEqual(context.chunks.length);
  });

  test('response stays within context', async () => {
    const response = await callWriter(query, context);

    // Key terms from context appear in response
    const contextTerms = extractKeyTerms(context);
    const responseTerms = extractKeyTerms(response);

    const overlap = contextTerms.filter(t => responseTerms.includes(t));
    expect(overlap.length / contextTerms.length).toBeGreaterThan(0.3);
  });
});

describe('Skeptic Output Validation', () => {
  test('extracts reasonable number of claims', async () => {
    const response = 'Revenue grew 15%. Costs decreased. Market share expanded.';
    const claims = await callSkeptic(response);

    // Reasonable claim count
    expect(claims.length).toBeGreaterThanOrEqual(2);
    expect(claims.length).toBeLessThanOrEqual(10);

    // Claims have required fields
    for (const claim of claims) {
      expect(claim).toHaveProperty('id');
      expect(claim).toHaveProperty('text');
      expect(claim).toHaveProperty('type');
      expect(claim).toHaveProperty('importance');
    }
  });

  test('classifies claim types correctly', async () => {
    const response = 'Revenue reached $10 million. Users must verify identity.';
    const claims = await callSkeptic(response);

    const numericClaim = claims.find(c => c.text.includes('$10 million'));
    const policyClaim = claims.find(c => c.text.includes('verify identity'));

    expect(numericClaim?.type).toBe('numeric');
    expect(policyClaim?.type).toBe('policy');
  });
});

describe('Judge Output Validation', () => {
  test('produces valid verdicts', async () => {
    const claims = [{ id: '1', text: 'Revenue grew 15%', type: 'numeric' }];
    const evidence = [{ chunkId: 'abc', content: 'Revenue increased by 15% in Q3' }];

    const verdicts = await callJudge(claims, evidence);

    expect(verdicts).toHaveLength(claims.length);

    for (const verdict of verdicts) {
      expect(['supported', 'weak', 'contradicted', 'not_found']).toContain(verdict.verdict);
      expect(verdict.confidence).toBeGreaterThanOrEqual(0);
      expect(verdict.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('confidence correlates with evidence strength', async () => {
    const strongEvidence = await callJudge(
      [{ id: '1', text: 'Revenue grew 15%' }],
      [{ content: 'Revenue increased by 15% year-over-year' }]
    );

    const weakEvidence = await callJudge(
      [{ id: '1', text: 'Revenue grew 15%' }],
      [{ content: 'Revenue showed positive growth trends' }]
    );

    expect(strongEvidence[0].confidence).toBeGreaterThan(weakEvidence[0].confidence);
  });
});
```

### 5.2 Semantic Consistency Checks

```typescript
// tests/integration/semantic-consistency.test.ts
describe('Semantic Consistency', () => {
  test('verdicts match claim-evidence relationship', async () => {
    const testCases = [
      {
        claim: 'Revenue increased by 15%',
        evidence: 'Revenue increased by 15% in Q3',
        expectedVerdict: 'supported',
      },
      {
        claim: 'Revenue increased by 15%',
        evidence: 'Revenue decreased by 5%',
        expectedVerdict: 'contradicted',
      },
      {
        claim: 'Revenue increased by 15%',
        evidence: 'Weather was sunny today',
        expectedVerdict: 'not_found',
      },
    ];

    for (const { claim, evidence, expectedVerdict } of testCases) {
      const result = await callJudge([{ id: '1', text: claim }], [{ content: evidence }]);
      expect(result[0].verdict).toBe(expectedVerdict);
    }
  });

  test('numeric claims require numeric evidence', async () => {
    const claim = { id: '1', text: 'Growth was exactly 15.5%', type: 'numeric' };

    const exactMatch = await callJudge([claim], [{ content: 'Growth reached 15.5%' }]);
    const closeMatch = await callJudge([claim], [{ content: 'Growth was approximately 16%' }]);
    const vagueMatch = await callJudge([claim], [{ content: 'Growth was significant' }]);

    expect(exactMatch[0].confidence).toBeGreaterThan(closeMatch[0].confidence);
    expect(closeMatch[0].confidence).toBeGreaterThan(vagueMatch[0].confidence);
  });
});
```

---

## 6. Golden Set Testing

### 6.1 Golden Set Structure

```typescript
// tests/fixtures/golden-set.json
{
  "version": "1.0",
  "cases": [
    {
      "id": "ltv-question",
      "query": "What is the maximum loan-to-value ratio?",
      "context": ["chunk_abc123", "chunk_def456"],
      "expected": {
        "containsText": ["80%", "loan-to-value"],
        "minCitations": 1,
        "claims": [
          { "pattern": "80%|eighty percent", "expectedVerdict": "supported" }
        ]
      }
    },
    {
      "id": "policy-summary",
      "query": "Summarize the refund policy",
      "context": ["chunk_refund1", "chunk_refund2"],
      "expected": {
        "containsText": ["refund", "days"],
        "minCitations": 2,
        "claims": [
          { "pattern": "\\d+ days?", "expectedVerdict": "supported" }
        ]
      }
    }
  ]
}
```

### 6.2 Golden Set Runner

```typescript
// tests/golden/runner.test.ts
import { describe, test, expect } from 'bun:test';
import goldenSet from '../fixtures/golden-set.json';

describe('Golden Set Validation', () => {
  for (const testCase of goldenSet.cases) {
    test(`[${testCase.id}] ${testCase.query.slice(0, 50)}...`, async () => {
      const result = await runPipeline({
        query: testCase.query,
        contextChunkIds: testCase.context,
      });

      // Text containment
      for (const text of testCase.expected.containsText) {
        expect(result.response.toLowerCase()).toContain(text.toLowerCase());
      }

      // Citation count
      const citations = extractCitations(result.response);
      expect(citations.length).toBeGreaterThanOrEqual(testCase.expected.minCitations);

      // Claim verdicts
      for (const expectedClaim of testCase.expected.claims) {
        const matchingClaim = result.ledger.entries.find(e =>
          new RegExp(expectedClaim.pattern, 'i').test(e.claimText)
        );

        expect(matchingClaim).toBeDefined();
        expect(matchingClaim?.verdict).toBe(expectedClaim.expectedVerdict);
      }
    });
  }
});
```

---

## 7. Regression Testing

### 7.1 Baseline Capture

```typescript
// scripts/capture-baseline.ts
import { runPipeline } from '../src/pipeline';
import testCases from './test-cases.json';

async function captureBaseline() {
  const baseline = [];

  for (const testCase of testCases) {
    const result = await runPipeline(testCase);

    baseline.push({
      id: testCase.id,
      timestamp: new Date().toISOString(),
      modelVersion: process.env.MODEL_VERSION,
      response: result.response,
      ledger: result.ledger,
      metrics: {
        claimCount: result.ledger.entries.length,
        supportedCount: result.ledger.entries.filter(e => e.verdict === 'supported').length,
        coverage: result.ledger.summary.coverage,
      },
    });
  }

  await Bun.write('./tests/baselines/latest.json', JSON.stringify(baseline, null, 2));
}

captureBaseline();
```

### 7.2 Regression Detection

```typescript
// tests/regression/detect-regression.test.ts
import { describe, test, expect } from 'bun:test';
import baseline from '../baselines/latest.json';

describe('Regression Detection', () => {
  for (const baseCase of baseline) {
    test(`[${baseCase.id}] maintains quality`, async () => {
      const current = await runPipeline({ id: baseCase.id });

      // Coverage shouldn't drop significantly
      expect(current.ledger.summary.coverage).toBeGreaterThanOrEqual(
        baseCase.metrics.coverage - 0.1
      );

      // Claim count should be similar
      expect(Math.abs(current.metrics.claimCount - baseCase.metrics.claimCount))
        .toBeLessThanOrEqual(2);

      // Key verdicts shouldn't flip
      const criticalClaims = baseCase.ledger.entries.filter(e => e.importance === 'critical');
      for (const baseClaim of criticalClaims) {
        const currentClaim = current.ledger.entries.find(e =>
          e.text.includes(baseClaim.text.slice(0, 20))
        );

        if (currentClaim && baseClaim.verdict === 'supported') {
          expect(currentClaim.verdict).not.toBe('contradicted');
        }
      }
    });
  }
});
```

---

## 8. Cost-Aware Testing

### 8.1 Test Budgets

```typescript
// tests/config/test-budget.ts
export const testBudget = {
  maxDailyApiCalls: 100,
  maxCostPerRun: 1.00, // USD
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
};

export function shouldSkipLiveTest(): boolean {
  const todaysCalls = readTodaysCallCount();
  return todaysCalls >= testBudget.maxDailyApiCalls;
}
```

### 8.2 Response Caching

```typescript
// tests/helpers/llm-cache.ts
import { createHash } from 'crypto';

const cache = new Map<string, { response: any; timestamp: number }>();

export async function cachedLLMCall(params: LLMParams): Promise<LLMResponse> {
  const cacheKey = createHash('md5')
    .update(JSON.stringify(params))
    .digest('hex');

  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < testBudget.cacheDuration) {
    return cached.response;
  }

  const response = await realLLMCall(params);
  cache.set(cacheKey, { response, timestamp: Date.now() });

  return response;
}
```

---

## 9. Smoke Tests (Live LLM)

```typescript
// tests/smoke/live-llm.test.ts
import { describe, test, expect } from 'bun:test';

describe('Live LLM Smoke Tests', () => {
  test.skipIf(shouldSkipLiveTest())('basic query works', async () => {
    const result = await runPipeline({
      query: 'What is the main topic of the documents?',
      workspaceId: 'smoke-test-workspace',
    });

    expect(result.response.length).toBeGreaterThan(50);
    expect(result.ledger.entries.length).toBeGreaterThan(0);
  });

  test.skipIf(shouldSkipLiveTest())('draft mode completes', async () => {
    const result = await runPipeline({
      query: 'Write a brief summary',
      workspaceId: 'smoke-test-workspace',
      mode: 'draft',
    });

    expect(result.response.length).toBeGreaterThan(200);
    expect(result.ledger.summary.coverage).toBeGreaterThan(0.5);
  });
});
```

---

## 10. Test Data Management

### 10.1 Fixtures

```
tests/fixtures/
├── documents/
│   ├── policy-sample.pdf
│   └── guidelines-sample.docx
├── chunks/
│   ├── policy-chunks.json
│   └── guidelines-chunks.json
├── llm-responses/
│   ├── writer-responses.json
│   ├── skeptic-responses.json
│   └── judge-responses.json
└── golden-set/
    ├── qa-cases.json
    └── draft-cases.json
```

### 10.2 Test Data Generation

```typescript
// scripts/generate-test-data.ts
async function generateTestChunks(documentPath: string): Promise<Chunk[]> {
  const text = await extractText(documentPath);
  const chunks = chunkDocument(text, { maxSize: 500 });

  // Add embeddings for semantic tests
  const embeddings = await generateEmbeddings(chunks.map(c => c.content));

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}
```
