/**
 * Sidebar Component
 * @version 1.0.0
 * Main navigation sidebar
 */

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, MessageSquare, History, Shield, LogOut, ChevronUp } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useConvexAuthState } from '@/hooks/useConvexAuth';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';

export function Sidebar() {
  const navigate = useNavigate();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const { user, signOut } = useConvexAuthState();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { icon: Home, label: 'Home', path: `/workspaces/${currentWorkspace?.id}` },
    { icon: FileText, label: 'Documents', path: `/workspaces/${currentWorkspace?.id}/documents` },
    { icon: MessageSquare, label: 'Chat', path: `/workspaces/${currentWorkspace?.id}/chat` },
    { icon: History, label: 'History', path: `/workspaces/${currentWorkspace?.id}/sessions` },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <Shield className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold">VerityDraft</span>
      </div>

      <div className="px-4 py-4 border-b border-sidebar-border">
        <WorkspaceSwitcher current={currentWorkspace} workspaces={workspaces} onSwitch={switchWorkspace} />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border relative">
        <button
          data-testid="user-menu"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-primary-foreground">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
          </div>
          <ChevronUp className={`w-4 h-4 text-sidebar-muted-foreground transition-transform ${showUserMenu ? '' : 'rotate-180'}`} />
        </button>

        {showUserMenu && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-sidebar-accent rounded-lg shadow-lg border border-sidebar-border overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
