/**
 * VerdictBadge Component
 * @version 2.0.0
 * Displays verification verdict with themed styling
 */

import * as React from "react"
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verdict } from "@/types"

interface VerdictBadgeProps {
  verdict: Verdict
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  showLabel?: boolean
  className?: string
}

const verdictConfig: Record<Verdict, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  supported: {
    label: "Supported",
    icon: CheckCircle,
    bgClass: "bg-verdict-supported/10",
    textClass: "text-verdict-supported",
    borderClass: "border-verdict-supported/30",
  },
  weak: {
    label: "Weak",
    icon: AlertTriangle,
    bgClass: "bg-verdict-weak/10",
    textClass: "text-verdict-weak",
    borderClass: "border-verdict-weak/30",
  },
  contradicted: {
    label: "Contradicted",
    icon: XCircle,
    bgClass: "bg-verdict-contradicted/10",
    textClass: "text-verdict-contradicted",
    borderClass: "border-verdict-contradicted/30",
  },
  not_found: {
    label: "Not Found",
    icon: HelpCircle,
    bgClass: "bg-verdict-missing/10",
    textClass: "text-verdict-missing",
    borderClass: "border-verdict-missing/30",
  },
}

const sizeClasses = {
  sm: {
    badge: "px-2 py-0.5 text-xs gap-1",
    icon: "h-3 w-3",
  },
  md: {
    badge: "px-2.5 py-1 text-xs gap-1.5",
    icon: "h-3.5 w-3.5",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm gap-2",
    icon: "h-4 w-4",
  },
}

export function VerdictBadge({
  verdict,
  size = "md",
  showIcon = true,
  showLabel = true,
  className,
}: VerdictBadgeProps) {
  const config = verdictConfig[verdict]
  const Icon = config.icon
  const sizes = sizeClasses[size]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizes.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      {showLabel && config.label}
    </span>
  )
}

export function VerdictDot({ verdict, className }: { verdict: Verdict; className?: string }) {
  const dotColors: Record<Verdict, string> = {
    supported: "bg-verdict-supported",
    weak: "bg-verdict-weak",
    contradicted: "bg-verdict-contradicted",
    not_found: "bg-verdict-missing",
  }

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        dotColors[verdict],
        className
      )}
    />
  )
}

export default VerdictBadge
