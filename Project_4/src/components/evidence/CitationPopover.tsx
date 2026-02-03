/**
 * CitationPopover Component
 * @version 1.0.0
 * Hover popover showing citation details and evidence snippet
 */

import React, { useState, useRef, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { VerdictBadge } from './VerdictBadge';
import type { Citation, Verdict } from '../../types';

interface CitationPopoverProps {
  citation: Citation;
  documentName?: string;
  evidenceSnippet?: string;
  onViewSource?: () => void;
  children: React.ReactNode;
}

export function CitationPopover({
  citation,
  documentName,
  evidenceSnippet,
  onViewSource,
  children,
}: CitationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 200;

      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      let top = rect.bottom + 8;

      // Adjust if popover would go off-screen
      if (left < 16) left = 16;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (top + popoverHeight > window.innerHeight - 16) {
        top = rect.top - popoverHeight - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {children}
      </span>

      {isOpen && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-80 bg-card rounded-lg shadow-xl border border-border overflow-hidden"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                {documentName || 'Source Document'}
              </span>
            </div>
            {citation.verdict && (
              <VerdictBadge verdict={citation.verdict} size="sm" />
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {evidenceSnippet ? (
              <blockquote className="text-sm text-foreground leading-relaxed border-l-2 border-primary pl-3 italic">
                "{evidenceSnippet}"
              </blockquote>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No evidence snippet available
              </p>
            )}
          </div>

          {/* Footer */}
          {onViewSource && (
            <div className="px-4 py-2 bg-muted/50 border-t border-border">
              <button
                onClick={onViewSource}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
              >
                View in document
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default CitationPopover;
