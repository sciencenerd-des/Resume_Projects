# Claim Extraction

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

Claim extraction is the process of identifying verifiable statements within generated responses. This document details the extraction methodology, classification system, and structured output schemas.

---

## 2. What is a Claim?

### 2.1 Definition

A **claim** is any statement that:
1. Makes an assertion about reality
2. Can potentially be verified against source documents
3. Would affect user decisions or actions if incorrect

### 2.2 Claim vs. Non-Claim

```
┌─────────────────────────────────────────────────────────────┐
│                   Claim Classification                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IS A CLAIM:                                               │
│  ───────────                                               │
│  ✓ "The deadline is March 31, 2026"                        │
│  ✓ "All applications require two references"              │
│  ✓ "The fee is $150"                                       │
│  ✓ "Processing takes 5-7 business days"                   │
│  ✓ "Form XYZ must be submitted in triplicate"             │
│                                                             │
│  IS NOT A CLAIM:                                           │
│  ───────────────                                           │
│  ✗ "I hope this helps clarify the policy"                 │
│  ✗ "You might want to consider..."                        │
│  ✗ "Based on the documents you provided..."               │
│  ✗ "Therefore, in conclusion..."                          │
│  ✗ "What date would work for you?"                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Claim Types

### 3.1 Type Definitions

| Type | Description | Keywords/Patterns | Examples |
|------|-------------|-------------------|----------|
| **fact** | Verifiable statement about reality | is, are, was, were, has, have | "The office is open Monday-Friday" |
| **policy** | Rules, requirements, procedures | must, shall, required, should, permitted | "Applications must include a photo ID" |
| **numeric** | Numbers, dates, amounts, quantities | [digits], $, %, dates | "The fee is $500", "Due by April 15" |
| **definition** | Explanations of terms or concepts | means, refers to, is defined as | "A 'business day' means Monday-Friday" |

### 3.2 Type Classification Rules

```typescript
function classifyClaimType(claim: string): ClaimType {
  // Check for numeric content first (most specific)
  if (containsNumericContent(claim)) {
    return "numeric";
  }

  // Check for definition patterns
  if (isDefinition(claim)) {
    return "definition";
  }

  // Check for policy language
  if (containsPolicyLanguage(claim)) {
    return "policy";
  }

  // Default to fact
  return "fact";
}

function containsNumericContent(text: string): boolean {
  const patterns = [
    /\$[\d,]+/,           // Currency: $1,000
    /\d+%/,               // Percentage: 50%
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Date: 01/15/2026
    /\d+\s*(days?|weeks?|months?|years?|hours?)/i, // Duration
    /\b\d+\b/             // Any standalone number
  ];

  return patterns.some(p => p.test(text));
}

function isDefinition(text: string): boolean {
  const patterns = [
    /\bmeans\b/i,
    /\brefers to\b/i,
    /\bis defined as\b/i,
    /\bin this context\b/i,
    /"[^"]+"\s+(is|means|refers)/i
  ];

  return patterns.some(p => p.test(text));
}

function containsPolicyLanguage(text: string): boolean {
  const keywords = [
    "must", "shall", "required", "mandatory",
    "should", "permitted", "allowed", "prohibited",
    "eligible", "entitled", "obligation"
  ];

  const lowerText = text.toLowerCase();
  return keywords.some(k => lowerText.includes(k));
}
```

---

## 4. Importance Levels

### 4.1 Level Definitions

| Level | Criteria | Citation Requirement |
|-------|----------|---------------------|
| **critical** | Core answer to user's question; action-determining | Must have citation |
| **material** | Important supporting information | Should have citation |
| **minor** | Background, context, examples | Optional citation |

### 4.2 Importance Assessment Algorithm

```typescript
interface ImportanceContext {
  query: string;
  responsePosition: "beginning" | "middle" | "end";
  claimType: ClaimType;
  containsNumbers: boolean;
  isConditional: boolean;
}

function assessImportance(
  claim: string,
  context: ImportanceContext
): Importance {
  let score = 0;

  // Factor 1: Relevance to query (highest weight)
  const queryRelevance = calculateQueryRelevance(claim, context.query);
  score += queryRelevance * 40;

  // Factor 2: Claim type
  switch (context.claimType) {
    case "numeric":
      score += 25;  // Numbers are easily verifiable, high stakes
      break;
    case "policy":
      score += 20;  // Policy affects actions
      break;
    case "fact":
      score += 15;
      break;
    case "definition":
      score += 10;
      break;
  }

  // Factor 3: Position in response
  if (context.responsePosition === "beginning") {
    score += 15;  // Opening claims often answer the question directly
  }

  // Factor 4: Conditionality reduces importance
  if (context.isConditional) {
    score -= 10;
  }

  // Map score to importance level
  if (score >= 50) return "critical";
  if (score >= 30) return "material";
  return "minor";
}

function calculateQueryRelevance(claim: string, query: string): number {
  // Simplified: Check keyword overlap
  const queryWords = new Set(query.toLowerCase().split(/\s+/));
  const claimWords = claim.toLowerCase().split(/\s+/);

  const overlap = claimWords.filter(w => queryWords.has(w)).length;
  return Math.min(overlap / queryWords.size, 1);
}
```

---

## 5. Extraction Process

### 5.1 Extraction Pipeline

```mermaid
flowchart TD
    A[Response Text] --> B[Sentence Segmentation]
    B --> C[For Each Sentence]

    C --> D{Is Statement?}
    D -->|No| C

    D -->|Yes| E[Identify Assertions]
    E --> F{Contains Claim?}

    F -->|No| C
    F -->|Yes| G[Extract Claim Span]

    G --> H[Classify Type]
    H --> I[Assess Importance]
    I --> J[Find Citation Anchor]
    J --> K[Record Position]

    K --> L[Add to Claims List]
    L --> C

    C -->|All Processed| M[Post-Processing]
    M --> N[Merge Related Claims]
    N --> O[Validate Completeness]
    O --> P[Return Claims[]]
```

### 5.2 Sentence Segmentation

```typescript
function segmentSentences(text: string): Sentence[] {
  // Handle common abbreviations that contain periods
  const protected = text
    .replace(/\bMr\./g, "Mr\u0000")
    .replace(/\bMrs\./g, "Mrs\u0000")
    .replace(/\bDr\./g, "Dr\u0000")
    .replace(/\betc\./g, "etc\u0000")
    .replace(/\be\.g\./g, "eg\u0000")
    .replace(/\bi\.e\./g, "ie\u0000");

  // Split on sentence boundaries
  const sentences = protected.split(/(?<=[.!?])\s+/);

  return sentences.map((s, index) => ({
    text: s.replace(/\u0000/g, "."),
    index,
    start: text.indexOf(s),
    end: text.indexOf(s) + s.length
  }));
}
```

### 5.3 Claim Span Extraction

```typescript
interface ClaimSpan {
  text: string;
  start: number;
  end: number;
  citationAnchor?: string;
}

function extractClaimSpans(sentence: Sentence): ClaimSpan[] {
  const spans: ClaimSpan[] = [];

  // Pattern 1: Statement with citation
  const citedPattern = /([^.!?]+)\s*\[cite:([a-f0-9]+)\]/g;
  let match;

  while ((match = citedPattern.exec(sentence.text)) !== null) {
    spans.push({
      text: match[1].trim(),
      start: sentence.start + match.index,
      end: sentence.start + match.index + match[1].length,
      citationAnchor: match[2]
    });
  }

  // Pattern 2: Uncited but claim-like statements
  if (spans.length === 0 && isClaimLike(sentence.text)) {
    spans.push({
      text: sentence.text.replace(/\[cite:[^\]]+\]/g, "").trim(),
      start: sentence.start,
      end: sentence.end
    });
  }

  return spans;
}

function isClaimLike(text: string): boolean {
  // Exclude questions
  if (text.trim().endsWith("?")) return false;

  // Exclude pure connectors
  const connectors = ["however", "therefore", "additionally", "furthermore"];
  if (connectors.some(c => text.toLowerCase().startsWith(c + ","))) return false;

  // Exclude meta-statements
  const metaPhrases = [
    "I understand",
    "Based on your question",
    "Let me explain",
    "To summarize"
  ];
  if (metaPhrases.some(p => text.toLowerCase().includes(p.toLowerCase()))) return false;

  // Likely a claim if it makes an assertion
  const assertionVerbs = ["is", "are", "was", "were", "has", "have", "must", "shall"];
  return assertionVerbs.some(v => text.toLowerCase().includes(` ${v} `));
}
```

---

## 6. Citation Anchor Format

### 6.1 Anchor Syntax

```
Format: [cite:CHUNK_HASH]

Where:
- CHUNK_HASH is the first 8 characters of SHA-256 hash of normalized chunk content

Examples:
- [cite:a1b2c3d4]
- [cite:deadbeef]
- [cite:12345678]
```

### 6.2 Anchor Extraction

```typescript
interface CitationAnchor {
  anchor: string;       // Full anchor text: "[cite:a1b2c3d4]"
  chunkHash: string;    // Just the hash: "a1b2c3d4"
  position: number;     // Position in text
}

function extractCitationAnchors(text: string): CitationAnchor[] {
  const regex = /\[cite:([a-f0-9]{8})\]/gi;
  const anchors: CitationAnchor[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    anchors.push({
      anchor: match[0],
      chunkHash: match[1].toLowerCase(),
      position: match.index
    });
  }

  return anchors;
}
```

### 6.3 Claim-Citation Association

```typescript
function associateCitations(
  claims: Claim[],
  anchors: CitationAnchor[]
): void {
  for (const claim of claims) {
    // Find citations that appear within or immediately after the claim
    const relevantAnchors = anchors.filter(a =>
      a.position >= claim.start &&
      a.position <= claim.end + 20  // Allow small gap
    );

    claim.citationAnchors = relevantAnchors.map(a => a.chunkHash);
  }
}
```

---

## 7. Structured Output Schemas

### 7.1 Claim Schema

```typescript
interface Claim {
  id: string;
  text: string;
  type: "fact" | "policy" | "numeric" | "definition";
  importance: "critical" | "material" | "minor";
  requires_citation: boolean;

  // Position in response
  start_offset: number;
  end_offset: number;

  // Citation references
  citation_anchors: string[];  // chunk hashes

  // Metadata
  extracted_at: string;
  extraction_confidence: number;
}
```

### 7.2 JSON Schema for LLM Output

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "claims": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "text", "type", "importance"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^clm_[a-z0-9]+$"
          },
          "text": {
            "type": "string",
            "minLength": 5,
            "maxLength": 500
          },
          "type": {
            "type": "string",
            "enum": ["fact", "policy", "numeric", "definition"]
          },
          "importance": {
            "type": "string",
            "enum": ["critical", "material", "minor"]
          },
          "start_offset": {
            "type": "integer",
            "minimum": 0
          },
          "end_offset": {
            "type": "integer",
            "minimum": 0
          },
          "citation_anchors": {
            "type": "array",
            "items": {
              "type": "string",
              "pattern": "^[a-f0-9]{8}$"
            }
          }
        }
      }
    }
  },
  "required": ["claims"]
}
```

### 7.3 LLM Prompt for Extraction

```markdown
Extract all claims from the following response. For each claim, provide:
- id: Unique identifier (clm_001, clm_002, etc.)
- text: The exact claim text
- type: One of [fact, policy, numeric, definition]
- importance: One of [critical, material, minor]
- start_offset: Character position where claim starts
- end_offset: Character position where claim ends
- citation_anchors: Array of chunk hashes from [cite:X] anchors

Response to analyze:
---
{response_text}
---

Original query (for importance assessment):
{original_query}

Return valid JSON matching this schema:
{json_schema}
```

---

## 8. Post-Processing

### 8.1 Claim Merging

```typescript
function mergeRelatedClaims(claims: Claim[]): Claim[] {
  const merged: Claim[] = [];

  for (let i = 0; i < claims.length; i++) {
    const current = claims[i];

    // Check if this claim is a continuation of the previous
    if (i > 0 && shouldMerge(claims[i - 1], current)) {
      const previous = merged[merged.length - 1];
      previous.text += " " + current.text;
      previous.end_offset = current.end_offset;
      previous.citation_anchors.push(...current.citation_anchors);

      // Take higher importance
      if (importanceRank(current.importance) > importanceRank(previous.importance)) {
        previous.importance = current.importance;
      }
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function shouldMerge(a: Claim, b: Claim): boolean {
  // Merge if claims are adjacent and share type
  const adjacencyThreshold = 50; // characters
  return (
    b.start_offset - a.end_offset < adjacencyThreshold &&
    a.type === b.type
  );
}
```

### 8.2 Deduplication

```typescript
function deduplicateClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  const unique: Claim[] = [];

  for (const claim of claims) {
    const normalized = claim.text.toLowerCase().replace(/\s+/g, " ").trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(claim);
    }
  }

  return unique;
}
```

### 8.3 Validation

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateClaims(
  claims: Claim[],
  responseText: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const claim of claims) {
    // Check offset validity
    if (claim.start_offset < 0 || claim.end_offset > responseText.length) {
      errors.push(`Claim ${claim.id}: Invalid offsets`);
    }

    // Check text presence in response
    const extracted = responseText.substring(claim.start_offset, claim.end_offset);
    if (!extracted.includes(claim.text.substring(0, 20))) {
      warnings.push(`Claim ${claim.id}: Text may not match offset`);
    }

    // Check citation anchor validity
    for (const anchor of claim.citation_anchors) {
      if (!/^[a-f0-9]{8}$/.test(anchor)) {
        errors.push(`Claim ${claim.id}: Invalid citation anchor ${anchor}`);
      }
    }

    // Warn on critical claims without citations
    if (claim.importance === "critical" && claim.citation_anchors.length === 0) {
      warnings.push(`Claim ${claim.id}: Critical claim has no citation`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 9. Edge Cases

### 9.1 Compound Claims

A single sentence may contain multiple claims:

```
"The fee is $500, due by March 31, and payable by check or credit card."

Extracts to:
1. "The fee is $500" (numeric)
2. "due by March 31" (numeric)
3. "payable by check or credit card" (policy)
```

### 9.2 Conditional Claims

```
"If you are a first-time applicant, the fee is waived."

Treat as single claim with context:
- text: "If you are a first-time applicant, the fee is waived"
- type: "policy"
- importance: "material" (conditional reduces importance)
```

### 9.3 Quoted Content

```
"The policy states: 'All employees must complete training within 30 days.'"

Extract the inner quote as the claim:
- text: "All employees must complete training within 30 days"
- type: "policy"
```

### 9.4 Negative Claims

```
"The document does not mention any exceptions to this rule."

This IS a claim (about absence of information):
- text: "The document does not mention any exceptions to this rule"
- type: "fact"
- importance: "material"
```

---

## 10. Quality Metrics

### 10.1 Extraction Quality

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recall | > 95% | All verifiable statements extracted |
| Precision | > 90% | Extracted items are actual claims |
| Type accuracy | > 90% | Correct type classification |
| Importance accuracy | > 85% | Correct importance level |

### 10.2 Testing Strategy

```typescript
import { test, expect } from "bun:test";

const testCases = [
  {
    input: "The fee is $150 [cite:abc123].",
    expected: [{
      text: "The fee is $150",
      type: "numeric",
      importance: "critical",
      citation_anchors: ["abc123"]
    }]
  },
  {
    input: "All applications must be submitted online.",
    expected: [{
      text: "All applications must be submitted online",
      type: "policy",
      importance: "material",
      citation_anchors: []
    }]
  }
];

test("claim extraction", () => {
  for (const tc of testCases) {
    const result = extractClaims(tc.input, "What is the fee?");
    expect(result[0].type).toBe(tc.expected[0].type);
    expect(result[0].importance).toBe(tc.expected[0].importance);
  }
});
```
