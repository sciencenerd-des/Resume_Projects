/**
 * ErrorWithRetry Component
 * @version 1.0.0
 * Error display with retry action
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorWithRetryProps {
  title?: string;
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorWithRetry({
  title = 'Something went wrong',
  message,
  onRetry,
  isRetrying = false,
  className = '',
}: ErrorWithRetryProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">{message}</p>

      <Button
        variant="secondary"
        onClick={onRetry}
        loading={isRetrying}
        icon={<RefreshCw className="w-4 h-4" />}
      >
        Try Again
      </Button>
    </div>
  );
}

export default ErrorWithRetry;
