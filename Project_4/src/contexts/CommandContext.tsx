import * as React from "react"
import { CommandPalette } from "@/components/command/CommandPalette"

interface CommandContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandContext = React.createContext<CommandContextValue | undefined>(undefined)

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <CommandContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandContext.Provider>
  )
}

export function useCommand() {
  const context = React.useContext(CommandContext)
  if (!context) {
    throw new Error("useCommand must be used within CommandProvider")
  }
  return context
}
