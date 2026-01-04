# Style Guide

> **Version:** 1.0
> **Last Updated:** 2026-01-03

---

## 1. Color System

### 1.1 Primary Palette

| Name | Hex | Usage |
|------|-----|-------|
| Primary-50 | `#EFF6FF` | Backgrounds, hover states |
| Primary-100 | `#DBEAFE` | Light backgrounds |
| Primary-200 | `#BFDBFE` | Borders, dividers |
| Primary-500 | `#3B82F6` | Interactive elements |
| Primary-600 | `#2563EB` | Primary buttons |
| Primary-700 | `#1D4ED8` | Hover states |
| Primary-900 | `#1E3A8A` | Dark text on light |

### 1.2 Verdict Colors

| Verdict | Background | Text | Border | Hex |
|---------|------------|------|--------|-----|
| Supported | `green-100` | `green-800` | `green-200` | `#DCFCE7` / `#166534` |
| Weak | `amber-100` | `amber-800` | `amber-200` | `#FEF3C7` / `#92400E` |
| Contradicted | `red-100` | `red-800` | `red-200` | `#FEE2E2` / `#991B1B` |
| Not Found | `gray-100` | `gray-800` | `gray-200` | `#F3F4F6` / `#1F2937` |

### 1.3 UI Colors

| Name | Hex | Usage |
|------|-----|-------|
| Background | `#FFFFFF` | Page background |
| Surface | `#F9FAFB` | Card backgrounds |
| Border | `#E5E7EB` | Dividers, outlines |
| Text-Primary | `#111827` | Headings, body text |
| Text-Secondary | `#6B7280` | Captions, help text |
| Text-Muted | `#9CA3AF` | Timestamps, meta |

### 1.4 Dark Mode (Optional)

| Name | Light | Dark |
|------|-------|------|
| Background | `#FFFFFF` | `#111827` |
| Surface | `#F9FAFB` | `#1F2937` |
| Border | `#E5E7EB` | `#374151` |
| Text-Primary | `#111827` | `#F9FAFB` |
| Text-Secondary | `#6B7280` | `#9CA3AF` |

---

## 2. Typography

### 2.1 Font Family

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 2.2 Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| Display | 36px | 40px | 700 | Page titles |
| Heading 1 | 30px | 36px | 600 | Section headers |
| Heading 2 | 24px | 32px | 600 | Subsections |
| Heading 3 | 20px | 28px | 600 | Card headers |
| Body Large | 18px | 28px | 400 | Featured content |
| Body | 16px | 24px | 400 | Default text |
| Body Small | 14px | 20px | 400 | Secondary content |
| Caption | 12px | 16px | 400 | Labels, meta |
| Overline | 12px | 16px | 500 | Category labels |

### 2.3 Tailwind Classes

```css
/* Display */
.text-display { @apply text-4xl font-bold leading-tight; }

/* Headings */
.text-h1 { @apply text-3xl font-semibold leading-9; }
.text-h2 { @apply text-2xl font-semibold leading-8; }
.text-h3 { @apply text-xl font-semibold leading-7; }

/* Body */
.text-body-lg { @apply text-lg leading-7; }
.text-body { @apply text-base leading-6; }
.text-body-sm { @apply text-sm leading-5; }

/* Meta */
.text-caption { @apply text-xs leading-4; }
.text-overline { @apply text-xs font-medium uppercase tracking-wide; }
```

---

## 3. Spacing System

### 3.1 Base Unit

The spacing system uses a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| space-0 | 0px | — |
| space-1 | 4px | Tight spacing |
| space-2 | 8px | Related elements |
| space-3 | 12px | — |
| space-4 | 16px | Default padding |
| space-5 | 20px | — |
| space-6 | 24px | Section padding |
| space-8 | 32px | Large gaps |
| space-10 | 40px | Section separators |
| space-12 | 48px | Page margins |
| space-16 | 64px | Major sections |

### 3.2 Component Spacing

| Component | Internal Padding | External Margin |
|-----------|------------------|-----------------|
| Button | 8px 16px | 8px |
| Card | 16px | 16px |
| Modal | 24px | — |
| Input | 12px 16px | 8px |
| Table cell | 12px 16px | — |

---

## 4. Layout

### 4.1 Grid System

```css
/* Container widths */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;

/* Content max-width */
--content-max: 65ch; /* Optimal reading width */
```

### 4.2 Page Layouts

**Chat Layout (Three Column)**
```
┌──────────────────────────────────────────────────────────┐
│ Header                                                    │
├────────────┬─────────────────────────┬──────────────────┤
│ Sidebar    │ Main Content            │ Evidence Panel   │
│ 256px      │ flex-1                  │ 384px            │
│            │                         │                  │
│            │                         │                  │
└────────────┴─────────────────────────┴──────────────────┘
```

**Document Layout (Two Column)**
```
┌──────────────────────────────────────────────────────────┐
│ Header                                                    │
├────────────┬─────────────────────────────────────────────┤
│ Sidebar    │ Document Viewer                             │
│ 256px      │ flex-1                                      │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### 4.3 Z-Index Scale

| Layer | Z-Index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Raised | 10 | Cards, dropdowns |
| Sticky | 20 | Sticky headers |
| Fixed | 30 | Fixed elements |
| Modal Backdrop | 40 | Modal overlay |
| Modal | 50 | Modal content |
| Popover | 60 | Tooltips, popovers |
| Toast | 70 | Notifications |

---

## 5. Components

### 5.1 Buttons

**Primary Button**
```css
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white font-medium rounded-lg
         hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         disabled:bg-blue-300 disabled:cursor-not-allowed
         transition-colors;
}
```

**Secondary Button**
```css
.btn-secondary {
  @apply px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg
         border border-gray-300
         hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
         disabled:bg-gray-50 disabled:text-gray-400
         transition-colors;
}
```

**Ghost Button**
```css
.btn-ghost {
  @apply px-4 py-2 bg-transparent text-gray-700 font-medium rounded-lg
         hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
         transition-colors;
}
```

### 5.2 Inputs

```css
.input {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
         disabled:bg-gray-50 disabled:text-gray-500
         placeholder:text-gray-400;
}

.input-error {
  @apply border-red-500 focus:ring-red-500;
}
```

### 5.3 Cards

```css
.card {
  @apply bg-white rounded-xl border border-gray-200 shadow-sm;
}

.card-header {
  @apply px-6 py-4 border-b border-gray-200;
}

.card-body {
  @apply px-6 py-4;
}

.card-footer {
  @apply px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl;
}
```

### 5.4 Badges

```css
.badge {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full
         text-xs font-medium border;
}

.badge-supported {
  @apply bg-green-100 text-green-800 border-green-200;
}

.badge-weak {
  @apply bg-amber-100 text-amber-800 border-amber-200;
}

.badge-contradicted {
  @apply bg-red-100 text-red-800 border-red-200;
}

.badge-not-found {
  @apply bg-gray-100 text-gray-800 border-gray-200;
}
```

---

## 6. Iconography

### 6.1 Icon Library

Use **Lucide React** for all icons.

```tsx
import { CheckCircle, AlertCircle, XCircle, HelpCircle } from 'lucide-react';
```

### 6.2 Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| xs | 12px | Inline with small text |
| sm | 16px | Buttons, badges |
| md | 20px | Default |
| lg | 24px | Section headers |
| xl | 32px | Empty states |
| 2xl | 48px | Hero illustrations |

### 6.3 Verdict Icons

| Verdict | Icon | Color |
|---------|------|-------|
| Supported | `CheckCircle` | green-600 |
| Weak | `AlertCircle` | amber-600 |
| Contradicted | `XCircle` | red-600 |
| Not Found | `HelpCircle` | gray-500 |

---

## 7. Motion

### 7.1 Timing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| instant | 0ms | — | Immediate feedback |
| fast | 100ms | ease-out | Hover states |
| normal | 200ms | ease-in-out | Transitions |
| slow | 300ms | ease-in-out | Modals, panels |

### 7.2 Easing Functions

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 7.3 Common Animations

**Fade In**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 200ms ease-out;
}
```

**Slide Up**
```css
@keyframes slide-up {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-slide-up {
  animation: slide-up 200ms ease-out;
}
```

**Spin**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

---

## 8. Shadows

| Level | Shadow | Usage |
|-------|--------|-------|
| sm | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| default | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards |
| md | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns |
| lg | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals |
| xl | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Popovers |

---

## 9. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | — |
| sm | 4px | Small elements |
| default | 6px | Inputs, buttons |
| md | 8px | — |
| lg | 12px | Cards |
| xl | 16px | Modals |
| 2xl | 24px | Large cards |
| full | 9999px | Pills, avatars |

---

## 10. Focus States

All interactive elements must have visible focus indicators:

```css
.focus-ring {
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

/* For dark backgrounds */
.focus-ring-light {
  @apply focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2
         focus:ring-offset-gray-900;
}
```

---

## 11. Breakpoints

| Name | Min Width | Tailwind |
|------|-----------|----------|
| Mobile | 0px | (default) |
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |
| 2xl | 1536px | `2xl:` |

---

## 12. CSS Variables

```css
:root {
  /* Colors */
  --color-primary: #2563EB;
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-error: #DC2626;

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-unit: 4px;

  /* Transitions */
  --transition-fast: 100ms ease-out;
  --transition-normal: 200ms ease-in-out;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```
