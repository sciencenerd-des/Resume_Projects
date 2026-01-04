# PRD — Evidence-Ledger Copilot (Verified Answers + Verified Drafts)

**Working name:** VerityDraft  
**Doc owner:** Product / Engineering  
**Last updated:** 2026-01-03  
**Status:** Draft (MVP-focused)

---

## 1) Summary

Evidence-Ledger Copilot is a document-grounded assistant that answers questions and generates drafts **with auditable evidence**. It uses a **2–3 LLM verification setup** (Writer + Skeptic + Judge) to reduce hallucinations by:

- extracting claims from the generated output,
- verifying each claim against retrieved source snippets,
- forcing revision or marking uncertainty when evidence is missing,
- producing an **Evidence Ledger** (claim → citation → verdict).

---

## 2) Problem

LLM outputs are often fluent but unreliable. In real workflows (compliance, policy interpretation, official drafting, support, education), users need:

- correctness they can defend,
- citations tied to source documents,
- explicit uncertainty instead of confident guessing,
- alerts for contradictions or missing requirements.

Today’s typical “chatbot” experience fails because it optimizes for helpfulness, not verifiability.

---

## 3) Goals

### Product goals
- Provide answers/drafts that are **traceable to source documents**.
- Make hallucinations **hard to ship** by gating claims behind evidence checks.
- Give users a fast way to review, correct, and export outputs with citations.

### Success metrics (MVP)
- **Evidence coverage:** ≥ 85% of “material claims” supported by citations in provided sources.
- **Unsupported claim rate:** ≤ 5% of material claims (remaining must be clearly marked “Unknown/Not found”).
- **User trust proxy:** ≥ 40% of sessions export or copy output + ledger.
- **Time saved:** Users report ≥ 30% faster drafting vs manual.
- **Retention:** ≥ 25% weekly returning users in pilot cohort.

---

## 4) Non-goals (MVP)

- Real-time web browsing verification (optional v1+).
- “Guaranteed correctness” claims (we provide evidence and uncertainty, not omniscience).
- Full legal/medical advice workflows.
- Training custom foundation models (we orchestrate existing LLMs).

---

## 5) Target users & personas

### Persona A: Compliance/Policy Operator
- Needs: accurate interpretations, citations, audit trail, version-aware policy Q&A.
- Pain: contradictory documents, ambiguity, risk of wrong decisions.

### Persona B: Official Drafter (Gov/Enterprise)
- Needs: official language drafts (notices, memos), must cite clauses.
- Pain: time-consuming cross-referencing and formatting.

### Persona C: Educator/Trainer (optional niche)
- Needs: doc-grounded study notes, FAQs, syllabus rules with citations.
- Pain: misinformation and outdated guidelines.

---

## 6) Primary use cases

1. **Document-grounded Q&A**
   - “What does the policy say about X?”
   - Output includes citations + “Not found” flags if missing.

2. **Verified drafting**
   - “Draft an official reply letter based on these circulars.”
   - Output includes claim-linked citations.

3. **Contradiction / version conflict detection**
   - “These two docs differ—what conflicts exist?”

---

## 7) User stories

- As a user, I can upload PDFs and label them (type, department, date).
- As a user, I can ask a question and receive an answer with citations.
- As a user, I can request a draft and get an Evidence Ledger listing claims and sources.
- As a user, I can click a citation to view the source snippet in context.
- As a user, I can see “Unknown / Not found” instead of guesses.
- As a user, I can export (PDF/DOCX) with citations and a ledger appendix.
- As a user, I can choose “Strict mode” (no claim without evidence) vs “Helpful mode” (allows flagged speculation).

---

## 8) MVP scope

### In scope
- Authentication + workspace
- Document ingestion (PDF + DOCX minimum)
- Chunking + embeddings + vector search
- Chat UI with modes:
  - **Answer**
  - **Draft**
- 3-role LLM orchestration:
  - Writer
  - Skeptic
  - Judge/Verifier
- Evidence Ledger generation + UI
- Export (Markdown + PDF; DOCX optional)
- Basic admin dashboard (usage, errors, cost, latency)

### Out of scope (MVP)
- External web citations
- Slack/Teams integrations
- Multi-user collaboration with comments (v1)
- Fine-grained RBAC beyond basic workspace roles (v1)

---

## 9) User experience (UX)

### Core screens
1. **Workspace Home**
   - Recent sessions
   - Document library summary
   - “Upload docs” CTA

2. **Document Library**
   - Upload, tag, filter by date/type
   - Show extracted metadata (title/date/version if available)
   - Preview snippets + OCR indicator if needed

3. **Ask / Draft**
   - Input box with mode toggle (Answer / Draft)
   - Optional settings: Strict mode, citation density, tone templates

4. **Results**
   - Final answer/draft
   - Evidence Ledger panel:
     - Claim list
     - Verdict: Supported / Weak / Contradicted / Not found
     - Citation snippet + source doc link
   - Risk flags + “Missing info” section

5. **Export**
   - Export answer + ledger appendix

### UX principles
- “Trust the evidence trail, not the vibes.”
- Make uncertainty visible and actionable (ask questions, request missing docs).
- Keep citations one click away.

---

## 10) Functional requirements

### 10.1 Document ingestion
- Upload PDF/DOCX (MVP)
- Extract text + structure (headings if possible)
- Store metadata:
  - filename, upload time
  - user-provided tags (department, topic)
  - inferred doc date/version (best effort)
- Chunking strategy:
  - semantic chunks with overlap
  - stable chunk IDs for citations
- Create embeddings + store in vector DB
- Allow doc deletion (with downstream cleanup)

**Acceptance criteria**
- User uploads docs and they become searchable within 1–3 minutes for typical files (<50 pages).
- Citations link back to doc + chunk + offset.

### 10.2 Retrieval (RAG)
- Query → retrieve top K chunks (default K=8–12)
- Rerank (optional MVP) for best evidence quality
- Provide retrieved context to Writer + Judge

**Acceptance criteria**
- Retrieved sources displayed to user (optional “Show sources” toggle).

### 10.3 Multi-LLM verification workflow
**Core pipeline**
1. Retrieve evidence chunks
2. Writer generates answer/draft **with inline citation anchors**
3. Skeptic produces:
   - list of questionable claims
   - missing info questions
   - potential contradictions
4. Judge:
   - extracts claim list from Writer output
   - verifies claims against retrieved evidence
   - forces revisions OR marks uncertainty
   - outputs:
     - final response
     - evidence ledger
     - risk flags + follow-up questions

**Debate loop (bounded)**
- Up to N=2 revision cycles
- Stop early if:
  - evidence coverage ≥ threshold
  - contradiction score is low
  - no “Not found” claims above threshold

**Acceptance criteria**
- Unsupported claims are either removed or explicitly marked “Not found in provided documents.”
- Ledger always includes claim-level verdicts.

### 10.4 Evidence Ledger
- Table with columns:
  - Claim ID
  - Claim text
  - Type: Fact / Policy / Numeric / Definition
  - Evidence snippet
  - Source doc + location
  - Verdict: Supported / Weak / Contradicted / Not found
- Clickable citation opens doc viewer at snippet location

**Acceptance criteria**
- Ledger is generated for every response (Answer/Draft), even if short.

### 10.5 Exports
- Export:
  - Markdown (MVP)
  - PDF (MVP)
  - DOCX (v1 optional)
- Include:
  - final answer/draft
  - assumptions/unknowns
  - evidence ledger appendix

### 10.6 Feedback + improvement hooks
- User can mark:
  - “Helpful”
  - “Incorrect”
  - “Missing citation”
- Capture corrections for evaluation dataset (no training by default; just telemetry + optional fine-tuning later)

---

## 11) Model/engineering requirements

### 11.1 Model roles
- **Writer model:** best drafting quality
- **Skeptic model:** adversarial critique; can be cheaper
- **Judge model:** structured extraction + verification; must be reliable with JSON/schema outputs

### 11.2 Structured schemas (MVP)
- `Claims[]` schema:
  - `id`, `text`, `type`, `importance`, `requires_citation`
- `LedgerRow[]` schema:
  - `claim_id`, `verdict`, `evidence_chunk_ids[]`, `snippet`, `notes`
- `Risks[]` schema:
  - `risk_type`, `severity`, `description`, `mitigation`

### 11.3 Cost controls
- Cache embeddings and retrieval results
- Token budget per session:
  - max context chunks
  - max revision loops
- “Fast mode” (2-model) vs “Verified mode” (3-model)

---

## 12) Non-functional requirements

### Reliability & performance
- P95 response time (MVP target):
  - Q&A: < 20s
  - Draft + ledger: < 35s
- Graceful degradation:
  - If skeptic/judge fails, show Writer output with a warning and partial ledger

### Security & privacy
- Encrypt docs at rest and in transit
- Workspace isolation (no cross-tenant leakage)
- Data retention controls:
  - delete sessions/docs
  - configurable retention (v1)

### Compliance (directional)
- Support data-minimization and deletion requests
- If targeting India enterprise/government: align with DPDPA principles (consent, purpose limitation, deletion)

### Observability
- Track:
  - retrieval hit rate
  - evidence coverage
  - unsupported claim count
  - latency per pipeline stage
  - cost per session

---

## 13) Risks & mitigations

### Hallucinations persist via weak evidence
- Mitigation: strict gating; “Weak/Not found” labels; ask user for missing docs.

### Prompt injection / malicious docs
- Mitigation:
  - treat docs as untrusted input
  - retrieval sanitization
  - system prompts that forbid instruction-following from documents
  - judge checks for “instructional content” in retrieved chunks

### Conflicting documents / outdated versions
- Mitigation:
  - version tagging UI
  - conflict flags
  - freshness heuristics; prefer newest unless user pins a version

### Overconfidence UX
- Mitigation:
  - show uncertainty explicitly
  - confidence score based on checks (not model self-report)

---

## 14) Launch plan (MVP → v1)

### MVP (Pilot)
- Single-user workspaces
- Upload docs + Q&A + Draft + Ledger + PDF export
- Pilot with 5–20 users in one niche

### v1
- Team workspaces + roles
- DOCX export
- Integrations (Drive/SharePoint/Notion optional)
- Web verification mode (opt-in) for public sources

---

## 15) Open questions

1. Primary niche for launch: compliance/gov drafting vs customer support vs education?
2. Should the system be **documents-only** (safer) or allow **web verification** (more coverage)?
3. Required export formats: PDF + DOCX mandatory or optional?
4. Do users need multilingual drafting (English/Hindi/Bengali)?
5. What is the acceptable failure mode: refuse to answer vs answer with strong warnings?

---

## 16) Appendix — “Definition of done” (MVP)

- User uploads a PDF → can ask a question → receives a citation-backed answer + ledger.
- Unsupported claims are not silently shipped.
- Ledger citations open the source snippet.
- User can export response + ledger to PDF/Markdown.
- Basic telemetry shows evidence coverage and unsupported claim rate per session.
