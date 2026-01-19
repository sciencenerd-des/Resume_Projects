# Unit Test Guide

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

Unit tests validate individual functions and modules in isolation. This guide covers patterns for testing VerityDraft's core business logic.

---

## 2. Test Structure

### 2.1 File Organization

```
tests/
├── unit/
│   ├── lib/
│   │   ├── chunking.test.ts
│   │   ├── embedding.test.ts
│   │   ├── citations.test.ts
│   │   └── hash.test.ts
│   ├── business/
│   │   ├── claim-extraction.test.ts
│   │   ├── verdict-rules.test.ts
│   │   └── coverage-calculation.test.ts
│   └── utils/
│       ├── formatting.test.ts
│       └── validation.test.ts
├── fixtures/
│   ├── documents/
│   ├── chunks/
│   └── responses/
└── helpers/
    └── test-utils.ts
```

### 2.2 Test File Template

```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { functionUnderTest } from '../../src/lib/module';

describe('functionUnderTest', () => {
  // Group tests by behavior
  describe('when input is valid', () => {
    test('returns expected output', () => {
      // Arrange
      const input = { /* ... */ };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual({ /* ... */ });
    });
  });

  describe('when input is invalid', () => {
    test('throws appropriate error', () => {
      expect(() => functionUnderTest(null)).toThrow('Invalid input');
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      expect(functionUnderTest('')).toEqual([]);
    });
  });
});
```

---

## 3. Testing Patterns

### 3.1 Chunking Functions

```typescript
// tests/unit/lib/chunking.test.ts
import { describe, test, expect } from 'bun:test';
import { chunkDocument, splitByParagraphs, calculateOverlap } from '../../src/lib/chunking';

describe('chunkDocument', () => {
  describe('basic chunking', () => {
    test('creates chunks within size limit', () => {
      const text = 'A'.repeat(3000);
      const chunks = chunkDocument(text, { maxSize: 1000 });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every(c => c.content.length <= 1000)).toBe(true);
    });

    test('preserves all content', () => {
      const text = 'Hello world. This is a test.';
      const chunks = chunkDocument(text, { maxSize: 20 });

      const reconstructed = chunks
        .map(c => c.content)
        .join('')
        .replace(/\s+/g, ' ');

      expect(reconstructed).toContain('Hello world');
      expect(reconstructed).toContain('This is a test');
    });

    test('assigns sequential indices', () => {
      const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
      const chunks = chunkDocument(text, { maxSize: 20 });

      const indices = chunks.map(c => c.chunkIndex);
      expect(indices).toEqual([0, 1, 2]);
    });
  });

  describe('heading path tracking', () => {
    test('includes heading context in chunks', () => {
      const text = '# Section 1\n\nContent under section 1.';
      const headings = [{ level: 1, text: 'Section 1', offset: 0 }];

      const chunks = chunkDocument(text, { maxSize: 100 }, headings);

      expect(chunks[0].headingPath).toEqual(['Section 1']);
    });

    test('handles nested headings', () => {
      const text = '# Chapter\n\n## Section\n\nContent here.';
      const headings = [
        { level: 1, text: 'Chapter', offset: 0 },
        { level: 2, text: 'Section', offset: 12 },
      ];

      const chunks = chunkDocument(text, { maxSize: 100 }, headings);

      expect(chunks[0].headingPath).toEqual(['Chapter', 'Section']);
    });
  });

  describe('overlap handling', () => {
    test('creates specified overlap between chunks', () => {
      const text = 'Sentence one ends here. Sentence two starts here.';
      const chunks = chunkDocument(text, { maxSize: 30, overlap: 10 });

      if (chunks.length >= 2) {
        const endOfFirst = chunks[0].content.slice(-10);
        const startOfSecond = chunks[1].content.slice(0, 10);
        expect(endOfFirst).toBe(startOfSecond);
      }
    });
  });
});

describe('splitByParagraphs', () => {
  test('splits on double newlines', () => {
    const text = 'Para 1.\n\nPara 2.\n\nPara 3.';
    const paragraphs = splitByParagraphs(text);

    expect(paragraphs).toEqual(['Para 1.', 'Para 2.', 'Para 3.']);
  });

  test('handles Windows line endings', () => {
    const text = 'Para 1.\r\n\r\nPara 2.';
    const paragraphs = splitByParagraphs(text);

    expect(paragraphs).toEqual(['Para 1.', 'Para 2.']);
  });

  test('trims whitespace from paragraphs', () => {
    const text = '  Para 1.  \n\n  Para 2.  ';
    const paragraphs = splitByParagraphs(text);

    expect(paragraphs).toEqual(['Para 1.', 'Para 2.']);
  });
});
```

### 3.2 Citation Extraction

```typescript
// tests/unit/lib/citations.test.ts
import { describe, test, expect } from 'bun:test';
import { extractCitations, resolveCitationPositions, formatCitationAnchor } from '../../src/lib/citations';

describe('extractCitations', () => {
  test('extracts single citation', () => {
    const text = 'The rate is 5% [cite:abc123def456].';
    const citations = extractCitations(text);

    expect(citations).toEqual([
      { chunkId: 'abc123def456', position: 16, length: 21 },
    ]);
  });

  test('extracts multiple citations', () => {
    const text = 'Claim one [cite:aaa111] and claim two [cite:bbb222].';
    const citations = extractCitations(text);

    expect(citations).toHaveLength(2);
    expect(citations[0].chunkId).toBe('aaa111');
    expect(citations[1].chunkId).toBe('bbb222');
  });

  test('extracts adjacent citations', () => {
    const text = 'Multiple sources [cite:aaa][cite:bbb][cite:ccc].';
    const citations = extractCitations(text);

    expect(citations).toHaveLength(3);
  });

  test('returns empty array for no citations', () => {
    const text = 'No citations here.';
    const citations = extractCitations(text);

    expect(citations).toEqual([]);
  });

  test('ignores malformed citations', () => {
    const text = 'Bad [cite:] and [cite:tooshort].';
    const citations = extractCitations(text);

    expect(citations).toEqual([]);
  });
});

describe('resolveCitationPositions', () => {
  test('calculates character offsets', () => {
    const text = 'Start [cite:abc123] end.';
    const citations = extractCitations(text);
    const resolved = resolveCitationPositions(text, citations);

    expect(resolved[0].startOffset).toBe(6);
    expect(resolved[0].endOffset).toBe(19);
  });
});

describe('formatCitationAnchor', () => {
  test('formats as numbered reference', () => {
    const anchor = formatCitationAnchor('abc123', 1);
    expect(anchor).toBe('[1]');
  });

  test('preserves chunk ID for linking', () => {
    const anchor = formatCitationAnchor('abc123', 1, { includeId: true });
    expect(anchor).toContain('abc123');
  });
});
```

### 3.3 Claim Extraction

```typescript
// tests/unit/business/claim-extraction.test.ts
import { describe, test, expect } from 'bun:test';
import { extractClaims, classifyClaim, determineImportance } from '../../src/business/claims';

describe('extractClaims', () => {
  test('extracts factual claims', () => {
    const response = 'Revenue increased by 15%. This was driven by market expansion.';
    const claims = extractClaims(response);

    expect(claims).toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining('Revenue increased'),
        type: 'fact',
      })
    );
  });

  test('extracts numeric claims', () => {
    const response = 'The maximum LTV ratio is 80%.';
    const claims = extractClaims(response);

    expect(claims).toContainEqual(
      expect.objectContaining({
        text: expect.stringContaining('80%'),
        type: 'numeric',
      })
    );
  });

  test('marks claim positions', () => {
    const response = 'First claim here. Second claim here.';
    const claims = extractClaims(response);

    expect(claims[0]).toHaveProperty('startOffset');
    expect(claims[0]).toHaveProperty('endOffset');
  });
});

describe('classifyClaim', () => {
  test('classifies percentage as numeric', () => {
    expect(classifyClaim('Growth was 25%')).toBe('numeric');
  });

  test('classifies currency as numeric', () => {
    expect(classifyClaim('Revenue reached $10 million')).toBe('numeric');
  });

  test('classifies definitions', () => {
    expect(classifyClaim('LTV is defined as loan-to-value')).toBe('definition');
  });

  test('classifies policy statements', () => {
    expect(classifyClaim('Users must verify their identity')).toBe('policy');
  });

  test('defaults to fact for general statements', () => {
    expect(classifyClaim('The company expanded operations')).toBe('fact');
  });
});

describe('determineImportance', () => {
  test('marks numeric claims in conclusions as critical', () => {
    const claim = { text: '15% growth', type: 'numeric', position: 'conclusion' };
    expect(determineImportance(claim)).toBe('critical');
  });

  test('marks contradicted claims as critical', () => {
    const claim = { text: 'Competitors lost share', type: 'fact', hasContradiction: true };
    expect(determineImportance(claim)).toBe('critical');
  });

  test('marks minor qualifications as minor', () => {
    const claim = { text: 'approximately', type: 'fact', isQualifier: true };
    expect(determineImportance(claim)).toBe('minor');
  });
});
```

### 3.4 Verdict Rules

```typescript
// tests/unit/business/verdict-rules.test.ts
import { describe, test, expect } from 'bun:test';
import { determineVerdict, calculateConfidence, matchEvidence } from '../../src/business/verdicts';

describe('determineVerdict', () => {
  test('returns supported for strong match', () => {
    const claim = 'Revenue grew 15%';
    const evidence = 'Revenue increased by 15% in Q3';
    const similarity = 0.92;

    const verdict = determineVerdict(claim, evidence, similarity);

    expect(verdict).toBe('supported');
  });

  test('returns weak for partial match', () => {
    const claim = 'Revenue grew 15%';
    const evidence = 'Revenue showed positive growth';
    const similarity = 0.65;

    const verdict = determineVerdict(claim, evidence, similarity);

    expect(verdict).toBe('weak');
  });

  test('returns contradicted for conflicting evidence', () => {
    const claim = 'Revenue grew 15%';
    const evidence = 'Revenue declined by 5%';
    const similarity = 0.75; // Similar topic, opposite meaning

    const verdict = determineVerdict(claim, evidence, similarity, { isContradiction: true });

    expect(verdict).toBe('contradicted');
  });

  test('returns not_found for no matching evidence', () => {
    const claim = 'Market share increased';
    const evidence = null;
    const similarity = 0;

    const verdict = determineVerdict(claim, evidence, similarity);

    expect(verdict).toBe('not_found');
  });
});

describe('calculateConfidence', () => {
  test('returns high confidence for exact matches', () => {
    const confidence = calculateConfidence({
      semanticSimilarity: 0.95,
      lexicalOverlap: 0.8,
      numericMatch: true,
    });

    expect(confidence).toBeGreaterThan(0.9);
  });

  test('returns lower confidence for semantic-only match', () => {
    const confidence = calculateConfidence({
      semanticSimilarity: 0.85,
      lexicalOverlap: 0.3,
      numericMatch: false,
    });

    expect(confidence).toBeLessThan(0.8);
  });

  test('boosts confidence for numeric agreement', () => {
    const withNumeric = calculateConfidence({
      semanticSimilarity: 0.7,
      lexicalOverlap: 0.5,
      numericMatch: true,
    });

    const withoutNumeric = calculateConfidence({
      semanticSimilarity: 0.7,
      lexicalOverlap: 0.5,
      numericMatch: false,
    });

    expect(withNumeric).toBeGreaterThan(withoutNumeric);
  });
});

describe('matchEvidence', () => {
  test('finds best matching chunk', () => {
    const claim = 'Maximum loan-to-value is 80%';
    const chunks = [
      { id: 'a', content: 'Weather forecast for today' },
      { id: 'b', content: 'LTV ratio capped at 80% for primary residences' },
      { id: 'c', content: 'Interest rates vary by region' },
    ];

    const match = matchEvidence(claim, chunks);

    expect(match.chunkId).toBe('b');
    expect(match.similarity).toBeGreaterThan(0.7);
  });

  test('returns null for no good matches', () => {
    const claim = 'Quarterly earnings exceeded expectations';
    const chunks = [
      { id: 'a', content: 'Weather forecast for today' },
      { id: 'b', content: 'Company holiday schedule' },
    ];

    const match = matchEvidence(claim, chunks);

    expect(match).toBeNull();
  });
});
```

### 3.5 Coverage Calculation

```typescript
// tests/unit/business/coverage-calculation.test.ts
import { describe, test, expect } from 'bun:test';
import { calculateCoverage, meetsCoverageThreshold, generateCoverageSummary } from '../../src/business/coverage';

describe('calculateCoverage', () => {
  test('calculates percentage of supported claims', () => {
    const ledger = [
      { verdict: 'supported' },
      { verdict: 'supported' },
      { verdict: 'weak' },
      { verdict: 'not_found' },
    ];

    const coverage = calculateCoverage(ledger);

    expect(coverage).toBe(0.5); // 2 supported out of 4
  });

  test('includes weak claims in coverage', () => {
    const ledger = [
      { verdict: 'supported' },
      { verdict: 'weak' },
    ];

    const coverage = calculateCoverage(ledger, { includeWeak: true });

    expect(coverage).toBe(1.0); // Both count
  });

  test('weights by claim importance', () => {
    const ledger = [
      { verdict: 'supported', importance: 'critical' },
      { verdict: 'not_found', importance: 'minor' },
    ];

    const coverage = calculateCoverage(ledger, { weighted: true });

    // Critical claims weight more
    expect(coverage).toBeGreaterThan(0.5);
  });

  test('returns 1.0 for empty ledger', () => {
    const coverage = calculateCoverage([]);
    expect(coverage).toBe(1.0);
  });
});

describe('meetsCoverageThreshold', () => {
  test('returns true when coverage >= 85%', () => {
    expect(meetsCoverageThreshold(0.85)).toBe(true);
    expect(meetsCoverageThreshold(0.90)).toBe(true);
  });

  test('returns false when coverage < 85%', () => {
    expect(meetsCoverageThreshold(0.84)).toBe(false);
    expect(meetsCoverageThreshold(0.50)).toBe(false);
  });

  test('accepts custom threshold', () => {
    expect(meetsCoverageThreshold(0.70, { threshold: 0.70 })).toBe(true);
    expect(meetsCoverageThreshold(0.69, { threshold: 0.70 })).toBe(false);
  });
});

describe('generateCoverageSummary', () => {
  test('counts verdicts by type', () => {
    const ledger = [
      { verdict: 'supported' },
      { verdict: 'supported' },
      { verdict: 'weak' },
      { verdict: 'contradicted' },
      { verdict: 'not_found' },
    ];

    const summary = generateCoverageSummary(ledger);

    expect(summary).toEqual({
      total: 5,
      supported: 2,
      weak: 1,
      contradicted: 1,
      notFound: 1,
      coverage: 0.4,
    });
  });
});
```

---

## 4. Mocking Strategies

### 4.1 Function Mocking

```typescript
import { mock, spyOn } from 'bun:test';

// Mock a function
const mockFetch = mock(() => Promise.resolve({ json: () => ({ data: 'test' }) }));

// Spy on a method
const spy = spyOn(object, 'method');
expect(spy).toHaveBeenCalledWith('arg');
```

### 4.2 Module Mocking

```typescript
// tests/mocks/openai.ts
export const mockEmbeddings = {
  create: mock(() => Promise.resolve({
    data: [{ embedding: new Array(1536).fill(0) }],
  })),
};

// In test file
mock.module('openai', () => ({
  default: class {
    embeddings = mockEmbeddings;
  },
}));
```

---

## 5. Test Utilities

```typescript
// tests/helpers/test-utils.ts
import { expect } from 'bun:test';

export function expectChunksValid(chunks: Chunk[]) {
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.every(c => c.content.length > 0)).toBe(true);
  expect(chunks.every(c => c.chunkHash.length === 12)).toBe(true);
}

export function expectLedgerComplete(ledger: LedgerEntry[]) {
  expect(ledger.every(e => ['supported', 'weak', 'contradicted', 'not_found'].includes(e.verdict))).toBe(true);
  expect(ledger.every(e => e.confidence >= 0 && e.confidence <= 1)).toBe(true);
}

export function createMockChunk(overrides: Partial<Chunk> = {}): Chunk {
  return {
    id: crypto.randomUUID(),
    content: 'Test content',
    chunkHash: 'abc123def456',
    chunkIndex: 0,
    headingPath: [],
    startOffset: 0,
    endOffset: 12,
    ...overrides,
  };
}
```

---

## 6. Running Tests

```bash
# Run all unit tests
bun test tests/unit

# Run specific test file
bun test tests/unit/lib/chunking.test.ts

# Run with coverage
bun test --coverage tests/unit

# Run in watch mode
bun test --watch tests/unit

# Run matching pattern
bun test --filter "extractClaims" tests/unit
```
