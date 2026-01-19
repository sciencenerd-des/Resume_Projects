# Component Patterns

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Overview

This document defines reusable UI patterns for VerityDraft's key components, ensuring consistency across the application.

---

## 2. Evidence Ledger Panel

### 2.1 Layout Structure

```
┌─────────────────────────────────────────┐
│ Evidence Ledger                    [×]  │  ← Header
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Coverage: 87%    Claims: 12         │ │  ← Summary Bar
│ │ ████████████████████░░░░            │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ │ Claim                    │ Verdict │  │  ← Table Header
│ ├──────────────────────────┼─────────┤  │
│ │ • Revenue increased...   │ ✓ Suppo │  │  ← Sorted by verdict
│ │ • Market share grew...   │ ✓ Suppo │  │
│ │ • Costs reduced by...    │ ⚠ Weak  │  │
│ │ • Competitors lost...    │ ✗ Contr │  │
│ │ • Future growth will...  │ ? Not F │  │
├─────────────────────────────────────────┤
│ ⚠ 2 Risk Flags                          │  ← Risk Section
│ • Contradicted claim about competitors  │
│ • Unsupported prediction in conclusion  │
└─────────────────────────────────────────┘
```

### 2.2 Component Code

```tsx
interface EvidenceLedgerPanelProps {
  ledger: EvidenceLedger;
  isOpen: boolean;
  onClose: () => void;
  onClaimClick: (claimId: string) => void;
  highlightedClaimId?: string;
}

export function EvidenceLedgerPanel({
  ledger,
  isOpen,
  onClose,
  onClaimClick,
  highlightedClaimId,
}: EvidenceLedgerPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className="w-96 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-900">Evidence Ledger</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Summary */}
      <LedgerSummary summary={ledger.summary} />

      {/* Claims Table */}
      <div className="flex-1 overflow-y-auto">
        <LedgerTable
          entries={ledger.entries}
          onRowClick={onClaimClick}
          highlightedId={highlightedClaimId}
        />
      </div>

      {/* Risk Flags */}
      {ledger.riskFlags.length > 0 && (
        <RiskFlagsSection flags={ledger.riskFlags} />
      )}
    </aside>
  );
}
```

### 2.3 Summary Bar Pattern

```tsx
function LedgerSummary({ summary }: { summary: LedgerSummary }) {
  const coverage = Math.round(summary.evidenceCoverage * 100);

  return (
    <div className="px-4 py-3 bg-gray-50 border-b">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">Coverage</span>
        <span className="font-medium">{coverage}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            coverage >= 85 ? 'bg-green-500' :
            coverage >= 70 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${coverage}%` }}
        />
      </div>

      {/* Verdict Breakdown */}
      <div className="flex gap-4 mt-3 text-xs">
        <VerdictCount verdict="supported" count={summary.supported} />
        <VerdictCount verdict="weak" count={summary.weak} />
        <VerdictCount verdict="contradicted" count={summary.contradicted} />
        <VerdictCount verdict="not_found" count={summary.notFound} />
      </div>
    </div>
  );
}
```

---

## 3. Citation Anchor Pattern

### 3.1 Inline Citation

```
"Revenue increased by 15% year-over-year [1] driven by
strong performance in the Asia-Pacific region [2][3]."
                                           ↑
                                    Citation anchors
```

### 3.2 Citation Component

```tsx
interface CitationAnchorProps {
  index: number;
  chunkId: string;
  verdict: Verdict;
  onClick: () => void;
}

export function CitationAnchor({
  index,
  chunkId,
  verdict,
  onClick,
}: CitationAnchorProps) {
  const colors = {
    supported: 'bg-green-500 hover:bg-green-600',
    weak: 'bg-amber-500 hover:bg-amber-600',
    contradicted: 'bg-red-500 hover:bg-red-600',
    not_found: 'bg-gray-400 hover:bg-gray-500',
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center
        w-5 h-5 rounded-full text-xs font-medium text-white
        ${colors[verdict]}
        transition-colors cursor-pointer
        align-super ml-0.5
      `}
      title={`View source [${index}]`}
    >
      {index}
    </button>
  );
}
```

### 3.3 Citation Popover

```tsx
export function CitationPopover({
  citation,
  isOpen,
  anchorRef,
  onClose,
  onViewSource,
}: CitationPopoverProps) {
  if (!isOpen) return null;

  return (
    <Popover anchorRef={anchorRef} onClose={onClose}>
      <div className="w-80 p-4">
        {/* Source Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            {citation.source}
          </span>
          <VerdictBadge verdict={citation.verdict} size="sm" />
        </div>

        {/* Evidence Snippet */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          "{citation.snippet}"
        </p>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={onViewSource}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View in document →
          </button>
        </div>
      </div>
    </Popover>
  );
}
```

---

## 4. Document Viewer Pattern

### 4.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│ Document: Policy_Guidelines.pdf                     [×]  │
├────────────────┬─────────────────────────────────────────┤
│ Table of       │                                         │
│ Contents       │  Document content with                  │
│                │  highlighted chunks                     │
│ • Section 1    │                                         │
│   ○ 1.1        │  ┌─────────────────────────────────┐    │
│   ○ 1.2        │  │ ████ Highlighted chunk ████    │    │
│ • Section 2    │  │ This text was cited as         │    │
│   ○ 2.1        │  │ evidence for a claim.          │    │
│                │  └─────────────────────────────────┘    │
│                │                                         │
├────────────────┴─────────────────────────────────────────┤
│ Page 12 of 45                            < 12 >          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Chunk Highlighting

```tsx
interface ChunkHighlightProps {
  chunk: DocumentChunk;
  isActive: boolean;
  onClick: () => void;
}

export function ChunkHighlight({
  chunk,
  isActive,
  onClick,
}: ChunkHighlightProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer transition-all
        ${isActive
          ? 'bg-yellow-100 border-l-4 border-yellow-400 pl-4 -ml-4'
          : 'hover:bg-yellow-50'
        }
      `}
    >
      {/* Chunk Content */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {chunk.content}
      </p>

      {/* Chunk ID Badge */}
      <span className="
        absolute -left-2 top-0
        px-1.5 py-0.5 text-xs font-mono
        bg-gray-100 text-gray-600 rounded
      ">
        {chunk.chunkHash.slice(0, 6)}
      </span>
    </div>
  );
}
```

---

## 5. Chat Interface Pattern

### 5.1 Message Layout

```
┌──────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐  │
│ │                                                     │  │
│ │                           ┌──────────────────────┐  │  │
│ │                           │ What is the max LTV? │  │  │ ← User message
│ │                           └──────────────────────┘  │  │
│ │                                                     │  │
│ │ ┌──────────────────────────────────────────┐        │  │
│ │ │ The maximum loan-to-value ratio is       │        │  │ ← Assistant
│ │ │ 80% for primary residences [1] and       │        │  │
│ │ │ 75% for investment properties [2].       │        │  │
│ │ │                                          │        │  │
│ │ │ ✓ 3/3 claims verified                    │        │  │ ← Verification
│ │ └──────────────────────────────────────────┘        │  │
│ │                                                     │  │
│ └─────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ Ask a question about your documents...        [Send]     │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Message Bubble

```tsx
interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onCitationClick: (chunkId: string) => void;
}

export function MessageBubble({
  message,
  isStreaming,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[80%] rounded-2xl px-4 py-3
        ${isUser
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-900'
        }
      `}>
        {/* Message Content */}
        <div className="text-sm leading-relaxed">
          <ResponseContent
            content={message.content}
            onCitationClick={onCitationClick}
          />

          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </div>

        {/* Verification Summary (for assistant) */}
        {!isUser && message.ledger && (
          <VerificationSummary ledger={message.ledger} />
        )}
      </div>
    </div>
  );
}
```

### 5.3 Verification Summary

```tsx
function VerificationSummary({ ledger }: { ledger: EvidenceLedger }) {
  const { supported, total } = ledger.summary;
  const allVerified = supported === total;

  return (
    <div className={`
      flex items-center gap-2 mt-2 pt-2 border-t
      text-xs ${allVerified ? 'text-green-600' : 'text-amber-600'}
    `}>
      {allVerified ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>
        {supported}/{total} claims verified
      </span>
    </div>
  );
}
```

---

## 6. Upload Zone Pattern

### 6.1 States

```
┌─────────────────────────────────────────┐
│              📄                         │
│                                         │
│    Drag and drop files here            │   ← Default state
│    or click to browse                   │
│                                         │
│    PDF, DOCX up to 50MB                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│              📄                         │
│    ════════════════════                 │   ← Dragging state
│    Drop files to upload                 │   (dashed border, highlight)
│    ════════════════════                 │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    Uploading 2 files...                 │
│                                         │
│    Policy.pdf        ████████░░ 80%     │   ← Uploading state
│    Guidelines.docx   ██░░░░░░░░ 20%     │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 Upload Progress

```tsx
interface UploadProgressProps {
  files: UploadingFile[];
  onCancel: (fileId: string) => void;
}

export function UploadProgress({ files, onCancel }: UploadProgressProps) {
  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium truncate">
                {file.name}
              </span>
              <span className="text-xs text-gray-500">
                {file.progress}%
              </span>
            </div>

            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => onCancel(file.id)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Empty State Patterns

### 7.1 No Documents

```tsx
export function EmptyDocuments({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No documents yet
      </h3>

      <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
        Upload your first document to start asking questions
        and generating verified content.
      </p>

      <Button onClick={onUpload} icon={<Upload className="w-4 h-4" />}>
        Upload Document
      </Button>
    </div>
  );
}
```

### 7.2 No Search Results

```tsx
export function EmptySearchResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Search className="w-12 h-12 text-gray-300 mb-4" />

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No results found
      </h3>

      <p className="text-sm text-gray-500 text-center max-w-sm">
        No documents match "{query}". Try adjusting your search terms.
      </p>
    </div>
  );
}
```

---

## 8. Loading Patterns

### 8.1 Skeleton Loader

```tsx
export function DocumentCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-lg" />

      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}
```

### 8.2 Streaming Indicator

```tsx
export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>Generating response...</span>
    </div>
  );
}
```

---

## 9. Error Patterns

### 9.1 Inline Error

```tsx
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-700">{message}</span>
    </div>
  );
}
```

### 9.2 Error with Retry

```tsx
export function ErrorWithRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-8 px-4">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <XCircle className="w-6 h-6 text-red-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>

      <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
        {message}
      </p>

      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
```

---

## 10. Modal Patterns

### 10.1 Confirmation Modal

```tsx
export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal isOpen onClose={onCancel} size="sm">
      <div className="text-center">
        <div className={`
          w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
          ${variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'}
        `}>
          <AlertTriangle className={`
            w-6 h-6
            ${variant === 'danger' ? 'text-red-600' : 'text-blue-600'}
          `} />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```
