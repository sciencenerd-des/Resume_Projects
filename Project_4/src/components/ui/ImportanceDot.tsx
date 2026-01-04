/**
 * ImportanceDot Component
 * @version 2.0.0
 * Visual indicator for claim importance level
 */

import { cn } from "@/lib/utils"
import type { ClaimImportance } from "@/types"

interface ImportanceDotProps {
  importance: ClaimImportance
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const importanceConfig: Record<ClaimImportance, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-verdict-contradicted" },
  material: { label: "Material", color: "bg-verdict-weak" },
  minor: { label: "Minor", color: "bg-muted-foreground" },
}

export function ImportanceDot({
  importance,
  size = "md",
  showLabel = false,
  className,
}: ImportanceDotProps) {
  const config = importanceConfig[importance]

  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={config.label}
    >
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          sizeClasses[size],
          config.color
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{config.label}</span>
      )}
    </span>
  )
}

export default ImportanceDot
