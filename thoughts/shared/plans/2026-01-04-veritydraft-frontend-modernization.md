# VerityDraft Frontend Modernization Implementation Plan

## Overview

This plan transforms VerityDraft from a sidebar-based interface to a modern **Canvas + Command Palette + Bento Grid** layout using **ShadCN UI** components. The implementation prioritizes keyboard navigation (⌘K), evidence-first design, and professional aesthetics inspired by Linear, Claude Artifacts, and v0 by Vercel.

**Based on:** `thoughts/shared/research/2026-01-04-veritydraft-frontend-modernization-research.md`

---

## Current State Analysis

### Existing Architecture
| Component | Status | Location |
|-----------|--------|----------|
| React 18 + TypeScript | ✅ Exists | `src/frontend.tsx` |
| Tailwind CSS 3.4.1 | ✅ Exists | `src/styles/main.css` |
| Lucide React Icons | ✅ Exists | Used throughout |
| Router (React Router v6) | ✅ Exists | `src/App.tsx` |
| WebSocket Streaming | ✅ Exists | `src/hooks/useWebSocket.ts` |
| Sidebar Layout | ⚠️ To Remove | `src/components/layout/Sidebar.tsx` |
| ShadCN UI | ❌ Missing | Needs initialization |
| Command Palette (cmdk) | ❌ Missing | Needs installation |

### Component Inventory
- **Base UI**: 12 components in `src/components/ui/`
- **Layout**: 3 components (AppLayout, Sidebar, Header)
- **Domain-specific**: ~35 components across auth, chat, documents, evidence, workspace
- **Pages**: 7 pages in `src/pages/`
- **Contexts**: 4 providers (Auth, Workspace, Theme, Supabase)
- **Hooks**: 5 custom hooks

### Key Discoveries:
- Tailwind already uses HSL color variables (`src/styles/main.css:1-50`)
- Button variants defined as style objects, easy to replace (`src/components/ui/Button.tsx:5-25`)
- EvidenceLedgerPanel is the largest component at ~339 lines (`src/components/evidence/EvidenceLedgerPanel.tsx`)
- WebSocket integration deeply tied to chat flow (`src/components/chat/ChatInterface.tsx`)

---

## Desired End State

A professional, keyboard-first interface with:

1. **Canvas-centric Layout**: Evidence response and ledger as primary content, chat input as secondary
2. **Command Palette (⌘K)**: All navigation via keyboard, no permanent sidebar
3. **Bento Grid Stats**: Modular tiles for coverage, supported claims, weak claims, risks
4. **Inline Citation Previews**: Hover/click citations for source context
5. **Dark Theme Default**: OpenAI-inspired color palette
6. **Full Keyboard Navigation**: ⌘K, ⌘L, ⌘U, ⌘N, ⌘E shortcuts

### Verification Criteria
- No sidebar visible in any view
- ⌘K opens command palette from any screen
- All navigation accessible via keyboard
- Evidence canvas takes 70%+ of viewport
- Bento stats visible on chat page
- Citations show inline preview on hover
- Dark mode is default (light mode toggle optional)

---

## What We're NOT Doing

1. **Not migrating to Streamlit** - Python-based, incompatible with React stack
2. **Not keeping the sidebar** - Replaced by command palette
3. **Not adding Storybook** - Deferred to long-term goals
4. **Not building mobile-first** - Desktop-first, responsive later
5. **Not changing database schema** - Frontend only
6. **Not modifying WebSocket protocol** - Keep existing streaming logic

---

## Implementation Approach

**Strategy**: Incremental migration in 6 phases, maintaining functionality throughout.

```
Phase 1: Foundation (ShadCN + cmdk + Theme)
    ↓
Phase 2: Core UI Components (Replace base components)
    ↓
Phase 3: Command Palette (⌘K system)
    ↓
Phase 4: Canvas Layout (Remove sidebar, add bento)
    ↓
Phase 5: Evidence Enhancements (Citations, ledger)
    ↓
Phase 6: Polish (Animations, shortcuts, refinement)
```

---

## Phase 1: Foundation Setup

### Overview
Initialize ShadCN UI, install cmdk, and establish the new dark theme color system.

### Changes Required:

#### 1. Initialize ShadCN UI

**Action**: Run initialization command

```bash
bunx shadcn-ui@latest init
```

**Configuration choices**:
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: Update existing (create if missing)
- Components path: `src/components/ui`
- Utils path: `src/lib/utils`

#### 2. Install Dependencies

**File**: `package.json`
**Action**: Add required packages

```bash
bun add @radix-ui/react-slot class-variance-authority clsx tailwind-merge cmdk
```

#### 3. Create Tailwind Configuration

**File**: `tailwind.config.js` (NEW)
**Changes**: Create comprehensive config with ShadCN theme

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/index.html",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Evidence-specific colors
        verdict: {
          supported: "hsl(var(--verdict-supported))",
          weak: "hsl(var(--verdict-weak))",
          contradicted: "hsl(var(--verdict-contradicted))",
          missing: "hsl(var(--verdict-missing))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in-from-top 0.15s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

#### 4. Update CSS Variables

**File**: `src/styles/main.css`
**Changes**: Replace existing variables with OpenAI-inspired dark theme

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 5%;
    --foreground: 0 0% 93%;

    --card: 0 0% 8%;
    --card-foreground: 0 0% 93%;

    --popover: 0 0% 8%;
    --popover-foreground: 0 0% 93%;

    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 100%;

    --secondary: 240 5% 15%;
    --secondary-foreground: 0 0% 93%;

    --muted: 240 5% 20%;
    --muted-foreground: 0 0% 60%;

    --accent: 160 84% 39%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 15%;
    --input: 0 0% 12%;
    --ring: 160 84% 39%;

    --radius: 0.75rem;

    /* Evidence-specific */
    --verdict-supported: 142 76% 36%;
    --verdict-weak: 38 92% 50%;
    --verdict-contradicted: 0 84% 60%;
    --verdict-missing: 240 5% 46%;
  }

  .light {
    --background: 0 0% 100%;
    --foreground: 240 10% 4%;

    --card: 0 0% 100%;
    --card-foreground: 240 10% 4%;

    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 4%;

    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 100%;

    --secondary: 240 5% 96%;
    --secondary-foreground: 240 6% 10%;

    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 46%;

    --accent: 160 84% 39%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 240 6% 90%;
    --input: 240 6% 90%;
    --ring: 160 84% 39%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Scrollbar styling */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Custom scrollbar for evidence panel */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
```

#### 5. Create Utils File

**File**: `src/lib/utils.ts` (NEW)
**Changes**: Add ShadCN utility functions

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

#### 6. Install Tailwind Animate Plugin

**Action**: Add animation plugin

```bash
bun add tailwindcss-animate
```

### Success Criteria:

#### Automated Verification:
- [ ] Dependencies installed: `bun install` completes without errors
- [ ] Tailwind builds: `bunx tailwindcss -i src/styles/main.css -o /dev/null` succeeds
- [ ] TypeScript compiles: `bun run typecheck` passes (if script exists)
- [ ] `src/lib/utils.ts` exports `cn` function
- [ ] `tailwind.config.js` exists and is valid

#### Manual Verification:
- [ ] Application starts: `bun --hot src/index.ts` loads without errors
- [ ] Dark theme applied: Page background is near-black (#0d0d0d)
- [ ] CSS variables work: Elements styled correctly

---

## Phase 2: Core UI Components

### Overview
Replace existing base UI components with ShadCN equivalents, maintaining API compatibility where possible.

### Changes Required:

#### 1. Add ShadCN Button

**Action**: Add component via CLI

```bash
bunx shadcn-ui@latest add button
```

**File**: `src/components/ui/button.tsx` (ShadCN will create)
**Post-changes**: Add loading dots variant

```typescript
// Add to buttonVariants after existing variants
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        // ... existing
        loading: "bg-primary/80 text-primary-foreground pointer-events-none",
      },
      // ...
    },
  }
)

// Add LoadingDots component
function LoadingDots() {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
    </span>
  )
}

// Update Button component to use loading
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant: loading ? "loading" : variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? <LoadingDots /> : children}
      </Comp>
    )
  }
)
```

#### 2. Add ShadCN Input

**Action**: Add component

```bash
bunx shadcn-ui@latest add input
```

#### 3. Add ShadCN Dialog (replaces Modal)

**Action**: Add component

```bash
bunx shadcn-ui@latest add dialog
```

#### 4. Add ShadCN Alert Dialog (replaces ConfirmModal)

**Action**: Add component

```bash
bunx shadcn-ui@latest add alert-dialog
```

#### 5. Add ShadCN Card

**Action**: Add component

```bash
bunx shadcn-ui@latest add card
```

#### 6. Add ShadCN Skeleton

**Action**: Add component

```bash
bunx shadcn-ui@latest add skeleton
```

#### 7. Add ShadCN Progress

**Action**: Add component

```bash
bunx shadcn-ui@latest add progress
```

#### 8. Add ShadCN Badge

**Action**: Add component

```bash
bunx shadcn-ui@latest add badge
```

#### 9. Add ShadCN Tooltip

**Action**: Add component

```bash
bunx shadcn-ui@latest add tooltip
```

#### 10. Add ShadCN Popover

**Action**: Add component

```bash
bunx shadcn-ui@latest add popover
```

#### 11. Add ShadCN HoverCard (for citations)

**Action**: Add component

```bash
bunx shadcn-ui@latest add hover-card
```

#### 12. Add ShadCN Dropdown Menu

**Action**: Add component

```bash
bunx shadcn-ui@latest add dropdown-menu
```

#### 13. Add ShadCN Scroll Area

**Action**: Add component

```bash
bunx shadcn-ui@latest add scroll-area
```

#### 14. Add ShadCN Separator

**Action**: Add component

```bash
bunx shadcn-ui@latest add separator
```

#### 15. Add ShadCN Tabs

**Action**: Add component

```bash
bunx shadcn-ui@latest add tabs
```

#### 16. Add ShadCN Accordion (for ledger expansion)

**Action**: Add component

```bash
bunx shadcn-ui@latest add accordion
```

#### 17. Update Component Exports

**File**: `src/components/ui/index.ts`
**Changes**: Re-export all ShadCN components plus custom ones

```typescript
// ShadCN components
export * from "./button"
export * from "./input"
export * from "./dialog"
export * from "./alert-dialog"
export * from "./card"
export * from "./skeleton"
export * from "./progress"
export * from "./badge"
export * from "./tooltip"
export * from "./popover"
export * from "./hover-card"
export * from "./dropdown-menu"
export * from "./scroll-area"
export * from "./separator"
export * from "./tabs"
export * from "./accordion"

// Custom domain components
export { ClaimTypeBadge } from "./ClaimTypeBadge"
export { ImportanceDot } from "./ImportanceDot"
export { EmptyState } from "./EmptyState"
export { HighlightedText } from "./HighlightedText"
export { ErrorWithRetry } from "./ErrorWithRetry"
export { InlineError } from "./InlineError"
```

#### 18. Deprecate Old Components

**Files to deprecate** (keep for reference, add deprecation notice):
- `src/components/ui/Button.tsx` → Use `button.tsx`
- `src/components/ui/Input.tsx` → Use `input.tsx`
- `src/components/ui/Modal.tsx` → Use `dialog.tsx`
- `src/components/ui/ConfirmModal.tsx` → Use `alert-dialog.tsx`
- `src/components/ui/Progress.tsx` → Use `progress.tsx`
- `src/components/ui/Spinner.tsx` → Use LoadingDots in button.tsx

Add to each deprecated file:
```typescript
/**
 * @deprecated Use ShadCN equivalent from './button' instead
 * This file is kept for reference during migration.
 */
```

### Success Criteria:

#### Automated Verification:
- [ ] All ShadCN components exist in `src/components/ui/`
- [ ] TypeScript compiles: `bun run typecheck` passes
- [ ] No import errors: Build succeeds
- [ ] `src/components/ui/index.ts` exports all components

#### Manual Verification:
- [ ] Button renders with loading dots when loading=true
- [ ] Dialog opens/closes with animation
- [ ] HoverCard shows on hover with delay
- [ ] All components respect dark theme

---

## Phase 3: Command Palette (⌘K System)

### Overview
Implement the command palette as the primary navigation interface, replacing sidebar navigation.

### Changes Required:

#### 1. Create CommandPalette Component

**File**: `src/components/command/CommandPalette.tsx` (NEW)
**Changes**: Create main command palette component

```typescript
"use client"

import * as React from "react"
import { Command } from "cmdk"
import { useNavigate } from "react-router-dom"
import {
  Search,
  FileText,
  Upload,
  MessageSquare,
  History,
  Settings,
  Moon,
  Sun,
  LogOut,
  Plus,
  FolderOpen,
  BarChart3,
} from "lucide-react"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { currentWorkspace, workspaces } = useWorkspace()
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }

      // Quick shortcuts when palette is closed
      if (!open && (e.metaKey || e.ctrlKey)) {
        if (e.key === "l") {
          e.preventDefault()
          // Toggle ledger (handled by ChatPage)
          window.dispatchEvent(new CustomEvent("toggle-ledger"))
        }
        if (e.key === "u") {
          e.preventDefault()
          navigate(`/workspaces/${currentWorkspace?.id}/documents`)
        }
        if (e.key === "n") {
          e.preventDefault()
          navigate(`/workspaces/${currentWorkspace?.id}/chat`)
        }
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange, navigate, currentWorkspace])

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] w-full max-w-[640px] -translate-x-1/2">
        <Command
          className={cn(
            "bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
            "animate-slide-in"
          )}
          loop
        >
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands, documents, or ask a question..."
              className="flex h-14 w-full bg-transparent py-3 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group heading="Navigation" className="px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(() => navigate(`/workspaces/${currentWorkspace?.id}/chat`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>New Query</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘N</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate(`/workspaces/${currentWorkspace?.id}/documents`))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span>Upload Documents</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘U</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => window.dispatchEvent(new CustomEvent("toggle-ledger")))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>Toggle Evidence Ledger</span>
                <kbd className="ml-auto text-xs text-muted-foreground">⌘L</kbd>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(() => navigate("/workspaces"))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span>Switch Workspace</span>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-border" />

            {/* Workspaces Group */}
            <Command.Group heading="Workspaces" className="px-2 py-1.5">
              {workspaces?.map((workspace) => (
                <Command.Item
                  key={workspace.id}
                  onSelect={() => runCommand(() => navigate(`/workspaces/${workspace.id}`))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{workspace.name}</span>
                  {workspace.id === currentWorkspace?.id && (
                    <span className="ml-auto text-xs text-primary">Current</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-border" />

            {/* Actions Group */}
            <Command.Group heading="Actions" className="px-2 py-1.5">
              <Command.Item
                onSelect={() => runCommand(toggleTheme)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
                <span>Toggle Theme</span>
              </Command.Item>

              <Command.Item
                onSelect={() => runCommand(signOut)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-destructive hover:bg-destructive/10 aria-selected:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <span>⌘K to search</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
```

#### 2. Create Command Provider

**File**: `src/contexts/CommandContext.tsx` (NEW)
**Changes**: Global command palette state

```typescript
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
```

#### 3. Create Keyboard Shortcuts Hook

**File**: `src/hooks/useKeyboardShortcuts.ts` (NEW)
**Changes**: Centralized keyboard shortcut handling

```typescript
import * as React from "react"

interface Shortcut {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  callback: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta ? e.metaKey : true
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey

        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && ctrlMatch && shiftMatch) {
          e.preventDefault()
          shortcut.callback()
          return
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts])
}
```

#### 4. Create ShortcutsFooter Component

**File**: `src/components/command/ShortcutsFooter.tsx` (NEW)
**Changes**: Footer showing available shortcuts

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

interface ShortcutHint {
  keys: string
  label: string
}

const shortcuts: ShortcutHint[] = [
  { keys: "⌘K", label: "Search" },
  { keys: "⌘L", label: "Ledger" },
  { keys: "⌘U", label: "Upload" },
  { keys: "⌘N", label: "New Query" },
]

export function ShortcutsFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-6 text-xs text-muted-foreground", className)}>
      {shortcuts.map(({ keys, label }) => (
        <span key={keys} className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
            {keys}
          </kbd>
          <span>{label}</span>
        </span>
      ))}
    </div>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `src/components/command/CommandPalette.tsx` exists
- [ ] `src/contexts/CommandContext.tsx` exists
- [ ] TypeScript compiles without errors
- [ ] All cmdk imports resolve

#### Manual Verification:
- [ ] ⌘K opens command palette from any page
- [ ] ESC closes command palette
- [ ] Arrow keys navigate options
- [ ] Enter selects option and navigates
- [ ] Search filters commands
- [ ] ⌘L toggles ledger (when on chat page)
- [ ] ⌘U navigates to documents
- [ ] ⌘N navigates to new chat

---

## Phase 4: Canvas Layout (Remove Sidebar)

### Overview
Replace the sidebar-based layout with a canvas-centric design. The Evidence Canvas becomes primary, with bento-style stats and bottom-anchored chat input.

### Changes Required:

#### 1. Create New AppLayout (No Sidebar)

**File**: `src/components/layout/AppLayout.tsx`
**Changes**: Complete rewrite - remove sidebar, add command palette trigger

```typescript
import * as React from "react"
import { Outlet } from "react-router-dom"
import { Search, Moon, Sun, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCommand } from "@/contexts/CommandContext"
import { useAuth } from "@/hooks/useAuth"
import { useTheme } from "@/contexts/ThemeContext"
import { useWorkspace } from "@/hooks/useWorkspace"
import { ShortcutsFooter } from "@/components/command/ShortcutsFooter"

export function AppLayout() {
  const { setOpen } = useCommand()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { currentWorkspace } = useWorkspace()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left: Command Palette Trigger */}
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="w-64 justify-start text-muted-foreground hover:text-foreground"
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Search or ask...</span>
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>

          {/* Center: Logo/Workspace */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="font-semibold text-foreground">VerityDraft</span>
            {currentWorkspace && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{currentWorkspace.name}</span>
              </>
            )}
          </div>

          {/* Right: Theme & User */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Bottom Shortcuts Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-10 items-center justify-center px-4">
          <ShortcutsFooter />
        </div>
      </footer>
    </div>
  )
}
```

#### 2. Create Bento Stats Component

**File**: `src/components/evidence/BentoStats.tsx` (NEW)
**Changes**: Create modular stats tiles

```typescript
import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LedgerEntry } from "@/types"

interface BentoStatsProps {
  entries: LedgerEntry[]
  className?: string
}

interface StatTile {
  label: string
  value: number | string
  color: string
  bgColor: string
}

export function BentoStats({ entries, className }: BentoStatsProps) {
  const stats = React.useMemo(() => {
    const total = entries.length
    const supported = entries.filter(e => e.verdict === "supported").length
    const weak = entries.filter(e => e.verdict === "weak").length
    const contradicted = entries.filter(e => e.verdict === "contradicted").length
    const missing = entries.filter(e => e.verdict === "not_found").length

    const coverage = total > 0
      ? Math.round(((supported + weak) / total) * 100)
      : 0

    return { total, supported, weak, contradicted, missing, coverage }
  }, [entries])

  const tiles: StatTile[] = [
    {
      label: "Coverage",
      value: `${stats.coverage}%`,
      color: stats.coverage >= 85 ? "text-verdict-supported" : stats.coverage >= 50 ? "text-verdict-weak" : "text-verdict-contradicted",
      bgColor: "bg-card",
    },
    {
      label: "Supported",
      value: stats.supported,
      color: "text-verdict-supported",
      bgColor: "bg-verdict-supported/10",
    },
    {
      label: "Weak",
      value: stats.weak,
      color: "text-verdict-weak",
      bgColor: "bg-verdict-weak/10",
    },
    {
      label: "Risks",
      value: stats.contradicted + stats.missing,
      color: stats.contradicted + stats.missing > 0 ? "text-verdict-contradicted" : "text-muted-foreground",
      bgColor: stats.contradicted + stats.missing > 0 ? "bg-verdict-contradicted/10" : "bg-card",
    },
  ]

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          className={cn(
            "p-4 border border-border rounded-xl transition-colors hover:border-primary/50",
            tile.bgColor
          )}
        >
          <div className="flex flex-col items-center gap-1">
            <span className={cn("text-2xl font-bold", tile.color)}>
              {tile.value}
            </span>
            <span className="text-xs text-muted-foreground">
              {tile.label}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

#### 3. Create Evidence Canvas Component

**File**: `src/components/evidence/EvidenceCanvas.tsx` (NEW)
**Changes**: Main canvas component combining response + ledger

```typescript
import * as React from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ResponseContent } from "@/components/chat/ResponseContent"
import { BentoStats } from "./BentoStats"
import { LedgerTable } from "./LedgerTable"
import { cn } from "@/lib/utils"
import type { Message, LedgerEntry } from "@/types"

interface EvidenceCanvasProps {
  message?: Message
  ledgerEntries: LedgerEntry[]
  isStreaming?: boolean
  className?: string
}

export function EvidenceCanvas({
  message,
  ledgerEntries,
  isStreaming = false,
  className
}: EvidenceCanvasProps) {
  const [ledgerExpanded, setLedgerExpanded] = React.useState<string>("")

  // Listen for toggle-ledger events
  React.useEffect(() => {
    function handleToggle() {
      setLedgerExpanded(prev => prev === "ledger" ? "" : "ledger")
    }
    window.addEventListener("toggle-ledger", handleToggle)
    return () => window.removeEventListener("toggle-ledger", handleToggle)
  }, [])

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {/* Response Card */}
      {message && (
        <Card className="p-6 border border-border bg-card">
          <ScrollArea className="max-h-[50vh]">
            <ResponseContent
              content={message.content}
              citations={message.citations}
              isStreaming={isStreaming}
            />
          </ScrollArea>
        </Card>
      )}

      {/* Bento Stats */}
      {ledgerEntries.length > 0 && (
        <BentoStats entries={ledgerEntries} />
      )}

      {/* Evidence Ledger (Expandable) */}
      {ledgerEntries.length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={ledgerExpanded}
          onValueChange={setLedgerExpanded}
        >
          <AccordionItem value="ledger" className="border border-border rounded-xl bg-card">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-semibold">Evidence Ledger</span>
                <span className="text-sm text-muted-foreground">
                  {ledgerEntries.length} claims verified
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <LedgerTable entries={ledgerEntries} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Empty State */}
      {!message && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold text-foreground">
              Ask about your documents
            </h2>
            <p className="text-muted-foreground">
              VerityDraft will search your uploaded documents and provide verified answers with an evidence ledger.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

#### 4. Update ChatPage with Canvas Layout

**File**: `src/pages/chat/ChatPage.tsx`
**Changes**: Integrate EvidenceCanvas, move input to bottom

```typescript
import * as React from "react"
import { useParams } from "react-router-dom"
import { EvidenceCanvas } from "@/components/evidence/EvidenceCanvas"
import { QueryInput } from "@/components/chat/QueryInput"
import { ModeToggle } from "@/components/chat/ModeToggle"
import { StreamingIndicator } from "@/components/chat/StreamingIndicator"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useSessions } from "@/hooks/useSessions"
import type { Message, LedgerEntry } from "@/types"

export function ChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [mode, setMode] = React.useState<"answer" | "draft">("answer")
  const [currentMessage, setCurrentMessage] = React.useState<Message | null>(null)
  const [ledgerEntries, setLedgerEntries] = React.useState<LedgerEntry[]>([])
  const [isStreaming, setIsStreaming] = React.useState(false)

  const { sendQuery, status: wsStatus } = useWebSocket({
    workspaceId: workspaceId!,
    onContentChunk: (chunk) => {
      setCurrentMessage(prev => prev
        ? { ...prev, content: prev.content + chunk }
        : { id: crypto.randomUUID(), role: "assistant", content: chunk, citations: [] }
      )
    },
    onClaimVerified: (entry) => {
      setLedgerEntries(prev => [...prev, entry])
    },
    onGenerationComplete: () => {
      setIsStreaming(false)
    },
  })

  const handleSubmit = async (query: string) => {
    setIsStreaming(true)
    setCurrentMessage(null)
    setLedgerEntries([])
    await sendQuery(query, mode)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Canvas Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <EvidenceCanvas
            message={currentMessage}
            ledgerEntries={ledgerEntries}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto p-4">
          {isStreaming && <StreamingIndicator className="mb-3" />}

          <div className="flex items-end gap-4">
            <ModeToggle mode={mode} onModeChange={setMode} />
            <QueryInput
              onSubmit={handleSubmit}
              disabled={isStreaming || wsStatus !== "connected"}
              placeholder="Ask about your documents..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 5. Remove Old Sidebar

**File**: `src/components/layout/Sidebar.tsx`
**Changes**: Delete file or add deprecation notice

```typescript
/**
 * @deprecated Sidebar has been replaced by Command Palette (⌘K) navigation.
 * This file is kept for reference during migration.
 *
 * See: src/components/command/CommandPalette.tsx
 */

// Original code below for reference...
```

#### 6. Update App.tsx with CommandProvider

**File**: `src/App.tsx`
**Changes**: Wrap with CommandProvider

```typescript
import * as React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { SupabaseProvider } from "@/contexts/SupabaseContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { WorkspaceProvider } from "@/contexts/WorkspaceContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { CommandProvider } from "@/contexts/CommandContext"

import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppLayout } from "@/components/layout/AppLayout"

import { LoginPage } from "@/pages/auth/LoginPage"
import { SignupPage } from "@/pages/auth/SignupPage"
import { WorkspaceListPage } from "@/pages/workspace/WorkspaceListPage"
import { WorkspaceHomePage } from "@/pages/workspace/WorkspaceHomePage"
import { DocumentLibraryPage } from "@/pages/documents/DocumentLibraryPage"
import { ChatPage } from "@/pages/chat/ChatPage"
import { SessionViewPage } from "@/pages/sessions/SessionViewPage"

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SupabaseProvider>
          <AuthProvider>
            <ThemeProvider>
              <WorkspaceProvider>
                <CommandProvider>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />

                    {/* Protected routes */}
                    <Route element={<AuthGuard />}>
                      <Route element={<AppLayout />}>
                        <Route path="/workspaces" element={<WorkspaceListPage />} />
                        <Route path="/workspaces/:workspaceId" element={<WorkspaceHomePage />} />
                        <Route path="/workspaces/:workspaceId/documents" element={<DocumentLibraryPage />} />
                        <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
                        <Route path="/sessions/:sessionId" element={<SessionViewPage />} />
                      </Route>
                    </Route>

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/workspaces" replace />} />
                  </Routes>
                </CommandProvider>
              </WorkspaceProvider>
            </ThemeProvider>
          </AuthProvider>
        </SupabaseProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] No import errors referencing old Sidebar
- [ ] TypeScript compiles: `bun run typecheck` passes
- [ ] All new components exist in correct locations
- [ ] App.tsx includes CommandProvider wrapper

#### Manual Verification:
- [ ] No sidebar visible on any protected page
- [ ] Top navigation bar displays correctly
- [ ] ⌘K search bar visible in top left
- [ ] User menu works in top right
- [ ] Evidence Canvas displays responses correctly
- [ ] Bento stats show when ledger has data
- [ ] Ledger accordion expands/collapses
- [ ] Query input anchored at bottom
- [ ] Shortcuts footer visible at bottom

---

## Phase 5: Evidence Enhancements

### Overview
Improve citation experience with HoverCard previews, update ledger table styling, and enhance verdict badges.

### Changes Required:

#### 1. Update CitationAnchor with HoverCard

**File**: `src/components/evidence/CitationAnchor.tsx`
**Changes**: Add HoverCard for inline preview

```typescript
import * as React from "react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { VerdictBadge } from "./VerdictBadge"
import { cn } from "@/lib/utils"
import type { Citation, LedgerEntry } from "@/types"

interface CitationAnchorProps {
  citation: Citation
  ledgerEntry?: LedgerEntry
  onClick?: () => void
}

export function CitationAnchor({ citation, ledgerEntry, onClick }: CitationAnchorProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "inline-flex items-center justify-center",
            "min-w-[1.5rem] h-5 px-1.5",
            "rounded-md text-xs font-medium",
            "bg-primary/20 text-primary hover:bg-primary/30",
            "transition-colors cursor-pointer",
            "align-baseline"
          )}
        >
          {citation.index}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-96 p-4"
        sideOffset={4}
      >
        <div className="space-y-3">
          {/* Source Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {citation.documentName}
              </p>
              <p className="text-xs text-muted-foreground">
                Page {citation.page}, Chunk {citation.chunkIndex}
              </p>
            </div>
            {ledgerEntry && (
              <VerdictBadge verdict={ledgerEntry.verdict} size="sm" />
            )}
          </div>

          {/* Quoted Text */}
          <blockquote className="border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground italic">
            "{citation.text.slice(0, 200)}{citation.text.length > 200 ? "..." : ""}"
          </blockquote>

          {/* Confidence */}
          {ledgerEntry && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Confidence:</span>
              <span className={cn(
                "font-medium",
                ledgerEntry.confidence >= 0.8 ? "text-verdict-supported" :
                ledgerEntry.confidence >= 0.5 ? "text-verdict-weak" :
                "text-verdict-contradicted"
              )}>
                {Math.round(ledgerEntry.confidence * 100)}%
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <button className="text-xs text-primary hover:underline">
              View in document
            </button>
            <button className="text-xs text-muted-foreground hover:text-foreground">
              Copy citation
            </button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
```

#### 2. Update VerdictBadge with Better Styling

**File**: `src/components/evidence/VerdictBadge.tsx`
**Changes**: Use ShadCN Badge, add size variants

```typescript
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Check, AlertTriangle, X, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verdict } from "@/types"

interface VerdictBadgeProps {
  verdict: Verdict
  size?: "sm" | "md"
  showIcon?: boolean
}

const verdictConfig: Record<Verdict, {
  label: string
  icon: React.ElementType
  className: string
}> = {
  supported: {
    label: "Supported",
    icon: Check,
    className: "bg-verdict-supported/20 text-verdict-supported border-verdict-supported/30 hover:bg-verdict-supported/30",
  },
  weak: {
    label: "Weak",
    icon: AlertTriangle,
    className: "bg-verdict-weak/20 text-verdict-weak border-verdict-weak/30 hover:bg-verdict-weak/30",
  },
  contradicted: {
    label: "Contradicted",
    icon: X,
    className: "bg-verdict-contradicted/20 text-verdict-contradicted border-verdict-contradicted/30 hover:bg-verdict-contradicted/30",
  },
  not_found: {
    label: "Not Found",
    icon: HelpCircle,
    className: "bg-verdict-missing/20 text-verdict-missing border-verdict-missing/30 hover:bg-verdict-missing/30",
  },
}

export function VerdictBadge({ verdict, size = "md", showIcon = true }: VerdictBadgeProps) {
  const config = verdictConfig[verdict]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        "gap-1 font-medium transition-colors",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
      )}
    >
      {showIcon && (
        <Icon className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      )}
      <span>{config.label}</span>
    </Badge>
  )
}
```

#### 3. Update LedgerTable with Better UX

**File**: `src/components/evidence/LedgerTable.tsx`
**Changes**: Add sorting, filtering, better row styling

```typescript
import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { VerdictBadge } from "./VerdictBadge"
import { ImportanceDot } from "@/components/ui/ImportanceDot"
import { Search, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LedgerEntry, Verdict } from "@/types"

interface LedgerTableProps {
  entries: LedgerEntry[]
  className?: string
}

type SortField = "claim" | "verdict" | "confidence" | "importance"
type SortOrder = "asc" | "desc"

export function LedgerTable({ entries, className }: LedgerTableProps) {
  const [search, setSearch] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>("importance")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc")

  const filteredAndSorted = React.useMemo(() => {
    let result = entries

    // Filter
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(e =>
        e.claim.toLowerCase().includes(lower) ||
        e.sourceDocument?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "claim":
          comparison = a.claim.localeCompare(b.claim)
          break
        case "verdict":
          const verdictOrder: Record<Verdict, number> = {
            supported: 0, weak: 1, not_found: 2, contradicted: 3
          }
          comparison = verdictOrder[a.verdict] - verdictOrder[b.verdict]
          break
        case "confidence":
          comparison = a.confidence - b.confidence
          break
        case "importance":
          const importanceOrder = { high: 2, medium: 1, low: 0 }
          comparison = importanceOrder[a.importance] - importanceOrder[b.importance]
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [entries, search, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn(
          "h-3 w-3",
          sortField === field ? "text-foreground" : "text-muted-foreground/50"
        )} />
      </div>
    </TableHead>
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter claims..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8"></TableHead>
              <SortableHeader field="claim">Claim</SortableHeader>
              <SortableHeader field="verdict">Verdict</SortableHeader>
              <TableHead>Source</TableHead>
              <SortableHeader field="confidence">Confidence</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((entry) => (
              <TableRow
                key={entry.id}
                className="group cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="w-8">
                  <ImportanceDot importance={entry.importance} />
                </TableCell>
                <TableCell className="max-w-md">
                  <span className="line-clamp-2">{entry.claim}</span>
                </TableCell>
                <TableCell>
                  <VerdictBadge verdict={entry.verdict} size="sm" />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {entry.sourceDocument || "—"}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "font-medium",
                    entry.confidence >= 0.8 ? "text-verdict-supported" :
                    entry.confidence >= 0.5 ? "text-verdict-weak" :
                    "text-verdict-contradicted"
                  )}>
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredAndSorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No claims found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground text-right">
        Showing {filteredAndSorted.length} of {entries.length} claims
      </div>
    </div>
  )
}
```

#### 4. Add ShadCN Table Component

**Action**: Add table component

```bash
bunx shadcn-ui@latest add table
```

### Success Criteria:

#### Automated Verification:
- [ ] All updated components exist
- [ ] TypeScript compiles without errors
- [ ] HoverCard imports resolve
- [ ] Table component exists

#### Manual Verification:
- [ ] Citation hover shows preview card
- [ ] Preview card displays source text
- [ ] VerdictBadge shows correct colors
- [ ] LedgerTable is sortable
- [ ] LedgerTable is searchable
- [ ] Confidence percentages display correctly

---

## Phase 6: Polish and Animations

### Overview
Add micro-interactions, streaming animations, and final refinements.

### Changes Required:

#### 1. Add Streaming Text Animation

**File**: `src/components/chat/StreamingText.tsx` (NEW)
**Changes**: Word-by-word reveal animation

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

interface StreamingTextProps {
  content: string
  isStreaming: boolean
  className?: string
}

export function StreamingText({ content, isStreaming, className }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = React.useState("")
  const [currentIndex, setCurrentIndex] = React.useState(0)

  React.useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content)
      return
    }

    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1))
        setCurrentIndex(prev => prev + 1)
      }, 15) // 15ms per character for smooth typing

      return () => clearTimeout(timeout)
    }
  }, [content, currentIndex, isStreaming])

  React.useEffect(() => {
    if (isStreaming) {
      setCurrentIndex(0)
      setDisplayedContent("")
    }
  }, [isStreaming])

  return (
    <span className={className}>
      {displayedContent}
      {isStreaming && currentIndex < content.length && (
        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
      )}
    </span>
  )
}
```

#### 2. Update StreamingIndicator

**File**: `src/components/chat/StreamingIndicator.tsx`
**Changes**: Pulsing dots animation (ChatGPT style)

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

interface StreamingIndicatorProps {
  className?: string
  message?: string
}

export function StreamingIndicator({ className, message = "Thinking" }: StreamingIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
        />
      </div>
      <span>{message}</span>
    </div>
  )
}
```

#### 3. Add Page Transition Animations

**File**: `src/components/layout/PageTransition.tsx` (NEW)
**Changes**: Fade-in animation wrapper

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div
      className={cn(
        "animate-fade-in",
        className
      )}
    >
      {children}
    </div>
  )
}
```

#### 4. Add Card Hover Effects

**File**: `src/styles/main.css`
**Changes**: Add card hover animations

```css
/* Add to existing CSS */

/* Card hover effect */
.card-hover {
  @apply transition-all duration-200;
}
.card-hover:hover {
  @apply -translate-y-0.5 shadow-md;
}

/* Smooth button press */
.btn-press {
  @apply transition-transform active:scale-[0.98];
}

/* Focus ring for accessibility */
.focus-ring {
  @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

#### 5. Final Keyboard Shortcuts Integration

**File**: `src/components/command/KeyboardShortcutsDialog.tsx` (NEW)
**Changes**: Help dialog showing all shortcuts

```typescript
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { keys: "⌘ + K", description: "Open command palette" },
  { keys: "⌘ + L", description: "Toggle evidence ledger" },
  { keys: "⌘ + U", description: "Upload documents" },
  { keys: "⌘ + N", description: "New query" },
  { keys: "⌘ + /", description: "Show keyboard shortcuts" },
  { keys: "Escape", description: "Close dialogs" },
  { keys: "↑ / ↓", description: "Navigate options" },
  { keys: "Enter", description: "Select option" },
]

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map(({ keys, description }) => (
            <div key={keys} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{description}</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border font-mono text-xs">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] All animation components exist
- [ ] CSS animations defined in tailwind.config.js
- [ ] TypeScript compiles without errors

#### Manual Verification:
- [ ] Streaming text shows character-by-character with cursor
- [ ] Loading indicator uses pulsing dots (not spinner)
- [ ] Cards have subtle hover lift effect
- [ ] Buttons have press feedback
- [ ] ⌘/ opens keyboard shortcuts dialog
- [ ] Command palette has slide-in animation
- [ ] Dialog has fade + scale animation

---

## Testing Strategy

### Unit Tests

**Components to test:**
- `CommandPalette` - Keyboard navigation, search filtering
- `BentoStats` - Correct stat calculations
- `VerdictBadge` - Correct colors per verdict
- `LedgerTable` - Sorting, filtering logic
- `CitationAnchor` - HoverCard rendering

### Integration Tests

**Scenarios:**
- User can navigate via ⌘K without sidebar
- Evidence canvas displays after query submission
- Ledger expands/collapses with ⌘L
- Citation hover shows preview
- Theme toggle works globally

### Manual Testing Steps

1. **Navigation Flow:**
   - [ ] Open app, verify no sidebar
   - [ ] Press ⌘K, verify command palette opens
   - [ ] Type "documents", verify navigation works
   - [ ] Press Escape, verify palette closes

2. **Query Flow:**
   - [ ] Navigate to chat page
   - [ ] Submit a query
   - [ ] Verify streaming indicator appears
   - [ ] Verify response renders in canvas
   - [ ] Verify bento stats appear
   - [ ] Click ledger accordion, verify it expands

3. **Evidence Flow:**
   - [ ] Hover over citation, verify preview appears
   - [ ] Check verdict badges have correct colors
   - [ ] Sort ledger table by confidence
   - [ ] Filter ledger by search term

4. **Theme & Accessibility:**
   - [ ] Toggle theme via header button
   - [ ] Toggle theme via ⌘K command
   - [ ] Verify all text readable in both themes
   - [ ] Tab through interactive elements

---

## Performance Considerations

1. **Bundle Size:**
   - ShadCN components are tree-shakeable
   - Import only used components
   - Monitor bundle with `bun build --analyze`

2. **Rendering:**
   - Memoize expensive ledger calculations
   - Virtualize long ledger lists (future)
   - Debounce search filtering

3. **Animations:**
   - Use CSS animations over JS where possible
   - Respect `prefers-reduced-motion`
   - Keep animation durations under 300ms

---

## Migration Notes

### Component Mapping

| Old Component | New Component | Action |
|--------------|---------------|--------|
| `Button.tsx` | `button.tsx` | Replace imports |
| `Modal.tsx` | `dialog.tsx` | Replace imports |
| `Sidebar.tsx` | Deleted | Remove all usage |
| `AppLayout.tsx` | Rewritten | Replace entire file |
| `EvidenceLedgerPanel.tsx` | `EvidenceCanvas.tsx` | New architecture |

### Import Path Changes

```typescript
// Before
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"

// After
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
```

### Breaking Changes

1. **Sidebar removal** - All navigation moves to command palette
2. **Modal → Dialog** - Different API, needs content children
3. **Button loading** - Now uses `loading` prop, not custom Spinner
4. **Theme** - Dark mode now default, light mode via `light` class

---

## References

- Research Document: `thoughts/shared/research/2026-01-04-veritydraft-frontend-modernization-research.md`
- ShadCN UI Documentation: https://ui.shadcn.com/
- cmdk Documentation: https://cmdk.paco.me/
- Tailwind CSS: https://tailwindcss.com/
- Linear App (Design Inspiration): https://linear.app/
- Claude Artifacts (Canvas Inspiration): https://claude.ai/
