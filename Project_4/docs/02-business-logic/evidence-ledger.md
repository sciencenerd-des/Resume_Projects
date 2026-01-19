# Evidence Ledger

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

The Evidence Ledger is the core data structure that maps claims in generated responses to their supporting evidence. It provides an auditable trail that users can review to verify the accuracy of AI-generated content.

---

## 2. Ledger Purpose

### 2.1 Core Functions

| Function | Description |
|----------|-------------|
| **Traceability** | Link every claim to its source document |
| **Verification** | Show whether claims are supported by evidence |
| **Transparency** | Make AI decision-making visible to users |
| **Auditability** | Provide a record for compliance and review |

### 2.2 User Value

```
┌─────────────────────────────────────────────────────────────┐
│                  Evidence Ledger Value                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  For Users:                                                │
│  ✓ Quickly identify which claims are verified              │
│  ✓ Click to see original source text                       │
│  ✓ Understand what information is missing                  │
│  ✓ Export evidence trail for records                       │
│                                                             │
│  For Organizations:                                        │
│  ✓ Audit trail for compliance                             │
│  ✓ Reduce risk of acting on hallucinations                │
│  ✓ Document decision-making basis                         │
│  ✓ Quality metrics for AI outputs                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Structure

### 3.1 Core Schema

```typescript
interface EvidenceLedger {
  id: string;                    // UUID
  session_id: string;            // Reference to parent session
  created_at: string;            // ISO timestamp
  updated_at: string;

  entries: LedgerEntry[];        // Individual claim-evidence pairs
  summary: LedgerSummary;        // Aggregate statistics
  risk_flags: RiskFlag[];        // Identified risks
  follow_up_questions: string[]; // Suggested clarifications
}

interface LedgerEntry {
  id: string;                    // UUID
  claim_id: string;              // Reference to claim record

  // Claim information (denormalized for display)
  claim_text: string;
  claim_type: ClaimType;
  claim_importance: Importance;

  // Verdict
  verdict: Verdict;
  confidence_score: number;      // 0.0 - 1.0

  // Evidence
  evidence_chunk_ids: string[];  // References to document_chunks
  evidence_snippet: string;      // Key quote from source
  source_document: {
    id: string;
    filename: string;
    page_number?: number;
    heading_path?: string[];
  };

  // Reasoning
  notes: string;                 // Judge's explanation
}
```

### 3.2 Type Definitions

```typescript
type ClaimType = "fact" | "policy" | "numeric" | "definition";

type Importance = "critical" | "material" | "minor";

type Verdict = "supported" | "weak" | "contradicted" | "not_found";

interface LedgerSummary {
  total_claims: number;
  by_verdict: {
    supported: number;
    weak: number;
    contradicted: number;
    not_found: number;
  };
  by_importance: {
    critical: number;
    material: number;
    minor: number;
  };
  evidence_coverage: number;     // 0.0 - 1.0
  unsupported_rate: number;      // 0.0 - 1.0
}

interface RiskFlag {
  id: string;
  type: RiskType;
  severity: "high" | "medium" | "low";
  description: string;
  affected_claim_ids: string[];
  mitigation?: string;
}

type RiskType =
  | "missing_evidence"
  | "contradiction"
  | "outdated_source"
  | "ambiguous_evidence"
  | "conflicting_sources"
  | "low_confidence";
```

---

## 4. Verdict System

### 4.1 Verdict Definitions

```
┌─────────────────────────────────────────────────────────────┐
│                     Verdict Definitions                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUPPORTED (Green)                                         │
│  ─────────────────                                         │
│  • Evidence directly states or clearly implies the claim   │
│  • Confidence score > 0.8                                  │
│  • No reasonable alternative interpretation                │
│                                                             │
│  WEAK (Amber)                                              │
│  ────────────                                              │
│  • Evidence partially supports the claim                   │
│  • Requires some interpretation or inference               │
│  • Confidence score 0.5 - 0.8                              │
│  • User should verify independently                        │
│                                                             │
│  CONTRADICTED (Red)                                        │
│  ──────────────────                                        │
│  • Evidence directly conflicts with the claim              │
│  • Multiple sources disagree on this point                 │
│  • Claim should be corrected or removed                    │
│                                                             │
│  NOT FOUND (Gray)                                          │
│  ─────────────────                                         │
│  • No relevant evidence in provided documents              │
│  • Claim cannot be verified from available sources         │
│  • User may need to upload additional documents            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Verdict Assignment Rules

```typescript
function assignVerdict(
  claim: Claim,
  evidence: EvidenceMatch[]
): VerdictAssignment {
  // No evidence found
  if (evidence.length === 0) {
    return {
      verdict: "not_found",
      confidence: 0,
      notes: "No matching evidence found in provided documents"
    };
  }

  // Check for contradictions first
  const contradiction = evidence.find(e => e.contradicts);
  if (contradiction) {
    return {
      verdict: "contradicted",
      confidence: contradiction.similarity,
      notes: `Evidence contradicts claim: "${contradiction.snippet}"`
    };
  }

  // Evaluate support level
  const bestMatch = evidence[0];  // Highest similarity

  if (bestMatch.supportLevel === "full" && bestMatch.similarity > 0.85) {
    return {
      verdict: "supported",
      confidence: bestMatch.similarity,
      notes: `Directly supported by: "${bestMatch.snippet}"`
    };
  }

  if (bestMatch.supportLevel === "partial" || bestMatch.similarity <= 0.85) {
    return {
      verdict: "weak",
      confidence: bestMatch.similarity * 0.8,
      notes: `Partially supported: "${bestMatch.snippet}"`
    };
  }

  return {
    verdict: "not_found",
    confidence: 0,
    notes: "Evidence does not adequately support claim"
  };
}
```

---

## 5. Citation Linking

### 5.1 Citation Anchor Format

```
In the response text:
"Employees are entitled to 15 days of annual leave [cite:a1b2c3d4]."
                                                    └────────────┘
                                                    Citation anchor

In the ledger:
{
  claim_text: "Employees are entitled to 15 days of annual leave",
  evidence_chunk_ids: ["a1b2c3d4"],
  evidence_snippet: "All permanent employees shall receive 15 days of paid annual leave.",
  source_document: {
    filename: "HR_Policy_2024.pdf",
    page_number: 12
  }
}
```

### 5.2 Chunk Hash Generation

```typescript
import { createHash } from "crypto";

function generateChunkHash(content: string): string {
  // Normalize content
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // Generate SHA-256 hash
  const hash = createHash("sha256")
    .update(normalized)
    .digest("hex");

  // Return first 8 characters (sufficient for uniqueness)
  return hash.substring(0, 8);
}

// Example
const chunk = "All permanent employees shall receive 15 days of paid annual leave.";
const hash = generateChunkHash(chunk);  // "a1b2c3d4"
```

### 5.3 Citation Resolution

```typescript
interface CitationResolution {
  chunk_hash: string;
  resolved: boolean;
  chunk?: DocumentChunk;
  error?: string;
}

async function resolveCitation(
  chunkHash: string,
  workspaceId: string
): Promise<CitationResolution> {
  const chunk = await db.query(`
    SELECT dc.*
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE dc.chunk_hash = $1
      AND d.workspace_id = $2
      AND d.status = 'ready'
  `, [chunkHash, workspaceId]);

  if (!chunk) {
    return {
      chunk_hash: chunkHash,
      resolved: false,
      error: "Citation references deleted or unavailable chunk"
    };
  }

  return {
    chunk_hash: chunkHash,
    resolved: true,
    chunk
  };
}
```

---

## 6. Confidence Scoring

### 6.1 Score Components

```typescript
interface ConfidenceComponents {
  semantic_similarity: number;   // 0-1: How similar claim is to evidence
  evidence_count: number;        // Bonus for multiple sources
  directness: number;            // 1 = direct quote, 0.5 = inference
  source_quality: number;        // Based on document metadata
}

function calculateConfidence(components: ConfidenceComponents): number {
  // Base: semantic similarity (60% weight)
  let score = components.semantic_similarity * 0.6;

  // Multi-source bonus (up to 15%)
  const sourceBonus = Math.min(components.evidence_count - 1, 3) * 0.05;
  score += sourceBonus;

  // Directness factor (up to 15%)
  score += components.directness * 0.15;

  // Source quality factor (up to 10%)
  score += components.source_quality * 0.1;

  // Clamp to [0, 1]
  return Math.min(Math.max(score, 0), 1);
}
```

### 6.2 Confidence Thresholds

| Score Range | Interpretation | UI Display |
|-------------|----------------|------------|
| 0.85 - 1.0 | High confidence | Solid green badge |
| 0.7 - 0.84 | Good confidence | Light green badge |
| 0.5 - 0.69 | Moderate confidence | Amber badge |
| 0.3 - 0.49 | Low confidence | Light amber badge |
| 0 - 0.29 | Very low confidence | Gray badge |

---

## 7. Risk Flags

### 7.1 Risk Types

```typescript
const riskDefinitions: Record<RiskType, RiskDefinition> = {
  missing_evidence: {
    description: "Critical claim has no supporting evidence",
    defaultSeverity: "high",
    userAction: "Upload relevant documents or remove claim"
  },

  contradiction: {
    description: "Evidence directly contradicts the claim",
    defaultSeverity: "high",
    userAction: "Review conflicting sources and correct claim"
  },

  outdated_source: {
    description: "Source document may be outdated",
    defaultSeverity: "medium",
    userAction: "Verify with current documentation"
  },

  ambiguous_evidence: {
    description: "Evidence is open to interpretation",
    defaultSeverity: "medium",
    userAction: "Seek clarification or additional sources"
  },

  conflicting_sources: {
    description: "Multiple sources provide different information",
    defaultSeverity: "high",
    userAction: "Determine authoritative source"
  },

  low_confidence: {
    description: "Claim support is weak across all evidence",
    defaultSeverity: "low",
    userAction: "Consider qualifying or removing claim"
  }
};
```

### 7.2 Risk Flag Generation

```typescript
function generateRiskFlags(ledger: EvidenceLedger): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Check for unsupported critical claims
  const unsupportedCritical = ledger.entries.filter(
    e => e.verdict === "not_found" && e.claim_importance === "critical"
  );

  if (unsupportedCritical.length > 0) {
    flags.push({
      id: generateId(),
      type: "missing_evidence",
      severity: "high",
      description: `${unsupportedCritical.length} critical claim(s) have no supporting evidence`,
      affected_claim_ids: unsupportedCritical.map(e => e.claim_id),
      mitigation: "Upload relevant documents or revise response"
    });
  }

  // Check for contradictions
  const contradicted = ledger.entries.filter(e => e.verdict === "contradicted");

  if (contradicted.length > 0) {
    flags.push({
      id: generateId(),
      type: "contradiction",
      severity: "high",
      description: `${contradicted.length} claim(s) contradict the source documents`,
      affected_claim_ids: contradicted.map(e => e.claim_id),
      mitigation: "Review and correct the contradicted claims"
    });
  }

  // Check for low overall confidence
  const avgConfidence = ledger.entries.reduce(
    (sum, e) => sum + e.confidence_score, 0
  ) / ledger.entries.length;

  if (avgConfidence < 0.6 && ledger.entries.length > 0) {
    flags.push({
      id: generateId(),
      type: "low_confidence",
      severity: "medium",
      description: `Overall confidence is low (${(avgConfidence * 100).toFixed(0)}%)`,
      affected_claim_ids: ledger.entries
        .filter(e => e.confidence_score < 0.6)
        .map(e => e.claim_id)
    });
  }

  return flags;
}
```

---

## 8. Ledger Display

### 8.1 Table Format

```
┌────┬─────────────────────────────────┬──────────┬───────────┬─────────────────────────────┐
│ #  │ Claim                           │ Type     │ Verdict   │ Source                      │
├────┼─────────────────────────────────┼──────────┼───────────┼─────────────────────────────┤
│ 1  │ Employees are entitled to 15    │ Policy   │ ✓ Supported│ HR_Policy.pdf, p.12        │
│    │ days of annual leave            │          │           │                             │
├────┼─────────────────────────────────┼──────────┼───────────┼─────────────────────────────┤
│ 2  │ Leave requests must be          │ Policy   │ ✓ Supported│ Leave_Guidelines.pdf, §3.2 │
│    │ submitted 2 weeks in advance    │          │           │                             │
├────┼─────────────────────────────────┼──────────┼───────────┼─────────────────────────────┤
│ 3  │ Unused leave can be carried     │ Policy   │ ? Weak    │ HR_Policy.pdf, p.15        │
│    │ forward to next year            │          │           │ (partial match)             │
├────┼─────────────────────────────────┼──────────┼───────────┼─────────────────────────────┤
│ 4  │ Maximum carryover is 5 days     │ Numeric  │ ○ Not Found│ -                          │
│    │                                 │          │           │                             │
└────┴─────────────────────────────────┴──────────┴───────────┴─────────────────────────────┘
```

### 8.2 Expanded View

When user clicks a row:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Claim #3: Unused leave can be carried forward to next year                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Verdict: WEAK (Confidence: 65%)                                            │
│                                                                             │
│ Evidence Snippet:                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ "Unused annual leave may be carried over at the discretion of the       ││
│ │ department head, subject to operational requirements."                  ││
│ │                                                                         ││
│ │ — HR_Policy.pdf, Page 15, Section 4.2                                   ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Judge's Notes:                                                             │
│ The evidence suggests carryover is possible but discretionary, not         │
│ automatic. The claim should be qualified to reflect this.                  │
│                                                                             │
│ [View in Document] [Copy Citation]                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Export Format

### 9.1 Markdown Export

```markdown
## Evidence Ledger

**Session:** Leave Policy Q&A
**Generated:** 2026-01-03 14:30 UTC
**Evidence Coverage:** 75%

### Summary

| Verdict | Count |
|---------|-------|
| Supported | 2 |
| Weak | 1 |
| Not Found | 1 |

### Claims Detail

#### 1. Employees are entitled to 15 days of annual leave

- **Type:** Policy
- **Importance:** Critical
- **Verdict:** ✓ Supported (Confidence: 92%)
- **Source:** HR_Policy.pdf, Page 12
- **Evidence:** "All permanent employees shall receive 15 days of paid annual leave per calendar year."

---

#### 2. Leave requests must be submitted 2 weeks in advance

- **Type:** Policy
- **Importance:** Material
- **Verdict:** ✓ Supported (Confidence: 88%)
- **Source:** Leave_Guidelines.pdf, Section 3.2
- **Evidence:** "Leave applications must be submitted at least 14 calendar days before the intended start date."

---

[Additional claims...]

### Risk Flags

⚠️ **Missing Evidence (High):** 1 claim could not be verified from provided documents.

### Recommended Actions

1. Upload additional policy documents covering leave carryover limits
2. Review claim #4 and consider removing or qualifying
```

### 9.2 JSON Export

```json
{
  "ledger_id": "led_abc123",
  "session_id": "ses_xyz789",
  "generated_at": "2026-01-03T14:30:00Z",
  "summary": {
    "total_claims": 4,
    "evidence_coverage": 0.75,
    "by_verdict": {
      "supported": 2,
      "weak": 1,
      "contradicted": 0,
      "not_found": 1
    }
  },
  "entries": [
    {
      "claim_id": "clm_001",
      "claim_text": "Employees are entitled to 15 days of annual leave",
      "claim_type": "policy",
      "importance": "critical",
      "verdict": "supported",
      "confidence_score": 0.92,
      "evidence": {
        "chunk_ids": ["a1b2c3d4"],
        "snippet": "All permanent employees shall receive 15 days of paid annual leave per calendar year.",
        "source": {
          "document_id": "doc_hr001",
          "filename": "HR_Policy.pdf",
          "page_number": 12
        }
      },
      "notes": "Direct quote from source document"
    }
  ],
  "risk_flags": [
    {
      "type": "missing_evidence",
      "severity": "high",
      "description": "1 claim could not be verified",
      "affected_claims": ["clm_004"]
    }
  ]
}
```

---

## 10. Database Schema

### 10.1 Claims Table

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Claim content
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('fact', 'policy', 'numeric', 'definition')),
  importance TEXT NOT NULL CHECK (importance IN ('critical', 'material', 'minor')),
  requires_citation BOOLEAN DEFAULT true,

  -- Position in response
  start_offset INTEGER,
  end_offset INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_claims_session ON claims(session_id);
```

### 10.2 Evidence Ledger Table

```sql
CREATE TABLE evidence_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,

  -- Verdict
  verdict TEXT NOT NULL CHECK (verdict IN ('supported', 'weak', 'contradicted', 'not_found')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Evidence references
  chunk_ids UUID[] NOT NULL DEFAULT '{}',
  evidence_snippet TEXT,

  -- Reasoning
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(session_id, claim_id)
);

CREATE INDEX idx_ledger_session ON evidence_ledger(session_id);
CREATE INDEX idx_ledger_verdict ON evidence_ledger(verdict);
```

---

## 11. API Endpoints

### 11.1 Get Ledger

```
GET /api/v1/sessions/:session_id/ledger

Response:
{
  "ledger": EvidenceLedger,
  "session": {
    "id": "...",
    "query": "...",
    "mode": "answer"
  }
}
```

### 11.2 Export Ledger

```
POST /api/v1/sessions/:session_id/ledger/export

Request:
{
  "format": "markdown" | "json" | "pdf"
}

Response:
{
  "download_url": "...",
  "expires_at": "..."
}
```
