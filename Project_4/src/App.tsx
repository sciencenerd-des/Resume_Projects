import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Workspace Pages
import WorkspaceListPage from './pages/workspace/WorkspaceListPage';
import WorkspaceHomePage from './pages/workspace/WorkspaceHomePage';
import DocumentLibraryPage from './pages/documents/DocumentLibraryPage';
import ChatPage from './pages/chat/ChatPage';
import SessionViewPage from './pages/sessions/SessionViewPage';

// Components
import { AuthGuard } from './components/auth/AuthGuard';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Routes */}
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/workspaces" replace />} />
          <Route path="/workspaces" element={<WorkspaceListPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspaceHomePage />} />
          <Route path="/workspaces/:workspaceId/documents" element={<DocumentLibraryPage />} />
          <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
          <Route path="/sessions/:sessionId" element={<SessionViewPage />} />
        </Route>
      </Route>

      {/* Catch all - redirect to workspaces */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}
