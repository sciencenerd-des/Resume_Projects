/**
 * ClaimTypeBadge Component
 * @version 2.0.0
 * Displays claim type classification with themed styling
 */

import { cn } from "@/lib/utils"
import type { ClaimType } from "@/types"

interface ClaimTypeBadgeProps {
  type: ClaimType
  size?: "sm" | "md"
  className?: string
}

const typeConfig: Record<ClaimType, { label: string; bgClass: string; textClass: string }> = {
  fact: {
    label: "Fact",
    bgClass: "bg-claim-factual/10",
    textClass: "text-claim-factual",
  },
  policy: {
    label: "Policy",
    bgClass: "bg-claim-opinion/10",
    textClass: "text-claim-opinion",
  },
  numeric: {
    label: "Numeric",
    bgClass: "bg-claim-statistical/10",
    textClass: "text-claim-statistical",
  },
  definition: {
    label: "Definition",
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
  },
  scientific: {
    label: "Scientific",
    bgClass: "bg-blue-500/10",
    textClass: "text-blue-500",
  },
  historical: {
    label: "Historical",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-500",
  },
  legal: {
    label: "Legal",
    bgClass: "bg-purple-500/10",
    textClass: "text-purple-500",
  },
}

export function ClaimTypeBadge({ type, size = "md", className }: ClaimTypeBadgeProps) {
  const config = typeConfig[type]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export default ClaimTypeBadge
