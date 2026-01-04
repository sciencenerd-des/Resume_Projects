import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  FileText,
  MessageSquare,
  Calendar,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '@/components/ui/input';
import { Spinner } from '../../components/ui/Spinner';
import type { Workspace } from '../../types';

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const { workspaces, isLoading, createWorkspace, switchWorkspace } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectWorkspace = (workspace: Workspace) => {
    switchWorkspace(workspace.id);
    navigate(`/workspaces/${workspace.id}`);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const workspace = await createWorkspace(newWorkspaceName.trim());
      setShowCreateModal(false);
      setNewWorkspaceName('');
      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">VerityDraft</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Your Workspaces</h1>
            <p className="text-muted-foreground mt-1">
              Select a workspace to start verifying documents
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            New Workspace
          </Button>
        </div>

        {workspaces.length === 0 ? (
          <EmptyWorkspaceState onCreateClick={() => setShowCreateModal(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                onClick={() => handleSelectWorkspace(workspace)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g., Legal Documents, Research Papers"
            icon={<Building2 className="w-4 h-4" />}
            autoFocus
          />
          <p className="text-sm text-muted-foreground">
            Create a workspace to organize your documents and chat sessions by project or topic.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isCreating} disabled={!newWorkspaceName.trim()}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function WorkspaceCard({
  workspace,
  onClick,
}: {
  workspace: Workspace;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">{workspace.name}</h3>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
        <span className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          Documents
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          Sessions
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-4">
        <Calendar className="w-3 h-3" />
        Created {new Date(workspace.created_at).toLocaleDateString()}
      </div>
    </button>
  );
}

function EmptyWorkspaceState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-16 bg-card rounded-2xl border border-border">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to VerityDraft</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        Create your first workspace to start uploading documents and generating verified,
        evidence-backed responses.
      </p>
      <Button onClick={onCreateClick} icon={<Plus className="w-4 h-4" />}>
        Create Your First Workspace
      </Button>
    </div>
  );
}
