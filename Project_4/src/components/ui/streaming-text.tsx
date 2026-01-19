/**
 * StreamingText Component
 * @version 1.0.0
 * Animated text reveal for streaming responses
 */

import * as React from "react"
import { cn } from "@/lib/utils"

interface StreamingTextProps {
  text: string
  className?: string
  speed?: "slow" | "normal" | "fast"
  cursor?: boolean
}

export function StreamingText({
  text,
  className,
  speed = "normal",
  cursor = true,
}: StreamingTextProps) {
  const speedClasses = {
    slow: "animate-[fade-in_0.3s_ease-out]",
    normal: "animate-[fade-in_0.15s_ease-out]",
    fast: "animate-[fade-in_0.08s_ease-out]",
  }

  return (
    <span className={cn("relative", className)}>
      <span className={speedClasses[speed]}>{text}</span>
      {cursor && (
        <span className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-primary animate-pulse align-middle" />
      )}
    </span>
  )
}

interface StreamingIndicatorProps {
  className?: string
  variant?: "dots" | "pulse" | "bar"
}

export function StreamingIndicator({
  className,
  variant = "dots",
}: StreamingIndicatorProps) {
  if (variant === "dots") {
    return (
      <span className={cn("inline-flex gap-1", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
      </span>
    )
  }

  if (variant === "pulse") {
    return (
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-primary/20 animate-ping",
          className
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-block h-1 w-16 rounded-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-shimmer",
        className
      )}
    />
  )
}

interface TypewriterTextProps {
  text: string
  className?: string
  delay?: number
  onComplete?: () => void
}

export function TypewriterText({
  text,
  className,
  delay = 30,
  onComplete,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = React.useState("")
  const [isComplete, setIsComplete] = React.useState(false)

  React.useEffect(() => {
    setDisplayedText("")
    setIsComplete(false)

    let currentIndex = 0
    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(intervalId)
        setIsComplete(true)
        onComplete?.()
      }
    }, delay)

    return () => clearInterval(intervalId)
  }, [text, delay, onComplete])

  return (
    <span className={cn("relative", className)}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-primary animate-pulse align-middle" />
      )}
    </span>
  )
}

export default StreamingText
