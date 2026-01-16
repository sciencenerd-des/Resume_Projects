/**
 * EmptyState Component
 * @version 1.0.0
 * Flexible empty state display for lists and content areas
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center justify-center gap-3">
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick} icon={action.icon}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
