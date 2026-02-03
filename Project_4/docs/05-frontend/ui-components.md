# UI Components

> **Framework:** React 18 + TypeScript
> **Styling:** Tailwind CSS
> **Icons:** Lucide React
> **Version:** 2.0
> **Last Updated:** 2026-01-17

---

## 1. Component Library Overview

| Category | Components | Purpose |
|----------|------------|---------|
| Core | Button, Input, Modal, Spinner | Base UI elements |
| Evidence | VerdictBadge, LedgerTable, CitationAnchor | Verification display |
| Chat | MessageList, QueryInput, ModeToggle | Query interface |
| Document | DocumentCard, ChunkViewer, UploadZone | Document management |
| Layout | Sidebar, Header, Panel | Page structure |

---

## 2. Core Components

### 2.1 Button

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
```

### 2.2 Input

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        <input
          className={`
            w-full rounded-lg border px-4 py-2
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-50 disabled:text-gray-500
            ${icon ? 'pl-10' : ''}
            ${error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300'
            }
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
```

### 2.3 Modal

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-xl shadow-xl
        w-full mx-4 ${sizeStyles[size]}
        animate-in fade-in zoom-in-95 duration-200
      `}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### 2.4 Spinner

```tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${sizeStyles[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
```

---

## 3. Evidence Components

### 3.1 VerdictBadge

```tsx
type Verdict =
  | 'supported'
  | 'weak'
  | 'contradicted'
  | 'not_found'
  | 'expert_verified'
  | 'conflict_flagged';

interface VerdictBadgeProps {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const verdictConfig = {
  supported: {
    label: 'Supported',
    icon: CheckCircle,
    styles: 'bg-verdict-supported/10 text-verdict-supported',
  },
  weak: {
    label: 'Weak',
    icon: AlertCircle,
    styles: 'bg-verdict-weak/10 text-verdict-weak',
  },
  contradicted: {
    label: 'Contradicted',
    icon: XCircle,
    styles: 'bg-verdict-contradicted/10 text-verdict-contradicted',
  },
  not_found: {
    label: 'Not Found',
    icon: HelpCircle,
    styles: 'bg-verdict-missing/10 text-verdict-missing',
  },
  expert_verified: {
    label: 'Expert Verified',
    icon: ShieldCheck,
    styles: 'bg-teal-500/10 text-teal-500',
  },
  conflict_flagged: {
    label: 'Conflict Flagged',
    icon: AlertTriangle,
    styles: 'bg-orange-500/10 text-orange-500',
  },
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function VerdictBadge({
  verdict,
  size = 'md',
  showIcon = true,
}: VerdictBadgeProps) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full border font-medium
      ${config.styles}
      ${sizeStyles[size]}
    `}>
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {config.label}
    </span>
  );
}
```

### 3.2 LedgerTable

```tsx
type ClaimType =
  | 'fact'
  | 'policy'
  | 'numeric'
  | 'definition'
  | 'scientific'
  | 'historical'
  | 'legal';

interface LedgerEntry {
  id: string;
  claim_text: string;
  claim_type: ClaimType;
  source_tag?: string;           // cite:N, llm:writer, llm:skeptic, llm:judge
  importance: 'critical' | 'material' | 'minor';
  verdict: Verdict;
  confidence: number;
  evidence_snippet?: string;
  expert_assessment?: string;    // Judge's verification notes
  chunk_ids: string[];
}

interface LedgerTableProps {
  entries: LedgerEntry[];
  onRowClick?: (entry: LedgerEntry) => void;
  highlightedId?: string;
  className?: string;
}

export function LedgerTable({
  entries,
  onRowClick,
  highlightedId,
  className,
}: LedgerTableProps) {
  const sortedEntries = useMemo(() => {
    const order = {
      supported: 0,
      expert_verified: 1,
      weak: 2,
      conflict_flagged: 3,
      contradicted: 4,
      not_found: 5
    };
    return [...entries].sort((a, b) =>
      (order[a.verdict] ?? 5) - (order[b.verdict] ?? 5)
    );
  }, [entries]);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead className="w-32">Confidence</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedEntries.map((entry) => (
            <TableRow
              key={entry.id}
              onClick={() => onRowClick?.(entry)}
              className={cn(
                "cursor-pointer transition-colors border-border",
                highlightedId === entry.id
                  ? "bg-primary/5"
                  : "hover:bg-accent/5"
              )}
            >
              <TableCell className="max-w-md">
                <div className="flex items-start gap-2">
                  <ImportanceDot importance={entry.importance} />
                  <span className="text-sm text-foreground line-clamp-2">
                    {entry.claim_text}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <SourceTagBadge sourceTag={entry.source_tag} />
              </TableCell>
              <TableCell>
                <ClaimTypeBadge type={entry.claim_type} />
              </TableCell>
              <TableCell>
                <VerdictBadge verdict={entry.verdict} size="sm" />
              </TableCell>
              <TableCell>
                <ConfidenceBar value={entry.confidence} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 3.2.1 SourceTagBadge

Displays the source of a claim in the 3-LLM pipeline:

```tsx
const sourceTagConfig = {
  document: { icon: FileText, styles: 'bg-emerald-500/10 text-emerald-600' },
  writer: { icon: Brain, styles: 'bg-blue-500/10 text-blue-500' },
  skeptic: { icon: Search, styles: 'bg-purple-500/10 text-purple-500' },
  judge: { icon: Scale, styles: 'bg-indigo-500/10 text-indigo-500' },
  unknown: { icon: FileText, styles: 'bg-muted text-muted-foreground' },
};

function SourceTagBadge({ sourceTag }: { sourceTag?: string }) {
  if (!sourceTag) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  // Parse source tag
  const isDocument = sourceTag.startsWith("cite:");
  const isWriter = sourceTag === "llm:writer";
  const isSkeptic = sourceTag === "llm:skeptic";
  const isJudge = sourceTag === "llm:judge";

  if (isDocument) {
    const docNum = sourceTag.replace("cite:", "");
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600">
        <FileText className="h-3 w-3" />
        Doc {docNum}
      </span>
    );
  }

  if (isWriter) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-500">
        <Brain className="h-3 w-3" />
        Writer
      </span>
    );
  }

  if (isSkeptic) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500">
        <Search className="h-3 w-3" />
        Skeptic
      </span>
    );
  }

  if (isJudge) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 text-indigo-500">
        <Scale className="h-3 w-3" />
        Judge
      </span>
    );
  }

  return <span className="text-muted-foreground text-xs">{sourceTag}</span>;
}
```

### 3.3 CitationAnchor

```tsx
interface CitationAnchorProps {
  chunkId: string;
  index: number;
  verdict?: Verdict;
  onClick?: (chunkId: string) => void;
}

const verdictColors = {
  supported: 'bg-green-500',
  weak: 'bg-amber-500',
  contradicted: 'bg-red-500',
  not_found: 'bg-gray-400',
};

export function CitationAnchor({
  chunkId,
  index,
  verdict = 'supported',
  onClick,
}: CitationAnchorProps) {
  return (
    <button
      onClick={() => onClick?.(chunkId)}
      className={`
        inline-flex items-center justify-center
        w-5 h-5 rounded-full text-xs font-medium text-white
        ${verdictColors[verdict]}
        hover:ring-2 hover:ring-offset-1 hover:ring-blue-500
        transition-all cursor-pointer
      `}
      title={`View source [${index}]`}
    >
      {index}
    </button>
  );
}
```

### 3.4 EvidenceSnippet

```tsx
interface EvidenceSnippetProps {
  content: string;
  source: string;
  pageNumber?: number;
  highlightText?: string;
  onViewSource?: () => void;
}

export function EvidenceSnippet({
  content,
  source,
  pageNumber,
  highlightText,
  onViewSource,
}: EvidenceSnippetProps) {
  const highlightedContent = useMemo(() => {
    if (!highlightText) return content;

    const regex = new RegExp(`(${escapeRegex(highlightText)})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }, [content, highlightText]);

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {source}
          {pageNumber && <span className="text-gray-500"> · Page {pageNumber}</span>}
        </span>
        {onViewSource && (
          <button
            onClick={onViewSource}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View in document
          </button>
        )}
      </div>

      <p
        className="text-sm text-gray-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
    </div>
  );
}
```

---

## 4. Chat Components

### 4.1 MessageList

```tsx
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  ledger?: EvidenceLedger;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  onCitationClick?: (chunkId: string) => void;
}

export function MessageList({
  messages,
  isStreaming,
  streamingContent,
  onCitationClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onCitationClick={onCitationClick}
        />
      ))}

      {isStreaming && streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date(),
          }}
          isStreaming
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
  onCitationClick,
}: {
  message: Message;
  isStreaming?: boolean;
  onCitationClick?: (chunkId: string) => void;
}) {
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
        <div className="prose prose-sm max-w-none">
          <ResponseContent
            content={message.content}
            citations={message.citations}
            onCitationClick={onCitationClick}
          />
        </div>

        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
```

### 4.2 QueryInput

```tsx
interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Ask a question about your documents...',
}: QueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex items-end gap-2 p-4 border-t bg-white">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="
          flex-1 resize-none rounded-xl border border-gray-300
          px-4 py-3 text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-500
        "
      />

      <Button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        icon={<Send className="w-4 h-4" />}
      >
        Send
      </Button>
    </div>
  );
}
```

### 4.3 ModeToggle

```tsx
type QueryMode = 'answer' | 'draft';

interface ModeToggleProps {
  mode: QueryMode;
  onChange: (mode: QueryMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-1">
      <button
        onClick={() => onChange('answer')}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${mode === 'answer'
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
          }
        `}
      >
        <MessageSquare className="w-4 h-4 inline mr-2" />
        Answer
      </button>

      <button
        onClick={() => onChange('draft')}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${mode === 'draft'
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100'
          }
        `}
      >
        <FileText className="w-4 h-4 inline mr-2" />
        Draft
      </button>
    </div>
  );
}
```

---

## 5. Document Components

### 5.1 DocumentCard

```tsx
interface Document {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx';
  status: 'uploading' | 'processing' | 'ready' | 'error';
  chunkCount: number;
  createdAt: Date;
  tags?: string[];
}

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onDelete?: () => void;
}

const fileTypeIcons = {
  pdf: FileText,
  docx: FileText,
};

const statusConfig = {
  uploading: { label: 'Uploading', color: 'text-blue-600' },
  processing: { label: 'Processing', color: 'text-amber-600' },
  ready: { label: 'Ready', color: 'text-green-600' },
  error: { label: 'Error', color: 'text-red-600' },
};

export function DocumentCard({
  document,
  onView,
  onDelete,
}: DocumentCardProps) {
  const Icon = fileTypeIcons[document.fileType];
  const status = statusConfig[document.status];

  return (
    <div className="
      flex items-center gap-4 p-4
      bg-white rounded-lg border border-gray-200
      hover:border-gray-300 transition-colors
    ">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {document.filename}
        </h3>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className={status.color}>{status.label}</span>
          {document.status === 'ready' && (
            <span>{document.chunkCount} chunks</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onView && (
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 5.2 ChunkViewer

```tsx
interface Chunk {
  id: string;
  content: string;
  pageNumber?: number;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
}

interface ChunkViewerProps {
  chunks: Chunk[];
  highlightedChunkId?: string;
  searchQuery?: string;
  onChunkSelect?: (chunk: Chunk) => void;
}

export function ChunkViewer({
  chunks,
  highlightedChunkId,
  searchQuery,
  onChunkSelect,
}: ChunkViewerProps) {
  const chunkRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (highlightedChunkId) {
      chunkRefs.current.get(highlightedChunkId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedChunkId]);

  return (
    <div className="h-full overflow-y-auto">
      {chunks.map((chunk) => (
        <div
          key={chunk.id}
          ref={(el) => el && chunkRefs.current.set(chunk.id, el)}
          onClick={() => onChunkSelect?.(chunk)}
          className={`
            p-4 border-b cursor-pointer transition-colors
            ${highlightedChunkId === chunk.id
              ? 'bg-yellow-50 border-l-4 border-l-yellow-400'
              : 'hover:bg-gray-50'
            }
          `}
        >
          {chunk.headingPath.length > 0 && (
            <div className="text-xs text-gray-500 mb-2">
              {chunk.headingPath.join(' › ')}
            </div>
          )}

          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            <HighlightedText text={chunk.content} query={searchQuery} />
          </p>

          {chunk.pageNumber && (
            <div className="text-xs text-gray-400 mt-2">
              Page {chunk.pageNumber}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 5.3 UploadZone

```tsx
interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
}

export function UploadZone({
  onUpload,
  accept = '.pdf,.docx',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true,
  disabled,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.size <= maxSize
    );

    if (files.length > 0) {
      onUpload(files);
    }
  }, [disabled, maxSize, onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        flex flex-col items-center justify-center
        p-8 border-2 border-dashed rounded-xl
        cursor-pointer transition-colors
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload className="w-10 h-10 text-gray-400 mb-4" />

      <p className="text-sm text-gray-600 text-center">
        <span className="font-medium text-blue-600">Click to upload</span>
        {' '}or drag and drop
      </p>

      <p className="text-xs text-gray-500 mt-1">
        PDF or DOCX up to 50MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
```

---

## 6. Layout Components

### 6.1 Sidebar

```tsx
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();

  const navItems = [
    { icon: Home, label: 'Home', path: `/workspaces/${currentWorkspace?.id}` },
    { icon: FileText, label: 'Documents', path: `/workspaces/${currentWorkspace?.id}/documents` },
    { icon: MessageSquare, label: 'Chat', path: `/workspaces/${currentWorkspace?.id}/chat` },
    { icon: History, label: 'History', path: `/workspaces/${currentWorkspace?.id}/sessions` },
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40
      flex flex-col w-64 bg-gray-900 text-white
      transform transition-transform duration-200
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0 lg:static
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <Shield className="w-8 h-8 text-blue-400" />
        <span className="text-xl font-bold">VerityDraft</span>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 border-b border-gray-800">
        <WorkspaceSwitcher
          current={currentWorkspace}
          workspaces={workspaces}
          onSwitch={switchWorkspace}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-lg
              transition-colors
              ${isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-800">
        <UserMenu />
      </div>
    </aside>
  );
}
```

### 6.2 Header

```tsx
interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="
      sticky top-0 z-30
      flex items-center justify-between
      h-16 px-4 bg-white border-b
    ">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="text-lg font-semibold text-gray-900">
            {title}
          </h1>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
```

---

## 7. Utility Components

### 7.1 ConfidenceBar

```tsx
interface ConfidenceBarProps {
  value: number; // 0-1
  size?: 'sm' | 'md';
}

export function ConfidenceBar({ value, size = 'md' }: ConfidenceBarProps) {
  const percentage = Math.round(value * 100);
  const color = value >= 0.8 ? 'bg-green-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className={`
        flex-1 rounded-full bg-gray-200 overflow-hidden
        ${size === 'sm' ? 'h-1.5' : 'h-2'}
      `}>
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`
        font-medium text-gray-700
        ${size === 'sm' ? 'text-xs' : 'text-sm'}
      `}>
        {percentage}%
      </span>
    </div>
  );
}
```

### 7.2 ImportanceDot

```tsx
interface ImportanceDotProps {
  importance: 'critical' | 'material' | 'minor';
}

const importanceColors = {
  critical: 'bg-red-500',
  material: 'bg-amber-500',
  minor: 'bg-gray-400',
};

export function ImportanceDot({ importance }: ImportanceDotProps) {
  return (
    <span
      className={`
        inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5
        ${importanceColors[importance]}
      `}
      title={`${importance} claim`}
    />
  );
}
```

### 7.3 HighlightedText

```tsx
interface HighlightedTextProps {
  text: string;
  query?: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
```

---

## 8. Component Guidelines

### 8.1 Accessibility

- All interactive elements have focus states
- Use semantic HTML elements
- Include ARIA labels where needed
- Support keyboard navigation
- Maintain sufficient color contrast

### 8.2 Responsive Design

| Breakpoint | Width | Usage |
|------------|-------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Large desktop |

### 8.3 Performance

- Use React.memo for expensive renders
- Virtualize long lists (react-virtual)
- Lazy load modals and drawers
- Debounce input handlers
- Memoize computed values
