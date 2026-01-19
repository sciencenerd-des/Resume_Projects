import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SupabaseProvider } from './contexts/SupabaseContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { CommandProvider } from './contexts/CommandContext';
import App from './App';

import './styles/output.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const root = createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SupabaseProvider>
          <ThemeProvider>
            <AuthProvider>
              <WorkspaceProvider>
                <CommandProvider>
                  <App />
                </CommandProvider>
              </WorkspaceProvider>
            </AuthProvider>
          </ThemeProvider>
        </SupabaseProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
