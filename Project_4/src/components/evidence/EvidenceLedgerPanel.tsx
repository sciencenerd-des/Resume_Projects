/**
 * EvidenceLedgerPanel Component
 * @version 2.0.0
 * Side panel displaying the evidence ledger with summary and claims
 */

import { useState, useMemo } from "react"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Filter,
  X,
  FileText,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VerdictBadge } from "./VerdictBadge"
import { ImportanceDot } from "../ui/ImportanceDot"
import type { EvidenceLedger, LedgerEntry, Verdict } from "@/types"

interface EvidenceLedgerPanelProps {
  ledger: EvidenceLedger | null
  isLoading?: boolean
  onEntryClick?: (entry: LedgerEntry) => void
  onChunkClick?: (chunkId: string) => void
  className?: string
}

export function EvidenceLedgerPanel({
  ledger,
  isLoading = false,
  onEntryClick,
  onChunkClick,
  className = "",
}: EvidenceLedgerPanelProps) {
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [filterVerdict, setFilterVerdict] = useState<Verdict | "all">("all")

  const filteredEntries = useMemo(() => {
    if (!ledger) return []
    if (filterVerdict === "all") return ledger.entries
    return ledger.entries.filter((entry) => entry.verdict === filterVerdict)
  }, [ledger, filterVerdict])

  const handleEntryClick = (entry: LedgerEntry) => {
    setSelectedEntry(entry)
    onEntryClick?.(entry)
  }

  if (isLoading) {
    return (
      <div className={cn("bg-card", className)}>
        <div className="p-4 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!ledger) {
    return (
      <div className={cn("bg-card", className)}>
        <div className="p-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground font-medium">No evidence ledger yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Claims will appear here as they are verified
          </p>
        </div>
      </div>
    )
  }

  const coveragePercent = Math.round(
    ((ledger.summary.supported + ledger.summary.weak) / ledger.summary.total_claims) * 100
  )

  return (
    <div className={cn("bg-card flex flex-col", className)}>
      {/* Summary Bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Evidence Coverage
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              coveragePercent >= 85
                ? "text-verdict-supported"
                : coveragePercent >= 70
                  ? "text-verdict-weak"
                  : "text-verdict-contradicted"
            )}
          >
            {coveragePercent}%
          </span>
        </div>
        <Progress value={coveragePercent} className="h-2" />
      </div>

      {/* Verdict Summary */}
      <div className="grid grid-cols-4 gap-1.5 p-3 border-b border-border">
        <VerdictSummaryItem
          icon={<CheckCircle className="h-4 w-4" />}
          count={ledger.summary.supported}
          label="Supported"
          colorClass="text-verdict-supported"
          bgClass="bg-verdict-supported/10"
          isActive={filterVerdict === "supported"}
          onClick={() =>
            setFilterVerdict(filterVerdict === "supported" ? "all" : "supported")
          }
        />
        <VerdictSummaryItem
          icon={<AlertTriangle className="h-4 w-4" />}
          count={ledger.summary.weak}
          label="Weak"
          colorClass="text-verdict-weak"
          bgClass="bg-verdict-weak/10"
          isActive={filterVerdict === "weak"}
          onClick={() =>
            setFilterVerdict(filterVerdict === "weak" ? "all" : "weak")
          }
        />
        <VerdictSummaryItem
          icon={<XCircle className="h-4 w-4" />}
          count={ledger.summary.contradicted}
          label="Contradicted"
          colorClass="text-verdict-contradicted"
          bgClass="bg-verdict-contradicted/10"
          isActive={filterVerdict === "contradicted"}
          onClick={() =>
            setFilterVerdict(filterVerdict === "contradicted" ? "all" : "contradicted")
          }
        />
        <VerdictSummaryItem
          icon={<HelpCircle className="h-4 w-4" />}
          count={ledger.summary.not_found}
          label="Not Found"
          colorClass="text-verdict-missing"
          bgClass="bg-verdict-missing/10"
          isActive={filterVerdict === "not_found"}
          onClick={() =>
            setFilterVerdict(filterVerdict === "not_found" ? "all" : "not_found")
          }
        />
      </div>

      {/* Risk Flags */}
      {ledger.risk_flags.length > 0 && (
        <div className="px-4 py-3 bg-verdict-contradicted/5 border-b border-verdict-contradicted/20">
          <div className="flex items-center gap-2 text-verdict-contradicted mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {ledger.risk_flags.length} Risk Flag
              {ledger.risk_flags.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="space-y-1">
            {ledger.risk_flags.slice(0, 3).map((flag) => (
              <li key={flag.id} className="text-xs text-verdict-contradicted/80">
                &bull; {flag.description}
              </li>
            ))}
            {ledger.risk_flags.length > 3 && (
              <li className="text-xs text-verdict-contradicted/60 font-medium">
                +{ledger.risk_flags.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Filter Indicator */}
      {filterVerdict !== "all" && (
        <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
          <span className="text-xs text-primary">
            Showing {filteredEntries.length} {filterVerdict.replace("_", " ")} claim
            {filteredEntries.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterVerdict("all")}
            className="h-6 px-2 text-xs text-primary hover:text-primary"
          >
            Clear
            <X className="h-3 w-3 ml-1" />
          </Button>
        </div>
      )}

      {/* Claims List */}
      <ScrollArea className="flex-1">
        {filteredEntries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No claims match this filter</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredEntries.map((entry) => (
              <ClaimRow
                key={entry.id}
                entry={entry}
                isSelected={selectedEntry?.id === entry.id}
                onClick={() => handleEntryClick(entry)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selected Entry Detail */}
      {selectedEntry && (
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Evidence Detail
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEntry(null)}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {selectedEntry.evidence_snippet ? (
            <blockquote className="text-sm text-foreground bg-card p-3 rounded-lg border-l-2 border-primary">
              {selectedEntry.evidence_snippet}
            </blockquote>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No evidence snippet available
            </p>
          )}
          {selectedEntry.chunk_ids.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedEntry.chunk_ids.map((chunkId) => (
                <Button
                  key={chunkId}
                  variant="outline"
                  size="sm"
                  onClick={() => onChunkClick?.(chunkId)}
                  className="h-7 text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View source
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VerdictSummaryItem({
  icon,
  count,
  label,
  colorClass,
  bgClass,
  isActive,
  onClick,
}: {
  icon: React.ReactNode
  count: number
  label: string
  colorClass: string
  bgClass: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center p-2 rounded-lg transition-all",
        isActive
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-accent/10"
      )}
    >
      <span className={colorClass}>{icon}</span>
      <span className={cn("text-lg font-bold", colorClass)}>{count}</span>
      <span className="text-[10px] text-muted-foreground truncate">{label}</span>
    </button>
  )
}

function ClaimRow({
  entry,
  isSelected,
  onClick,
}: {
  entry: LedgerEntry
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 transition-colors",
        isSelected ? "bg-primary/5" : "hover:bg-accent/5"
      )}
    >
      <div className="flex items-start gap-2">
        <ImportanceDot importance={entry.importance} className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2">{entry.claim_text}</p>
          <div className="flex items-center gap-2 mt-1">
            <VerdictBadge verdict={entry.verdict} size="sm" showIcon={false} />
            <span className="text-xs text-muted-foreground">
              {Math.round(entry.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default EvidenceLedgerPanel
