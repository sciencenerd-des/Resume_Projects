/**
 * CitationAnchor Component
 * @version 2.0.0
 * Inline citation markers with HoverCard preview
 */

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { VerdictBadge } from "./VerdictBadge"
import type { Verdict } from "@/types"

interface CitationAnchorProps {
  chunkId: string
  index: number
  verdict?: Verdict
  documentName?: string
  snippet?: string
  onClick?: (chunkId: string) => void
}

const verdictColors: Record<Verdict, string> = {
  supported: "bg-verdict-supported",
  weak: "bg-verdict-weak",
  contradicted: "bg-verdict-contradicted",
  not_found: "bg-verdict-missing",
}

const verdictRingColors: Record<Verdict, string> = {
  supported: "ring-verdict-supported/50",
  weak: "ring-verdict-weak/50",
  contradicted: "ring-verdict-contradicted/50",
  not_found: "ring-verdict-missing/50",
}

export function CitationAnchor({
  chunkId,
  index,
  verdict = "supported",
  documentName,
  snippet,
  onClick,
}: CitationAnchorProps) {
  const hasPreview = documentName || snippet

  const anchor = (
    <button
      type="button"
      onClick={() => onClick?.(chunkId)}
      className={cn(
        "inline-flex items-center justify-center",
        "w-5 h-5 rounded-full text-[10px] font-medium text-white",
        verdictColors[verdict],
        "hover:ring-2 hover:ring-offset-1 hover:ring-offset-background",
        verdictRingColors[verdict],
        "transition-all cursor-pointer align-middle",
        "focus:outline-none focus:ring-2 focus:ring-offset-1",
        "focus:ring-offset-background focus:ring-primary"
      )}
      title={`View source [${index}]`}
    >
      {index}
    </button>
  )

  if (!hasPreview) {
    return anchor
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {anchor}
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="w-80 p-0 overflow-hidden"
      >
        <div className="p-3 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              {documentName || "Source Document"}
            </span>
          </div>
        </div>
        {snippet && (
          <div className="p-3">
            <p className="text-sm text-muted-foreground line-clamp-4">
              {snippet}
            </p>
          </div>
        )}
        <div className="px-3 py-2 border-t border-border bg-muted/30 flex items-center justify-between">
          <VerdictBadge verdict={verdict} size="sm" />
          <span className="text-xs text-muted-foreground">
            Click to view full source
          </span>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function FallbackCitationAnchor({ index }: { index: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "w-5 h-5 rounded-full text-[10px] font-medium",
        "bg-muted text-muted-foreground",
        "align-middle"
      )}
      title={`Citation [${index}]`}
    >
      {index}
    </span>
  )
}

export default CitationAnchor
