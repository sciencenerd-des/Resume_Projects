# State Management

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. State Categories

| Category | Technology | Purpose |
|----------|------------|---------|
| Global | React Context | Auth, workspace, theme |
| Server | React Query | Documents, sessions, API data |
| Local | useState/useReducer | Forms, UI toggles, modals |
| Real-time | WebSocket + useState | Streaming responses |

---

## 2. Context Providers

### 2.1 Provider Hierarchy

```tsx
<QueryClientProvider>
  <ThemeProvider>
    <AuthProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

### 2.2 WorkspaceContext

The WorkspaceContext manages workspace state using manual fetching (not React Query) to handle authentication state transitions cleanly.

```tsx
interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getWorkspaces();
      setWorkspaces(data);

      // Restore last selected workspace or select first one
      const savedWorkspaceId = localStorage.getItem('verity_current_workspace');
      const savedWorkspace = data.find((w: Workspace) => w.id === savedWorkspaceId);

      if (savedWorkspace) {
        setCurrentWorkspace(savedWorkspace);
      } else if (data.length > 0) {
        setCurrentWorkspace(data[0]);
        localStorage.setItem('verity_current_workspace', data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch workspaces when user changes
  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      localStorage.setItem('verity_current_workspace', workspaceId);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace> => {
    const newWorkspace = await api.createWorkspace(name);
    setWorkspaces((prev) => [...prev, newWorkspace]);
    setCurrentWorkspace(newWorkspace);
    localStorage.setItem('verity_current_workspace', newWorkspace.id);
    return newWorkspace;
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading,
        error,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
```

**Note:** WorkspaceContext uses manual state management rather than React Query to handle the auth-dependent data flow more explicitly. This allows clear handling of logged-out states and provides `createWorkspace` and `refreshWorkspaces` helpers.

---

## 3. Server State (React Query)

### 3.1 Query Configuration

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      retry: 1,
    },
  },
});
```

**Note:** We rely on React Query's default behavior for `gcTime` (formerly `cacheTime`) and `refetchOnWindowFocus`. The minimal configuration keeps the setup simple while providing reasonable defaults.

### 3.2 Query Keys

```typescript
const queryKeys = {
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  documents: (workspaceId: string) => ['documents', workspaceId] as const,
  document: (id: string) => ['documents', 'detail', id] as const,
  sessions: (workspaceId: string) => ['sessions', workspaceId] as const,
  session: (id: string) => ['sessions', 'detail', id] as const,
  ledger: (sessionId: string) => ['ledger', sessionId] as const,
};
```

### 3.3 Mutations with Optimistic Updates

```tsx
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => api.deleteDocument(documentId),

    onMutate: async (documentId) => {
      await queryClient.cancelQueries(['documents']);

      const previousDocs = queryClient.getQueryData<Document[]>(['documents']);

      queryClient.setQueryData(['documents'], (old: Document[] = []) =>
        old.filter(d => d.id !== documentId)
      );

      return { previousDocs };
    },

    onError: (err, documentId, context) => {
      queryClient.setQueryData(['documents'], context?.previousDocs);
    },

    onSettled: () => {
      queryClient.invalidateQueries(['documents']);
    },
  });
}
```

---

## 4. Real-time State

### 4.1 Architecture Overview

Streaming state is managed **inline within ChatPage** rather than via a separate hook. This approach:
- Keeps streaming logic co-located with UI that consumes it
- Avoids abstraction overhead for a single consumer
- Allows direct access to message history state

### 4.2 Query Initiation Pattern

Queries are initiated via **REST API**, not WebSocket. The WebSocket connection only receives streaming events:

```tsx
// In ChatPage.tsx
const handleSubmit = useCallback(async () => {
  if (!query.trim() || !workspaceId || isStreaming) return;

  // Add user message to local state
  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: query,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);
  setQuery('');

  try {
    // Initiate query via REST - this triggers WebSocket events
    await api.createQuery(workspaceId, query, mode);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to send query');
    setIsStreaming(false);
  }
}, [query, workspaceId, mode, isStreaming]);
```

### 4.3 WebSocket Event Handling

The `useWebSocket` hook provides a simple event subscription API. ChatPage subscribes to streaming events:

```tsx
// In ChatPage.tsx
useEffect(() => {
  const handleSessionCreated = (payload: any) => {
    setCurrentSessionId(payload.session_id);
    setIsStreaming(true);
    setStreamingContent('');
  };

  const handleContentChunk = (payload: any) => {
    setStreamingContent((prev) => prev + payload.delta);
  };

  const handleClaimVerified = (payload: any) => {
    setLedger((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: [...prev.entries, payload.claim],
      };
    });
  };

  const handleLedgerUpdated = (payload: unknown) => {
    setLedger(payload as EvidenceLedger);
  };

  const handleGenerationComplete = (payload: any) => {
    const assistantMessage: Message = {
      id: payload.session_id,
      role: 'assistant',
      content: streamingContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingContent('');
    setIsStreaming(false);
  };

  const handleError = (payload: any) => {
    setError(payload.message);
    setIsStreaming(false);
  };

  on('session_created', handleSessionCreated);
  on('content_chunk', handleContentChunk);
  on('claim_verified', handleClaimVerified);
  on('ledger_updated', handleLedgerUpdated);
  on('generation_complete', handleGenerationComplete);
  on('error', handleError);

  return () => {
    off('session_created', handleSessionCreated);
    off('content_chunk', handleContentChunk);
    off('claim_verified', handleClaimVerified);
    off('ledger_updated', handleLedgerUpdated);
    off('generation_complete', handleGenerationComplete);
    off('error', handleError);
  };
}, [on, off, streamingContent]);
```

### 4.4 State Variables

ChatPage manages these streaming-related state variables:

```tsx
const [isStreaming, setIsStreaming] = useState(false);
const [streamingContent, setStreamingContent] = useState('');
const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
const [ledger, setLedger] = useState<EvidenceLedger | null>(null);
const [error, setError] = useState<string | null>(null);
```

---

## 5. Local State Patterns

### 5.1 Form State

```tsx
interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

export function useForm<T extends Record<string, string>>(
  initialValues: T,
  validate: (values: T) => Record<string, string>
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (name: keyof T) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues(v => ({ ...v, [name]: e.target.value }));
  };

  const handleBlur = (name: keyof T) => () => {
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = (onSubmit: (values: T) => void) => (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(values);
    }
  };

  return { values, errors, touched, handleChange, handleBlur, handleSubmit };
}
```

### 5.2 Modal State

```tsx
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);

  const open = useCallback((modalData?: unknown) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  return { isOpen, data, open, close };
}
```

---

## 6. Performance Optimization

### 6.1 Memoization

```tsx
// Memoize expensive ledger transformations
const sortedEntries = useMemo(() => {
  return ledger.entries
    .filter(e => e.claim_importance !== 'minor')
    .sort((a, b) => {
      const order = { supported: 0, weak: 1, contradicted: 2, not_found: 3 };
      return order[a.verdict] - order[b.verdict];
    });
}, [ledger.entries]);

// Memoize callbacks passed to children
const handleClaimClick = useCallback((claimId: string) => {
  scrollToClaimInResponse(claimId);
}, []);
```

### 6.2 Virtualization for Large Lists

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedDocumentList({ documents }: { documents: Document[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <DocumentCard
            key={documents[virtualItem.index].id}
            document={documents[virtualItem.index]}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```
