import React from 'react';
import { ChevronDown, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '../ui/Modal';
import { api } from '../../services/api';

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSwitcherProps {
  current: Workspace | null;
  workspaces: Workspace[];
  onSwitch: (id: string) => void;
  onCreate?: () => void;
}

export function WorkspaceSwitcher({
  current,
  workspaces,
  onSwitch,
  onCreate,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const handleSelect = (workspaceId: string) => {
    onSwitch(workspaceId);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {current?.name || 'Select Workspace'}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-gray-800 rounded-lg shadow-xl z-20">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleSelect(workspace.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    current?.id === workspace.id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {workspace.name}
                </button>
              ))}
              <div className="border-t border-gray-700 mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Workspace"
      >
        <WorkspaceCreateForm
          onClose={() => setShowCreateModal(false)}
          onCreated={onCreate}
        />
      </Modal>
    </>
  );
}

function WorkspaceCreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name, setName] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createWorkspace(name);
      onClose();
      onCreated?.();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Workspace Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Workspace"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create
        </Button>
      </div>
    </form>
  );
}
