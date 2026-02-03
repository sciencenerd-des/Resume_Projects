# VerityDraft Frontend Modernization Research Report

**Date:** 2026-01-04
**Project:** VerityDraft (Evidence-Ledger Copilot)
**Objective:** Research and recommend a UI framework for modernizing the frontend to achieve a professional ChatGPT/OpenAI-style interface

---

## Executive Summary

After comprehensive codebase analysis, **ShadCN UI is the clear recommendation** over Streamlit UI. Streamlit is a Python-based framework incompatible with the existing React/TypeScript/Bun stack, while ShadCN UI is purpose-built for React applications using Tailwind CSS—exactly matching VerityDraft's current technology stack.

---

## 1. Current Frontend Architecture Analysis

### Technology Stack
| Component | Current Implementation |
|-----------|----------------------|
| Runtime | Bun (full-stack) |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3.4.1 |
| Icons | Lucide React 0.312 |
| State Management | React Context + TanStack Query |
| Routing | React Router v6 |
| Real-time | Custom WebSocket hooks |

### Component Inventory

**Base UI Components (11 components, ~585 lines):**
- `Button.tsx` - Variants: primary, secondary, ghost, danger; Sizes: sm, md, lg
- `Input.tsx` - With label, error, helper text, icon support
- `Modal.tsx` - Dialog with size variants (sm/md/lg/xl)
- `Spinner.tsx` - Loading indicator (3 sizes)
- `Progress.tsx` - Progress bar
- `ConfirmModal.tsx` - Confirmation dialog
- `EmptyState.tsx` - Placeholder states
- `ErrorWithRetry.tsx` - Error UI with retry
- `InlineError.tsx` - Inline error display
- `HighlightedText.tsx` - Text highlighting
- `ImportanceDot.tsx` / `ClaimTypeBadge.tsx` - Status indicators

**Domain-Specific Components:**
- Chat Interface: `ChatInterface`, `MessageList`, `MessageBubble`, `QueryInput`, `ResponseContent`
- Evidence Ledger: `EvidenceLedgerPanel` (339 lines), `LedgerTable`, `VerdictBadge`, `CitationPopover`
- Documents: `DocumentLibrary`, `DocumentUpload`, `DocumentCard`, `ChunkViewer`
- Layout: `AppLayout`, `Header`, `Sidebar`, `WorkspaceSwitcher`

### Design System Status
- **Theme System:** CSS variables (HSL-based) with light/dark mode
- **Color Palette:** Primary blue (221.2° hue), gray secondary, red destructive
- **Border Radius:** 0.5rem base with md/sm variants
- **Dark Mode:** Class-based toggle via ThemeContext
- **Gaps:** No formal design tokens, no component documentation, no Storybook

---

## 2. Framework Comparison: ShadCN UI vs Streamlit

### ShadCN UI

**What It Is:**
ShadCN UI is a collection of reusable React components built on [Radix UI](https://radix-ui.com/) primitives, styled with Tailwind CSS. Unlike traditional component libraries, you copy/paste components into your codebase—giving full ownership and customization control.

**Key Characteristics:**
- **Not a package:** Components are copied into your project (no npm install)
- **Built on Radix:** Accessible, unstyled primitives with keyboard navigation
- **Tailwind Native:** Uses CSS variables + Tailwind utilities (exactly like VerityDraft)
- **TypeScript First:** Full type safety
- **Customizable:** You own the code, modify freely
- **CLI Tool:** `npx shadcn-ui@latest add button` to add components

**Component Library (50+ components):**
- Form: Button, Input, Textarea, Checkbox, Radio, Select, Switch, Slider, DatePicker
- Layout: Card, Separator, Tabs, Accordion, Collapsible, Sheet (side panel)
- Navigation: NavigationMenu, Menubar, DropdownMenu, ContextMenu, Command (⌘K)
- Feedback: Alert, AlertDialog, Toast, Progress, Skeleton, Badge
- Data Display: Table, DataTable (with TanStack Table), Avatar, HoverCard, Tooltip
- Overlay: Dialog, Popover, Sheet, Drawer

**Why It Fits VerityDraft:**
| Requirement | ShadCN Compatibility |
|------------|---------------------|
| React 18 | ✅ Native support |
| TypeScript | ✅ Full type definitions |
| Tailwind CSS | ✅ Built with Tailwind |
| Dark Mode | ✅ CSS variable system matches exactly |
| Lucide Icons | ✅ Uses Lucide by default |
| Custom Components | ✅ Copy/paste means full control |

### Streamlit

**What It Is:**
Streamlit is a Python framework for building data applications and dashboards. It runs a Python web server and renders a React frontend from Python code.

**Key Characteristics:**
- **Python Only:** All UI logic written in Python (`.py` files)
- **Server-Side Rendering:** Python server generates UI on each interaction
- **Data-Focused:** Designed for ML/data science dashboards
- **No JavaScript Customization:** Limited ability to write custom JS/React
- **Stateless by Default:** Reruns entire script on interaction

**Why It DOES NOT Fit VerityDraft:**
| Requirement | Streamlit Compatibility |
|------------|------------------------|
| React 18 | ❌ Would require complete rewrite |
| TypeScript | ❌ Python-only |
| Tailwind CSS | ❌ Uses its own CSS system |
| Bun Runtime | ❌ Requires Python + Node.js |
| WebSocket Streaming | ⚠️ Limited, uses SSE |
| Custom Evidence UI | ❌ Very limited custom components |
| Existing Components | ❌ Cannot reuse any React code |

### Verdict

| Criteria | ShadCN UI | Streamlit |
|----------|-----------|-----------|
| Stack Compatibility | ✅ Perfect | ❌ Incompatible |
| Migration Effort | 🟢 Incremental | 🔴 Complete rewrite |
| Customization | ✅ Full control | ❌ Limited |
| Performance | ✅ Client-side React | ⚠️ Server roundtrips |
| Real-time/WebSocket | ✅ Native | ⚠️ Limited |
| Design Flexibility | ✅ Tailwind | ❌ Constrained |
| Type Safety | ✅ TypeScript | ❌ Python |
| Professional Feel | ✅ ChatGPT-like achievable | ⚠️ Dashboard aesthetic |

**Recommendation: ShadCN UI** is the only viable option.

---

## 3. Innovative Layout Patterns (Beyond Sidebars)

> **User Requirement:** Avoid traditional sidebar layouts—they're "basic and lazy."

Research into 2025 AI interface trends reveals several innovative alternatives that move beyond the chat-with-sidebar paradigm.

---

### 3.1 Canvas/Artifact Interface (Split-Screen Collaboration)

**Pioneered by:** Claude Artifacts (June 2024), ChatGPT Canvas (October 2024), Gemini Canvas

**How It Works:**
- Screen splits into **Chat Pane** (left, ~35%) and **Editor/Preview Pane** (right, ~65%)
- Chat is for conversation; Canvas is for creating, editing, iterating
- Content in canvas is directly editable—not just displayed
- AI can make inline suggestions, highlight changes, offer revision options

**Why It's Better Than Sidebars:**
- Chat becomes secondary; the **artifact (document/code/ledger)** is primary
- Users focus on output, not conversation history
- Feels like collaborative editing (Google Docs + AI), not chatbot

**VerityDraft Application:**
```
┌──────────────────────────────────────────────────────────────────┐
│  ⌘K Search          VerityDraft          [Mode ▼]  [User ▼]      │
├─────────────────────┬────────────────────────────────────────────┤
│                     │                                            │
│   💬 Chat Panel     │   📄 Evidence Canvas                       │
│   (Collapsible)     │   (Primary Focus)                          │
│                     │                                            │
│   Query input       │   ┌────────────────────────────────────┐   │
│   at bottom         │   │  Generated Response                │   │
│                     │   │  with inline [1] citations         │   │
│   Conversation      │   │                                    │   │
│   history above     │   │  Click citation → highlight source │   │
│                     │   └────────────────────────────────────┘   │
│                     │                                            │
│                     │   ┌────────────────────────────────────┐   │
│                     │   │  📊 Evidence Ledger (Below)        │   │
│                     │   │  Claim | Verdict | Source | Conf   │   │
│                     │   └────────────────────────────────────┘   │
│                     │                                            │
├─────────────────────┴────────────────────────────────────────────┤
│  [📎 Add docs]  [🔄 Regenerate]  [📋 Copy]  [⬇️ Export]          │
└──────────────────────────────────────────────────────────────────┘
```

**Key Insight:** "Where Canvas feels like collaborative editing, Artifacts feels like instant app creation." — [Altar.io](https://altar.io/next-gen-of-human-ai-collaboration/)

---

### 3.2 Bento Grid Layout (Modular Dashboard)

**Popularized by:** Apple product pages, Notion, Linear, modern SaaS dashboards

**How It Works:**
- Content arranged in **modular tiles of varying sizes**
- Large "hero" tiles for primary content (response, ledger summary)
- Medium tiles for secondary info (claims, sources)
- Small tiles for actions and status indicators
- Each tile is self-contained, scannable, and can be interactive

**Why It's Better Than Sidebars:**
- **Hierarchy through size**, not position
- Users scan like a dashboard, not scroll like a feed
- Information density increases without feeling cluttered
- Responsive: tiles reflow naturally on different screens

**VerityDraft Application:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ⌘K                    VerityDraft                    [User ▼]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────┐  ┌───────────────────────┐ │
│  │                                     │  │  📊 Coverage: 94%     │ │
│  │  📝 AI Response (Hero Tile)         │  │  ✅ 12 Supported      │ │
│  │                                     │  │  ⚠️  2 Weak           │ │
│  │  The analysis shows that [1]...     │  │  ❌ 1 Contradicted    │ │
│  │  Furthermore, the data [2]...       │  │                       │ │
│  │                                     │  ├───────────────────────┤ │
│  │                                     │  │  🚨 Risk Flags        │ │
│  │                                     │  │  • Missing Q4 data    │ │
│  └─────────────────────────────────────┘  └───────────────────────┘ │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  📄 Source 1    │  │  📄 Source 2    │  │  📄 Source 3        │ │
│  │  Annual Report  │  │  Q3 Earnings    │  │  Market Analysis    │ │
│  │  12 chunks      │  │  8 chunks       │  │  5 chunks           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  💬 Ask a follow-up question...                         [Send] │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Insight:** "Bento grids can increase user engagement by up to 30% by guiding eyes naturally through prioritized content." — [Orbix Studio](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)

---

### 3.3 Command Palette-First (Linear/Raycast Style)

**Pioneered by:** Sublime Text (2011), VS Code, Linear, Raycast, Notion

**How It Works:**
- **⌘K is the primary navigation**, not menus or sidebars
- Type to search commands, documents, actions, or ask AI
- Context-aware suggestions based on current view
- Keyboard-first: power users never touch mouse
- Minimal chrome; content takes full screen

**Why It's Better Than Sidebars:**
- **Zero visual clutter** until needed
- Faster for power users (no mouse navigation)
- Discoverability through search, not menu hunting
- AI integration natural: "⌘K → ask anything"

**VerityDraft Application:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     📝 Evidence Response                         │
│                     (Full-screen, centered)                      │
│                                                                 │
│     The quarterly report indicates [1] that revenue grew...     │
│                                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  [1] Annual Report 2024, p.23                       │     │
│     │  "Revenue increased 23% YoY driven by..."           │     │
│     │  Confidence: 94% ✅                                 │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ⌘K  Search documents, ask questions, or run actions... │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│        Press ⌘K to: New query • View ledger • Upload docs       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Command Palette Actions:**
```
┌────────────────────────────────────────────────────────┐
│  ⌘K  "show evidence ledger"                            │
├────────────────────────────────────────────────────────┤
│  📊  Show Evidence Ledger          ⌘L                  │
│  📄  Upload Documents              ⌘U                  │
│  💬  New Query                     ⌘N                  │
│  🔍  Search Documents              ⌘F                  │
│  📋  Copy Response                 ⌘C                  │
│  ⬇️   Export as PDF                ⌘E                  │
│  ──────────────────────────────────────                │
│  Recent: "What does the Q3 report say about..."        │
│  Recent: "Summarize the key findings"                  │
└────────────────────────────────────────────────────────┘
```

**Key Insight:** "Linear's interface is clean and purposefully minimal. It's keyboard-first: nearly every action can be done without touching the mouse." — [LogRocket](https://blog.logrocket.com/ux-design/linear-design/)

---

### 3.4 AI Assistant Cards (Response-as-Widget)

**Emerging pattern in:** Modern AI interfaces, task-oriented UIs

**How It Works:**
- AI responses appear as **interactive cards**, not chat bubbles
- Each card is self-contained with actions (copy, expand, cite, regenerate)
- Cards can contain rich content: tables, charts, code, embedded previews
- Responses feel like **generated artifacts**, not messages

**Why It's Better Than Sidebars:**
- Focus on **output quality**, not conversation
- Each response is actionable and standalone
- Supports rich formatting naturally
- Reduces cognitive load vs. scrolling chat history

**VerityDraft Application:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Query: "What are the key risks mentioned in the annual report?"│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📝 Response Card                              [⋯ Actions]  │ │
│  │  ───────────────────────────────────────────────────────── │ │
│  │                                                             │ │
│  │  The annual report identifies **3 key risk categories**:    │ │
│  │                                                             │ │
│  │  1. **Market Risk** [1] - Currency fluctuation exposure...  │ │
│  │  2. **Operational Risk** [2] - Supply chain dependencies... │ │
│  │  3. **Regulatory Risk** [3] - Pending compliance changes... │ │
│  │                                                             │ │
│  │  ┌───────────────────────────────────────────────────────┐ │ │
│  │  │  📊 Evidence Summary                                  │ │ │
│  │  │  ✅ 3/3 claims supported | 📄 2 sources | 🎯 96%      │ │ │
│  │  │  [View Full Ledger →]                                 │ │ │
│  │  └───────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │  [📋 Copy] [🔄 Regenerate] [📊 Ledger] [⬇️ Export]         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  💬 Ask a follow-up...                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insight:** "Chat doesn't go away, but it's being complemented with task-oriented UIs—controls, knobs, sliders, buttons." — [Smashing Magazine](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)

---

### 3.5 Inline Preview (v0/Vercel Style)

**Pioneered by:** v0 by Vercel, Replit, CodeSandbox

**How It Works:**
- Chat interface with **live preview embedded**
- As AI generates code/content, preview updates in real-time
- No separate window or tab—everything in one view
- Click-to-edit: select element in preview → modify via chat

**Why It's Better Than Sidebars:**
- **Immediate feedback loop**: see changes as they happen
- Context preserved: don't lose chat while viewing result
- Natural for iterative refinement

**VerityDraft Application:**
For evidence work, this translates to **inline source preview**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  The analysis indicates that revenue growth [1] exceeded...     │
│                                                                 │
│  ┌─[1] Source Preview ─────────────────────────────────────────┐│
│  │  📄 Annual Report 2024, Page 23                             ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  "Revenue increased by 23% year-over-year, driven           ││
│  │  primarily by expansion in the APAC region..."              ││
│  │                                                             ││
│  │  [View Full Document] [Jump to Chunk] [Copy Citation]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ...which aligns with market expectations [2].                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Recommended Hybrid: Canvas + Command Palette + Bento

For VerityDraft, the **optimal design combines three patterns**:

1. **Canvas Layout** - Evidence response and ledger as primary content (not chat)
2. **Command Palette (⌘K)** - All navigation via keyboard, no permanent sidebar
3. **Bento Elements** - Modular tiles for sources, stats, and risk flags

**Proposed Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  ⌘K Quick Actions          VerityDraft          [Dark/Light] [👤]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │                    📝 Evidence Canvas                           ││
│  │                    (Primary Content Area)                       ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │  Response with inline citations [1] [2] [3]              │  ││
│  │  │  Hover or click citation → inline source preview         │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ ││
│  │  │ 📊 Coverage │ │ ✅ Supported │ │ ⚠️ Weak     │ │ 🚨 Risks  │ ││
│  │  │    94%      │ │     12      │ │     2       │ │     1     │ ││
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ ││
│  │                                                                 ││
│  │  ┌──────────────────────────────────────────────────────────┐  ││
│  │  │  📋 Evidence Ledger (Expandable)                         │  ││
│  │  │  Claim | Verdict | Source | Confidence | Actions         │  ││
│  │  └──────────────────────────────────────────────────────────┘  ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  💬 Ask about your documents...              [📎] [🎤] [Send]  ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ⌘K Search  •  ⌘L Ledger  •  ⌘U Upload  •  ⌘N New  •  ⌘E Export   │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Differentiators from ChatGPT/Sidebar Designs:**
- No persistent sidebar (⌘K replaces it)
- Evidence canvas is hero, chat input is secondary
- Bento stats provide at-a-glance verification status
- Inline citation previews keep context
- Full keyboard navigation for power users

---

## 4. Design Inspiration Sources

| Product | What to Learn | Link |
|---------|--------------|------|
| **Linear** | Command palette UX, minimal chrome, keyboard-first | [linear.app](https://linear.app) |
| **v0 by Vercel** | Inline preview, chat + artifact split | [v0.dev](https://v0.dev) |
| **Claude Artifacts** | Canvas editing, iterative refinement | [claude.ai](https://claude.ai) |
| **ChatGPT Canvas** | Document collaboration feel | [chat.openai.com](https://chat.openai.com) |
| **Notion** | Command palette + bento blocks | [notion.so](https://notion.so) |
| **Raycast** | Spotlight-style command interface | [raycast.com](https://raycast.com) |
| **Perplexity** | Citation-first answers, source cards | [perplexity.ai](https://perplexity.ai) |
| **Bento Grids** | Curated bento layout inspiration | [bentogrids.com](https://bentogrids.com) |

---

## 5. Visual Design Language

### Color Palette (Dark Mode Default)

**Base Colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0a0a0b` | Page background |
| `--surface` | `#111113` | Cards, panels |
| `--surface-elevated` | `#18181b` | Hover states, elevated cards |
| `--border` | `#27272a` | Subtle dividers |
| `--text-primary` | `#fafafa` | Headings, primary text |
| `--text-secondary` | `#a1a1aa` | Descriptions, labels |
| `--text-muted` | `#71717a` | Disabled, hints |

**Accent Colors (Evidence-Specific):**
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-teal` | `#10a37f` | Primary actions, links |
| `--verdict-supported` | `#22c55e` | Supported claims |
| `--verdict-weak` | `#f59e0b` | Weak evidence |
| `--verdict-contradicted` | `#ef4444` | Contradictions |
| `--verdict-missing` | `#6b7280` | Not found |

### Typography

**Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Page title) | 24px | 600 | 1.3 |
| H2 (Section) | 18px | 600 | 1.4 |
| Body | 15px | 400 | 1.6 |
| Small/Label | 13px | 500 | 1.4 |
| Code | 14px | 400 | 1.5 |

### Component Styling

**Cards:**
- Background: `var(--surface)`
- Border: 1px `var(--border)`
- Border-radius: 12px
- No shadows (flat design)
- Hover: background shifts to `var(--surface-elevated)`

**Buttons:**
- Primary: Teal background, white text, 8px radius
- Secondary: Transparent, border, 8px radius
- Ghost: No border, text only
- All: 200ms transition, subtle scale on active

**Inputs:**
- Background: `var(--surface)`
- Border: 1px `var(--border)`
- Focus: 2px ring in accent color
- Placeholder: `var(--text-muted)`

**Command Palette (⌘K):**
- Centered modal, 640px max-width
- Backdrop blur (8px)
- Search input prominent at top
- Results grouped by category
- Keyboard navigation highlighted

### Micro-interactions

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Button hover | Background shift | 150ms |
| Card hover | Subtle lift (translateY -1px) | 200ms |
| Modal open | Fade + scale from 95% | 200ms |
| Command palette | Slide down + fade | 150ms |
| Citation preview | Fade in | 100ms |
| Streaming text | Word-by-word reveal | 30ms/word |
| Loading | Pulsing dots (not spinner) | 1.4s loop |

---

## 6. ShadCN UI Implementation Strategy

### Phase 1: Foundation Setup

**1.1 Install ShadCN UI**
```bash
bunx shadcn-ui@latest init
```

Configuration choices:
- Style: Default (or New York for sharper edges)
- Base color: Slate (matches OpenAI dark theme)
- CSS variables: Yes (already using)
- Tailwind config: Update existing
- Components path: `src/components/ui`
- Utils path: `src/lib/utils`

**1.2 Add Required Dependencies**
```bash
bun add @radix-ui/react-slot class-variance-authority clsx tailwind-merge
```

**1.3 Update Tailwind Config**
ShadCN provides a theme that matches the CSS variable system VerityDraft already uses. Minor adjustments needed for OpenAI-style colors.

### Phase 2: Core Component Migration

**Priority Order (by usage frequency):**

1. **Button** → Replace `components/ui/Button.tsx`
   - Add hover/active animations
   - Add icon-only variant
   - Add loading state with dots (not spinner)

2. **Input** → Replace `components/ui/Input.tsx`
   - Add floating label variant
   - Improve focus states

3. **Dialog/Modal** → Replace `components/ui/Modal.tsx`
   - Use Radix Dialog for accessibility
   - Add slide-in animation

4. **Card** → New component for message bubbles, document cards
   - Flat design, subtle borders
   - Hover interaction

5. **Skeleton** → Replace loading states
   - Shimmer animation
   - Content-aware shapes

6. **DropdownMenu** → For workspace switcher, user menu
   - Keyboard navigation
   - Smooth animations

7. **Tabs** → For mode switching (Answer/Draft)
   - Underline indicator variant
   - Smooth transition

8. **Sheet** → For mobile sidebar, evidence panel
   - Slide-in from right
   - Backdrop blur

9. **Tooltip/Popover** → For citation previews
   - Smart positioning
   - Hover delay

10. **ScrollArea** → For chat messages, evidence list
    - Custom scrollbar styling
    - Fade edges

### Phase 3: Layout Redesign (No Sidebar)

**Recommended Layout: Canvas + Bento + Command Palette**

See Section 3.6 for the detailed layout diagram. Key implementation:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [⌘K]              VerityDraft              [Theme] [User]          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                     📝 Evidence Canvas (Full Width)                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Response with inline citations [1] [2] [3]                  │  │
│  │  Click citation → inline preview expands below               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Coverage │ │ Supported│ │   Weak   │ │  Risks   │  ← Bento     │
│  │   94%    │ │    12    │ │    2     │ │    1     │    Stats     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Evidence Ledger (Expandable/Collapsible)                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  💬 Ask about your documents...            [📎] [🎤] [Send]  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ⌘K Search  •  ⌘L Ledger  •  ⌘U Upload  •  ⌘H History            │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Layout Principles:**
- **No permanent sidebar** - Navigation via ⌘K command palette
- **Evidence canvas is primary** - Response + Ledger take center stage
- **Bento stats row** - At-a-glance verification metrics
- **Input at bottom** - Familiar chat placement, but secondary to content
- **History via ⌘K** - Type "history" or press ⌘H to see past sessions

### Phase 4: Theme Customization

**OpenAI-Inspired Color Variables:**
```css
:root {
  --background: 0 0% 5%;           /* Near black */
  --foreground: 0 0% 93%;          /* Off-white */
  --card: 0 0% 8%;                 /* Slightly lighter */
  --card-foreground: 0 0% 93%;
  --primary: 160 84% 39%;          /* OpenAI teal #10a37f */
  --primary-foreground: 0 0% 100%;
  --secondary: 240 5% 15%;         /* Dark gray */
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
}
```

### Phase 5: Feature-Specific Enhancements

**5.1 Chat Interface**
- Streaming text animation (word-by-word)
- Typing indicator (animated dots)
- Message reactions (copy, regenerate)
- Timestamp on hover

**5.2 Evidence Ledger**
- Inline citation markers (superscript numbers)
- Citation hover cards (ShadCN HoverCard)
- Verdict badges with tooltips
- Claim expansion accordion

**5.3 Document Management**
- Drag-and-drop upload with progress
- Document preview modal
- Chunk visualization

**5.4 Navigation**
- Command palette (⌘K) for quick actions
- Breadcrumb navigation
- Keyboard shortcuts panel

---

## 7. Component Mapping

| Current Component | ShadCN Replacement | Notes |
|-------------------|-------------------|-------|
| `Button.tsx` | `button` | Add loading dots variant |
| `Input.tsx` | `input` + `label` | May need textarea for multi-line |
| `Modal.tsx` | `dialog` | Better animations, accessibility |
| `Spinner.tsx` | Custom dots loader | ChatGPT uses dots, not spinners |
| `Progress.tsx` | `progress` | Add shimmer animation |
| `ConfirmModal.tsx` | `alert-dialog` | Native confirmation pattern |
| `EmptyState.tsx` | Custom (keep) | Add illustrations |
| N/A | `card` | For messages, documents |
| N/A | `skeleton` | Loading states |
| N/A | `dropdown-menu` | User menu, actions |
| N/A | `tabs` | Mode toggle |
| N/A | `sheet` | Mobile sidebar, panels |
| N/A | `tooltip` | Icon hints |
| N/A | `popover` | Citation details |
| N/A | `command` | ⌘K palette |
| N/A | `scroll-area` | Custom scrollbars |
| N/A | `badge` | Status indicators |
| N/A | `avatar` | User profiles |

---

## 8. Migration Risk Assessment

### Low Risk
- Base UI components (Button, Input, Modal) - Drop-in replacements
- Loading states (Skeleton) - Enhancement only
- Tooltips, Popovers - New additions

### Medium Risk
- Layout restructure - Need careful responsive testing
- Theme migration - CSS variable values change
- Sidebar redesign - Navigation flow changes

### High Risk
- Evidence Ledger components - Custom domain logic
- WebSocket streaming UI - Complex state management
- Chat interface - Core feature, needs extensive testing

### Mitigation Strategies
1. **Incremental Migration:** Replace one component at a time
2. **Feature Flags:** Toggle between old/new implementations
3. **Storybook:** Add component isolation for testing
4. **E2E Tests:** Expand Playwright coverage before migration

---

## 9. Estimated Scope

### Components to Add/Replace
| Category | Count | Effort |
|----------|-------|--------|
| ShadCN base components | 15 | Medium |
| Custom theme variables | 1 | Low |
| Layout components | 3 | High |
| Chat interface redesign | 4 | High |
| Evidence panel update | 2 | Medium |
| Document UI update | 3 | Medium |
| Navigation improvements | 2 | Low |
| **Total** | **30** | - |

### Files Affected
- `tailwind.config.js` - Theme configuration
- `src/styles/main.css` - CSS variables
- `src/components/ui/*` - All 11 base components
- `src/components/chat/*` - 7 components
- `src/components/evidence/*` - 5 components
- `src/components/layout/*` - 3 components
- `src/components/documents/*` - 6 components
- `src/pages/*` - Layout updates across 7 pages

---

## 10. Recommendations

### Immediate Actions
1. **Initialize ShadCN UI** in the project with `bunx shadcn-ui@latest init`
2. **Install cmdk** for command palette: `bun add cmdk`
3. **Set up dark theme** as default with Linear-inspired color tokens
4. **Remove sidebar component** - prepare for command palette navigation

### Short-term Goals (Phase 1-2)
1. Replace all 11 base UI components with ShadCN equivalents
2. Implement **Command Palette (⌘K)** as primary navigation
3. Build **Evidence Canvas** layout with Bento stat tiles
4. Add inline citation previews (HoverCard component)
5. Implement streaming text animation (word-by-word reveal)

### Medium-term Goals (Phase 3-4)
1. Complete keyboard shortcut system (⌘K, ⌘L, ⌘U, ⌘N, ⌘E)
2. Add response cards with embedded actions
3. Implement expandable Evidence Ledger table
4. Build document upload with drag-drop and progress

### Long-term Goals
1. Add Storybook for component documentation
2. Implement visual regression tests (Playwright)
3. Build responsive mobile experience (command palette adapts)
4. Consider voice input integration (as per 2025 trends)

---

## 11. Conclusion

### Framework Choice: ShadCN UI

**ShadCN UI is the unequivocal choice** for this modernization project. It:
- Matches the existing tech stack perfectly (React + Tailwind + TypeScript)
- Provides professional, accessible components out of the box
- Includes **Command component** (cmdk) for building the ⌘K palette
- Enables incremental migration without breaking existing functionality

Streamlit is fundamentally incompatible—it would require abandoning all existing React code and rewriting the entire frontend in Python.

### Layout Strategy: Beyond Sidebars

Rather than copying the "basic and lazy" sidebar pattern from ChatGPT, the recommended approach combines **three innovative patterns**:

1. **Canvas Layout** - Evidence response and ledger as primary content (inspired by Claude Artifacts, ChatGPT Canvas)
2. **Command Palette (⌘K)** - All navigation via keyboard, no permanent sidebar (inspired by Linear, Raycast)
3. **Bento Grid** - Modular stat tiles for at-a-glance verification status (inspired by Apple, Notion)

This creates a **unique, evidence-first interface** that:
- Prioritizes verified output over conversation
- Enables power-user keyboard navigation
- Scales elegantly on different screen sizes
- Differentiates VerityDraft from generic chatbot UIs

### Migration Path

The recommended phased migration:
1. **Foundation** → ShadCN + cmdk + dark theme
2. **Components** → Replace base UI with ShadCN equivalents
3. **Layout** → Canvas + Bento + Command Palette (remove sidebar)
4. **Polish** → Animations, keyboard shortcuts, mobile responsive

This approach allows continuous delivery while progressively achieving a professional, innovative interface that stands out from the ChatGPT/sidebar crowd.

---

## Appendix A: Reference Links

### Component Libraries
- [ShadCN UI Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [cmdk (Command Menu Kit)](https://cmdk.paco.me/)
- [Tailwind CSS](https://tailwindcss.com/)

### Design Inspiration
- [Linear](https://linear.app) - Command palette UX, minimal chrome
- [v0 by Vercel](https://v0.dev) - Inline preview, chat + artifact split
- [Claude Artifacts](https://claude.ai) - Canvas editing pattern
- [ChatGPT Canvas](https://chat.openai.com) - Document collaboration
- [Perplexity](https://perplexity.ai) - Citation-first answers
- [Raycast](https://raycast.com) - Spotlight-style command interface

### Design Research
- [Bento Grids](https://bentogrids.com) - Curated bento layout inspiration
- [Dribbble - Bento Grids](https://dribbble.com/tags/bento-grids) - 100+ designs
- [Mobbin - Command Palette](https://mobbin.com/glossary/command-palette) - UI patterns
- [Smashing Magazine - AI Interface Design Patterns](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)
- [LogRocket - Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)

### Articles Referenced
- [Altar.io - Human-AI Collaboration: Canvas, Artifacts, Spaces](https://altar.io/next-gen-of-human-ai-collaboration/)
- [Orbix Studio - Bento Grid Dashboard Design](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [Command.ai - Command Palette Past, Present, Future](https://www.command.ai/blog/command-palette-past-present-and-future/)
- [Medium - Command Palette UX Patterns](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)

## Appendix B: Current Codebase Statistics

| Metric | Value |
|--------|-------|
| Total frontend components | ~30 |
| Base UI components | 11 |
| Component lines of code | ~3,286 |
| Page components | 7 |
| Page lines of code | ~1,399 |
| Custom hooks | 5 |
| Context providers | 4 |
| CSS lines | 71 |
