/**
 * Header Component
 * @version 1.0.0
 * Page header with title and actions
 */

import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-background border-b border-border">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-accent lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export default Header;
