/**
 * EvidenceCanvas Component
 * @version 1.0.0
 * Canvas-style layout for evidence display with collapsible ledger panel
 */

import * as React from "react"
import { useState, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BentoStats } from "./BentoStats"
import { EvidenceLedgerPanel } from "./EvidenceLedgerPanel"
import type { EvidenceLedger, LedgerEntry } from "@/types"

interface EvidenceCanvasProps {
  ledger: EvidenceLedger | null
  documentCount?: number
  isLoading?: boolean
  onEntryClick?: (entry: LedgerEntry) => void
  onChunkClick?: (chunkId: string) => void
  children: React.ReactNode
  className?: string
}

export function EvidenceCanvas({
  ledger,
  documentCount = 0,
  isLoading = false,
  onEntryClick,
  onChunkClick,
  children,
  className,
}: EvidenceCanvasProps) {
  const [ledgerOpen, setLedgerOpen] = useState(true)
  const [ledgerExpanded, setLedgerExpanded] = useState(false)

  // Listen for keyboard shortcut (⌘L)
  React.useEffect(() => {
    const handleToggleLedger = () => setLedgerOpen(prev => !prev)
    window.addEventListener("toggle-ledger", handleToggleLedger)
    return () => window.removeEventListener("toggle-ledger", handleToggleLedger)
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setLedgerOpen(prev => !prev)
    }
    if (e.key === "Escape" && ledgerExpanded) {
      setLedgerExpanded(false)
    }
  }, [ledgerExpanded])

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        ledgerOpen && !ledgerExpanded ? "mr-0" : "mr-0"
      )}>
        {/* Bento Stats Header */}
        <div className="p-4 border-b border-border">
          <BentoStats
            ledger={ledger}
            documentCount={documentCount}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Ledger Toggle Button (when closed) */}
      {!ledgerOpen && (
        <div className="flex-shrink-0 border-l border-border bg-card/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLedgerOpen(true)}
            className="h-full px-2 rounded-none hover:bg-accent/10"
          >
            <div className="flex flex-col items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                Evidence Ledger
              </span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </Button>
        </div>
      )}

      {/* Evidence Ledger Panel */}
      {ledgerOpen && (
        <div className={cn(
          "flex-shrink-0 border-l border-border bg-card transition-all duration-300",
          ledgerExpanded ? "w-[600px]" : "w-[380px]"
        )}>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Evidence Ledger</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLedgerExpanded(!ledgerExpanded)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {ledgerExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLedgerOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="h-[calc(100%-53px)] overflow-hidden">
            <EvidenceLedgerPanel
              ledger={ledger}
              isLoading={isLoading}
              onEntryClick={onEntryClick}
              onChunkClick={onChunkClick}
              className="h-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default EvidenceCanvas
