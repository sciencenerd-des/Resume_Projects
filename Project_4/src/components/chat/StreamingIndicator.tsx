/**
 * StreamingIndicator Component
 * @version 1.0.0
 * Visual indicator for streaming/thinking states
 */

import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface StreamingIndicatorProps {
  variant?: 'thinking' | 'generating' | 'verifying';
  className?: string;
}

const variantConfig = {
  thinking: {
    label: 'Thinking...',
    icon: Bot,
    dotColor: 'bg-blue-500',
  },
  generating: {
    label: 'Generating response...',
    icon: Sparkles,
    dotColor: 'bg-purple-500',
  },
  verifying: {
    label: 'Verifying claims...',
    icon: Sparkles,
    dotColor: 'bg-green-500',
  },
};

export function StreamingIndicator({
  variant = 'thinking',
  className = '',
}: StreamingIndicatorProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${config.dotColor} animate-pulse`} />
      </div>

      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">{config.label}</span>
        <ThinkingDots />
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export default StreamingIndicator;
