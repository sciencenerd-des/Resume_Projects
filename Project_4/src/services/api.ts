import { getSupabase } from './supabase';

// Use same origin for API calls (works in both dev and production)
const API_BASE_URL = import.meta.env?.VITE_API_URL || '';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await getSupabase().auth.getSession();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }

  return response.json();
}

export const api = {
  // Workspaces
  getWorkspaces: () => fetchWithAuth('/api/workspaces'),
  createWorkspace: (name: string) => fetchWithAuth('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  
  // Documents
  getDocuments: (workspaceId: string) => fetchWithAuth(`/api/workspaces/${workspaceId}/documents`),
  uploadDocument: async (workspaceId: string, file: File) => {
    const { data: { session } } = await getSupabase().auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  },
  deleteDocument: (documentId: string) => fetchWithAuth(`/api/documents/${documentId}`, {
    method: 'DELETE',
  }),
  
  // Sessions
  getSessions: (workspaceId: string) => fetchWithAuth(`/api/workspaces/${workspaceId}/sessions`),
  getWorkspaceSessions: (workspaceId: string) => fetchWithAuth(`/api/workspaces/${workspaceId}/sessions`),
  getSession: (sessionId: string) => fetchWithAuth(`/api/sessions/${sessionId}`),
  getSessionMessages: (sessionId: string) => fetchWithAuth(`/api/sessions/${sessionId}/messages`),
  getSessionLedger: (sessionId: string) => fetchWithAuth(`/api/sessions/${sessionId}/ledger`),
  deleteSession: (sessionId: string) => fetchWithAuth(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  }),
  exportSession: (sessionId: string, format: 'pdf' | 'markdown' | 'json') =>
    fetchWithAuth(`/api/sessions/${sessionId}/export?format=${format}`),
  
  // Chat
  createQuery: (workspaceId: string, query: string, mode: 'answer' | 'draft') => 
    fetchWithAuth(`/api/workspaces/${workspaceId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query, mode }),
    }),
};
