# User Journeys

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

This document maps the end-to-end user flows through VerityDraft, from document upload to verified output export.

---

## 2. Journey Map

```mermaid
graph LR
    subgraph "Onboarding"
        A[Sign Up] --> B[Create Workspace]
    end

    subgraph "Document Setup"
        B --> C[Upload Documents]
        C --> D[Documents Processed]
    end

    subgraph "Query & Verify"
        D --> E[Ask Question]
        E --> F[View Response]
        F --> G[Review Ledger]
    end

    subgraph "Output"
        G --> H[Export/Share]
    end
```

---

## 3. Document Upload Journey

### 3.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as Backend
    participant Storage as Supabase Storage
    participant Queue as Processing Queue
    participant Embeddings as OpenAI

    User->>UI: Select file(s)
    UI->>UI: Validate file type/size

    alt Invalid file
        UI-->>User: Show error message
    else Valid file
        UI->>API: POST /documents/upload
        API->>Storage: Upload to bucket
        Storage-->>API: storage_path

        API->>API: Create document record
        API-->>UI: { id, status: "uploading" }
        UI-->>User: Show upload progress

        API->>Queue: Enqueue processing job

        Note over Queue: Async Processing

        Queue->>Queue: Extract text (PDF/DOCX)
        Queue->>Queue: Split into chunks
        Queue->>Embeddings: Generate embeddings

        Embeddings-->>Queue: vectors[]

        Queue->>API: Update status: "ready"
        API-->>UI: WebSocket: document_ready
        UI-->>User: Show "Ready" badge
    end
```

### 3.2 User Actions

| Step | Action | Feedback |
|------|--------|----------|
| 1 | Click "Upload Documents" | Upload zone appears |
| 2 | Drag & drop or browse files | Files validated |
| 3 | Wait for processing | Progress indicator |
| 4 | View processed document | "Ready" status shown |

### 3.3 Error Scenarios

| Error | User Sees | Recovery |
|-------|-----------|----------|
| File too large | "File exceeds 50MB limit" | Select smaller file |
| Invalid format | "Only PDF and DOCX supported" | Convert file |
| Processing failed | "Error processing document" | Retry or contact support |

---

## 4. Question & Answer Journey

### 4.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant WS as WebSocket
    participant API as Backend
    participant RAG as RAG Pipeline
    participant LLM as OpenRouter

    User->>UI: Type question
    User->>UI: Select "Answer" mode
    User->>UI: Click Send

    UI->>WS: query:start
    WS->>API: Process query

    API->>RAG: Generate embedding
    RAG->>RAG: Vector similarity search
    RAG-->>API: relevant_chunks[]

    API->>LLM: Writer prompt + context

    loop Streaming Response
        LLM-->>API: content_chunk
        API-->>WS: chunk:received
        WS-->>UI: Append to response
        UI-->>User: Stream text
    end

    API->>LLM: Skeptic prompt
    LLM-->>API: claims[]

    loop For each claim
        API->>LLM: Judge prompt
        LLM-->>API: verdict
        API-->>WS: claim:verified
        WS-->>UI: Update ledger
    end

    API-->>WS: query:complete
    WS-->>UI: Show final ledger
    UI-->>User: Display Evidence Ledger
```

### 4.2 User Actions

| Step | Action | Feedback |
|------|--------|----------|
| 1 | Type question | Input field active |
| 2 | Select mode (Answer/Draft) | Toggle highlights |
| 3 | Click Send | Loading indicator |
| 4 | Watch response stream | Text appears progressively |
| 5 | View citations | Numbered anchors in text |
| 6 | Check Evidence Ledger | Panel updates with verdicts |

### 4.3 Evidence Ledger Interaction

```mermaid
flowchart TD
    A[Response Generated] --> B[Evidence Ledger Appears]
    B --> C{User clicks claim}
    C -->|In response| D[Highlight claim in text]
    C -->|In ledger| E[Expand evidence details]

    E --> F{User clicks citation}
    F --> G[Open source drawer]
    G --> H[Show chunk with highlight]

    H --> I{User action}
    I -->|View full document| J[Navigate to document page]
    I -->|Close drawer| B
```

---

## 5. Draft Generation Journey

### 5.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant WS as WebSocket
    participant API as Backend
    participant Pipeline as LLM Pipeline

    User->>UI: Enter draft prompt
    User->>UI: Select "Draft" mode
    User->>UI: Click Send

    UI->>WS: draft:start

    rect rgb(240, 248, 255)
        Note over API,Pipeline: Cycle 1

        API->>Pipeline: Writer generates draft
        Pipeline-->>WS: Stream content
        WS-->>UI: Display draft

        API->>Pipeline: Skeptic extracts claims
        API->>Pipeline: Judge verifies claims

        Pipeline-->>API: ledger_v1
    end

    alt Coverage < 85% AND cycle < 2
        rect rgb(255, 248, 240)
            Note over API,Pipeline: Revision Cycle

            API->>Pipeline: Writer revises with feedback
            Pipeline-->>WS: Stream revised content

            API->>Pipeline: Skeptic re-extracts
            API->>Pipeline: Judge re-verifies

            Pipeline-->>API: ledger_v2
        end
    end

    API-->>WS: draft:complete
    WS-->>UI: Final draft + ledger
    UI-->>User: Show verification summary
```

### 5.2 Revision Flow

```mermaid
flowchart TD
    A[Writer Generates Draft] --> B[Skeptic Extracts Claims]
    B --> C[Judge Verifies Claims]
    C --> D{Evidence Coverage}

    D -->|≥85%| E[Accept Draft]
    D -->|<85%| F{Cycle Count}

    F -->|<2| G[Writer Revises]
    G --> H[Add/Modify Citations]
    H --> B

    F -->|≥2| I[Accept with Warnings]
    I --> J[Flag Unsupported Claims]

    E --> K[Generate Evidence Ledger]
    J --> K
    K --> L[Return to User]
```

### 5.3 User Actions

| Step | Action | Feedback |
|------|--------|----------|
| 1 | Describe draft requirements | Input validated |
| 2 | Select Draft mode | Toggle switches |
| 3 | Click Generate | "Generating..." indicator |
| 4 | Watch draft stream | Text appears with citations |
| 5 | Review revision cycle | Progress: "Verifying claims..." |
| 6 | Examine final ledger | Coverage score displayed |
| 7 | Download/copy draft | Export options available |

---

## 6. Evidence Ledger Review Journey

### 6.1 Interaction Flow

```mermaid
flowchart TD
    A[View Response with Ledger] --> B{User Goal}

    B -->|Verify claim| C[Click claim row]
    C --> D[View evidence snippet]
    D --> E[Click "View source"]
    E --> F[Document viewer opens]
    F --> G[Highlighted chunk visible]

    B -->|Check coverage| H[View summary stats]
    H --> I[See % by verdict type]

    B -->|Flag issue| J[Click "Report Issue"]
    J --> K[Select issue type]
    K --> L[Submit feedback]

    B -->|Export| M[Click Export]
    M --> N{Format selection}
    N -->|Markdown| O[Download .md]
    N -->|PDF| P[Download .pdf]
    N -->|JSON| Q[Download .json]
```

### 6.2 Ledger Panel States

| State | Display | User Action |
|-------|---------|-------------|
| Loading | Skeleton rows | Wait |
| Populated | Sorted claim list | Click rows |
| Expanded | Claim + evidence | View sources |
| Highlighted | Active claim | See in response |

---

## 7. Session History Journey

### 7.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as Backend

    User->>UI: Click "History" nav item
    UI->>API: GET /sessions?workspace_id=X
    API-->>UI: sessions[]
    UI-->>User: Display session list

    User->>UI: Click session card
    UI->>API: GET /sessions/:id
    API-->>UI: session with messages
    UI-->>User: Show session detail

    alt Continue Session
        User->>UI: Type follow-up question
        UI->>API: POST /query (session_id)
        Note over API: Append to existing session
    else Export Session
        User->>UI: Click Export
        UI->>API: POST /sessions/:id/export
        API-->>UI: Formatted export
        UI-->>User: Download file
    end
```

### 7.2 User Actions

| Step | Action | Feedback |
|------|--------|----------|
| 1 | Navigate to History | Session list loads |
| 2 | Filter/search sessions | Results update |
| 3 | Click session | Full conversation loads |
| 4 | Review past ledgers | Expandable per-message |
| 5 | Continue or export | Actions available |

---

## 8. Export Journey

### 8.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend
    participant API as Backend
    participant Export as Export Service

    User->>UI: Click "Export"
    UI-->>User: Show format options

    User->>UI: Select format + options
    UI->>API: POST /sessions/:id/export

    API->>Export: Generate export

    alt Markdown
        Export->>Export: Format with citations
        Export->>Export: Append ledger table
    else PDF
        Export->>Export: Render markdown
        Export->>Export: Generate PDF
    else JSON
        Export->>Export: Structure full data
    end

    Export-->>API: Generated file
    API-->>UI: Download URL
    UI-->>User: Start download
```

### 8.2 Export Options

| Format | Includes | Use Case |
|--------|----------|----------|
| Markdown | Response + ledger table | Documentation |
| PDF | Formatted document | Sharing |
| JSON | Full structured data | Integration |

---

## 9. Workspace Management Journey

### 9.1 Create Workspace

```mermaid
flowchart TD
    A[Click "New Workspace"] --> B[Enter name]
    B --> C[Configure settings]
    C --> D[Click Create]
    D --> E[Workspace created]
    E --> F[Redirect to workspace home]
    F --> G[Prompt to upload documents]
```

### 9.2 Invite Members

```mermaid
sequenceDiagram
    actor Owner
    participant UI as Frontend
    participant API as Backend
    participant Email as Email Service
    actor Invitee

    Owner->>UI: Open workspace settings
    Owner->>UI: Click "Invite Member"
    Owner->>UI: Enter email + role

    UI->>API: POST /workspaces/:id/members
    API->>Email: Send invitation
    Email-->>Invitee: Invitation email

    Invitee->>UI: Click invitation link

    alt Existing user
        UI->>API: Accept invitation
        API-->>UI: Redirect to workspace
    else New user
        UI-->>Invitee: Show signup form
        Invitee->>UI: Complete signup
        UI->>API: Create user + accept
    end
```

---

## 10. Mobile User Journey

### 10.1 Responsive Adaptations

| Screen Size | Sidebar | Ledger Panel | Document Viewer |
|-------------|---------|--------------|-----------------|
| Desktop (>1024px) | Fixed visible | Side panel | Split view |
| Tablet (768-1024px) | Collapsible | Bottom sheet | Modal |
| Mobile (<768px) | Drawer | Full screen | Full screen |

### 10.2 Touch Interactions

```mermaid
flowchart TD
    A[Mobile Chat View] --> B{Gesture}

    B -->|Tap citation| C[Bottom sheet: evidence]
    B -->|Swipe up| D[Expand ledger panel]
    B -->|Long press claim| E[Show context menu]

    E --> F[Copy text]
    E --> G[View source]
    E --> H[Report issue]
```

---

## 11. Error Recovery Journeys

### 11.1 Network Failure

```mermaid
flowchart TD
    A[User action] --> B{Network available?}

    B -->|No| C[Show offline banner]
    C --> D[Queue action locally]
    D --> E{Reconnected?}
    E -->|Yes| F[Retry queued actions]
    F --> G[Resume normal flow]
    E -->|No| H[Show retry option]

    B -->|Yes| I[Proceed normally]
```

### 11.2 LLM Failure

```mermaid
flowchart TD
    A[Query submitted] --> B{LLM responds?}

    B -->|Timeout| C[Try fallback model]
    C --> D{Fallback works?}
    D -->|Yes| E[Complete with fallback]
    D -->|No| F[Show error message]

    B -->|Rate limited| G[Wait and retry]
    G --> H{Retry successful?}
    H -->|Yes| I[Continue processing]
    H -->|No| F

    F --> J[Offer retry button]
    J --> A
```
