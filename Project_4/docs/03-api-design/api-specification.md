# API Specification

> **Version:** 1.0
> **Base URL:** `/api`
> **Last Updated:** 2026-01-04

---

## 1. Overview

VerityDraft exposes a RESTful API for all client interactions. This document details all endpoints, request/response formats, and error handling.

---

## 2. Authentication

All API requests (except auth endpoints) require a valid JWT token in the Authorization header.

```
Authorization: Bearer <supabase_jwt_token>
```

### 2.1 Token Structure

```typescript
interface JWTPayload {
  sub: string;           // User ID
  email: string;
  aud: string;           // Audience
  role: string;          // User role
  exp: number;           // Expiration timestamp
  iat: number;           // Issued at timestamp
}
```

---

## 3. Common Response Formats

### 3.1 Success Response

API responses return the data directly without an envelope wrapper:

```json
// Array response (e.g., list endpoints)
[
  { "id": "ws_abc123", "name": "Compliance Team", ... },
  { "id": "ws_def456", "name": "Legal Team", ... }
]

// Object response (e.g., single resource)
{
  "id": "ws_abc123",
  "name": "Compliance Team",
  "role": "owner",
  "created_at": "2026-01-01T00:00:00Z"
}
```

### 3.2 Error Response

```json
{
  "detail": "Invalid request parameters"
}
```

### 3.3 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## 4. Workspace Endpoints

### 4.1 List Workspaces

```
GET /api/workspaces
```

**Response:**
```json
[
  {
    "id": "ws_abc123",
    "name": "Compliance Team",
    "role": "owner",
    "created_at": "2026-01-01T00:00:00Z",
    "document_count": 15,
    "session_count": 42
  }
]
```

### 4.2 Create Workspace

```
POST /api/workspaces
```

**Request:**
```json
{
  "name": "New Workspace"
}
```

**Response:**
```json
{
  "id": "ws_xyz789",
  "name": "New Workspace",
  "role": "owner",
  "settings": { ... },
  "created_at": "2026-01-03T14:30:00Z"
}
```

### 4.3 Get Workspace

```
GET /api/workspaces/:workspace_id
```

### 4.4 Update Workspace

```
PUT /api/workspaces/:workspace_id
```

### 4.5 Delete Workspace

```
DELETE /api/workspaces/:workspace_id
```

---

## 5. Document Endpoints

### 5.1 List Documents

```
GET /workspaces/:workspace_id/documents
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| status | string | Filter by status: uploading, processing, ready, error |
| tags | string[] | Filter by tags |
| search | string | Search in filename |

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_abc123",
        "filename": "HR_Policy_2024.pdf",
        "file_type": "pdf",
        "file_size": 1024000,
        "status": "ready",
        "chunk_count": 45,
        "tags": ["hr", "policy"],
        "created_at": "2026-01-02T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

### 5.2 Upload Document

```
POST /workspaces/:workspace_id/documents/upload
Content-Type: multipart/form-data
```

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | PDF or DOCX file |
| tags | string | No | Comma-separated tags |
| metadata | JSON | No | Additional metadata |

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_xyz789",
      "filename": "Leave_Guidelines.pdf",
      "status": "processing",
      "estimated_completion": "2026-01-03T14:32:00Z"
    }
  }
}
```

### 5.3 Get Document

```
GET /documents/:document_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_abc123",
      "filename": "HR_Policy_2024.pdf",
      "file_type": "pdf",
      "file_size": 1024000,
      "status": "ready",
      "chunk_count": 45,
      "tags": ["hr", "policy"],
      "metadata": {
        "inferred_date": "2024-01-15",
        "inferred_version": "3.0"
      },
      "created_at": "2026-01-02T10:00:00Z",
      "download_url": "https://..."
    }
  }
}
```

### 5.4 Get Document Chunks

```
GET /documents/:document_id/chunks
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "chunks": [
      {
        "id": "chunk_001",
        "chunk_hash": "a1b2c3d4",
        "content": "All permanent employees shall receive...",
        "chunk_index": 0,
        "page_number": 12,
        "heading_path": ["Section 4", "Leave Policy"]
      }
    ]
  }
}
```

### 5.5 Delete Document

```
DELETE /documents/:document_id
```

---

## 6. Query Endpoint

### 6.1 Submit Query

```
POST /workspaces/:workspace_id/query
```

**Request:**
```json
{
  "query": "What is the annual leave policy?",
  "mode": "answer",
  "settings": {
    "strict_mode": false,
    "citation_density": "normal",
    "verification_mode": "verified"
  },
  "document_ids": ["doc_abc123", "doc_def456"]
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | User's question or draft request |
| mode | string | Yes | "answer" or "draft" |
| settings.strict_mode | boolean | No | Reject claims without evidence (default: false) |
| settings.citation_density | string | No | "minimal", "normal", "verbose" |
| settings.verification_mode | string | No | "fast" (2-LLM) or "verified" (3-LLM) |
| document_ids | string[] | No | Limit search to specific documents |

**Response (Streaming):**

The response is streamed using Server-Sent Events (SSE):

```
Content-Type: text/event-stream

event: session_created
data: {"session_id": "ses_abc123"}

event: retrieval_complete
data: {"chunks_retrieved": 8}

event: content_chunk
data: {"delta": "Based on", "citations": []}

event: content_chunk
data: {"delta": " the policy documents", "citations": []}

event: content_chunk
data: {"delta": " [cite:a1b2c3d4]", "citations": [{"hash": "a1b2c3d4"}]}

event: claim_verified
data: {"claim_id": "clm_001", "verdict": "supported", "confidence": 0.92}

event: ledger_updated
data: {"entry": {...}, "summary": {"supported": 1, "total": 1}}

event: generation_complete
data: {
  "session_id": "ses_abc123",
  "response": "Based on the policy documents...",
  "evidence_ledger": {...},
  "risk_flags": [],
  "metadata": {
    "evidence_coverage": 0.92,
    "processing_time_ms": 8500,
    "token_count": 3200
  }
}
```

---

## 7. Session Endpoints

### 7.1 Get Session

```
GET /sessions/:session_id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "ses_abc123",
      "workspace_id": "ws_xyz789",
      "query": "What is the annual leave policy?",
      "mode": "answer",
      "response": "Based on the policy documents...",
      "status": "completed",
      "created_at": "2026-01-03T14:30:00Z",
      "completed_at": "2026-01-03T14:30:08Z",
      "metadata": {
        "evidence_coverage": 0.92,
        "unsupported_claim_count": 1,
        "processing_time_ms": 8500
      }
    }
  }
}
```

### 7.2 Get Session Ledger

```
GET /sessions/:session_id/ledger
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ledger": {
      "id": "led_abc123",
      "session_id": "ses_abc123",
      "entries": [
        {
          "id": "ent_001",
          "claim_id": "clm_001",
          "claim_text": "Employees are entitled to 15 days of annual leave",
          "claim_type": "policy",
          "claim_importance": "critical",
          "verdict": "supported",
          "confidence_score": 0.92,
          "evidence_snippet": "All permanent employees shall receive 15 days...",
          "source_document": {
            "id": "doc_abc123",
            "filename": "HR_Policy.pdf",
            "page_number": 12
          }
        }
      ],
      "summary": {
        "total_claims": 4,
        "supported": 3,
        "weak": 0,
        "contradicted": 0,
        "not_found": 1,
        "evidence_coverage": 0.75
      },
      "risk_flags": [
        {
          "type": "missing_evidence",
          "severity": "medium",
          "description": "1 claim could not be verified"
        }
      ]
    }
  }
}
```

### 7.3 Submit Feedback

```
POST /sessions/:session_id/feedback
```

**Request:**
```json
{
  "feedback_type": "incorrect",
  "comment": "The leave policy was updated last month",
  "corrections": [
    {
      "claim_id": "clm_002",
      "issue": "wrong_verdict",
      "expected_verdict": "supported",
      "explanation": "This is covered in the new policy update"
    }
  ]
}
```

### 7.4 Export Session

```
POST /sessions/:session_id/export
```

**Request:**
```json
{
  "format": "pdf",
  "include_ledger": true,
  "include_sources": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.../export_ses_abc123.pdf",
    "expires_at": "2026-01-03T15:30:00Z"
  }
}
```

---

## 8. Admin Endpoints

### 8.1 Get Usage Metrics

```
GET /admin/usage
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | string | ISO date (default: 30 days ago) |
| end_date | string | ISO date (default: today) |
| workspace_id | string | Filter by workspace |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-12-03",
      "end": "2026-01-03"
    },
    "metrics": {
      "total_sessions": 450,
      "total_documents": 128,
      "total_queries": 890,
      "avg_evidence_coverage": 0.87,
      "avg_response_time_ms": 12500
    },
    "daily": [
      {
        "date": "2026-01-03",
        "sessions": 15,
        "queries": 28
      }
    ]
  }
}
```

### 8.2 Get Error Log

```
GET /admin/errors
```

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": "err_abc123",
        "type": "PROCESSING_FAILED",
        "message": "PDF extraction failed: corrupt file",
        "resource_type": "document",
        "resource_id": "doc_xyz789",
        "timestamp": "2026-01-03T14:00:00Z"
      }
    ]
  }
}
```

### 8.3 Get Cost Summary

```
GET /admin/costs
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2026-01-01",
      "end": "2026-01-03"
    },
    "totals": {
      "llm_cost_usd": 45.67,
      "embedding_cost_usd": 12.34,
      "storage_cost_usd": 5.00,
      "total_cost_usd": 63.01
    },
    "by_model": {
      "gpt-5-nano": { "tokens": 1500000, "cost_usd": 25.00 },
      "kimi-k2-thinking": { "tokens": 800000, "cost_usd": 8.00 },
      "glm-4.7": { "tokens": 600000, "cost_usd": 10.00 },
      "text-embedding-3-small": { "tokens": 2000000, "cost_usd": 12.34 }
    }
  }
}
```

---

## 9. Rate Limits

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Query (verified mode) | 10 requests | 1 minute |
| Query (fast mode) | 30 requests | 1 minute |
| Document upload | 20 requests | 1 hour |
| General API | 100 requests | 1 minute |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704295860
```

---

## 10. Pagination

Paginated endpoints follow a consistent format:

**Request:**
```
GET /workspaces/:id/documents?page=2&limit=20
```

**Response:**
```json
{
  "data": {
    "documents": [...],
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": true
    }
  }
}
```

---

## 11. Versioning

The API is versioned via the URL path: `/api/v1/...`

When breaking changes are introduced, a new version will be released (e.g., `/api/v2/...`). Previous versions will be supported for at least 6 months after deprecation.
