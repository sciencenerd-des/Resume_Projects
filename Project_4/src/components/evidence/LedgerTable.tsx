/**
 * LedgerTable Component
 * @version 2.0.0
 * Displays evidence ledger entries in a sortable table with themed styling
 */

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { VerdictBadge } from "./VerdictBadge"
import { ClaimTypeBadge } from "../ui/ClaimTypeBadge"
import { ImportanceDot } from "../ui/ImportanceDot"
import type { LedgerEntry } from "@/types"

interface LedgerTableProps {
  entries: LedgerEntry[]
  onRowClick?: (entry: LedgerEntry) => void
  highlightedId?: string
  className?: string
}

export function LedgerTable({
  entries,
  onRowClick,
  highlightedId,
  className,
}: LedgerTableProps) {
  const sortedEntries = useMemo(() => {
    const order = { supported: 0, weak: 1, contradicted: 2, not_found: 3 }
    return [...entries].sort((a, b) => order[a.verdict] - order[b.verdict])
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-muted-foreground">No claims to display</p>
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">Claim</TableHead>
            <TableHead className="text-muted-foreground">Type</TableHead>
            <TableHead className="text-muted-foreground">Verdict</TableHead>
            <TableHead className="text-muted-foreground w-32">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => (
            <TableRow
              key={entry.id}
              onClick={() => onRowClick?.(entry)}
              className={cn(
                "cursor-pointer transition-colors border-border",
                highlightedId === entry.id
                  ? "bg-primary/5"
                  : "hover:bg-accent/5"
              )}
            >
              <TableCell className="max-w-md">
                <div className="flex items-start gap-2">
                  <ImportanceDot importance={entry.importance} className="mt-1.5" />
                  <span className="text-sm text-foreground line-clamp-2">
                    {entry.claim_text}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <ClaimTypeBadge type={entry.claim_type} />
              </TableCell>
              <TableCell>
                <VerdictBadge verdict={entry.verdict} size="sm" />
              </TableCell>
              <TableCell>
                <ConfidenceBar value={entry.confidence} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100)

  return (
    <div className="flex items-center gap-2">
      <Progress
        value={percentage}
        className="h-1.5 flex-1"
      />
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">
        {percentage}%
      </span>
    </div>
  )
}

export default LedgerTable
