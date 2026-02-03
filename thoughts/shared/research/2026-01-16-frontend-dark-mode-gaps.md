---
date: 2026-01-16T22:27:15+0530
researcher: Biswajit Mondal
git_commit: 656868236287c6c510ed71acb05e0d0f82f1d60f
branch: feature/veritydraft-dark-theme-frontend
repository: Resume_Projects
topic: "Front-end dark mode gaps discussed"
tags: [research, codebase, frontend, dark-mode, chat, documents, auth, ui, layout, workspace]
status: complete
last_updated: 2026-01-16
last_updated_by: Biswajit Mondal
---

# Research: Front-end dark mode gaps discussed

**Date**: 2026-01-16T22:27:15+0530  
**Researcher**: Biswajit Mondal  
**Git Commit**: 656868236287c6c510ed71acb05e0d0f82f1d60f  
**Branch**: feature/veritydraft-dark-theme-frontend  
**Repository**: Resume_Projects

## Research Question
Research about the front-end gaps we have just discussed.

## Summary
The current frontend contains multiple UI areas that use fixed light-palette Tailwind classes (e.g., `bg-white`, `text-gray-900`, `bg-blue-50`, `text-red-600`) rather than theme tokens. These occur across chat UI, document upload and listing, auth screens, shared modal/error components, and layout/workspace controls. The findings below enumerate the locations and how each component is currently styled.

## Detailed Findings

### Chat UI (messages, mode toggle, streaming indicators)
- `MessageBubble` applies fixed light palette classes for bubble background, avatar badge, message text, and timestamps (`bg-white`, `border-gray-200`, `text-gray-900`, `text-gray-400`) alongside `bg-blue-600` for user messages.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/MessageBubble.tsx#L25-L71
- `MessageList` includes `prose-invert` and uses fixed amber/green classes for partial and verified states (`border-amber-500/30`, `text-amber-500`, `text-green-500`).  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/MessageList.tsx#L101-L123
- `ModeToggle` uses `border-gray-300`, `bg-blue-600`, and `text-gray-700`/`hover:bg-gray-100`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/ModeToggle.tsx#L17-L46
- `StreamingIndicator` uses `bg-gray-100`, `text-gray-600`, `text-gray-500`, and `bg-gray-400`, plus fixed status dot colors.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/StreamingIndicator.tsx#L15-L64
- `ResponseContent` maps verdicts to fixed background colors (`bg-green-500`, `bg-amber-500`, `bg-red-500`, `bg-gray-400`).  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/ResponseContent.tsx#L42-L46
- `ChatPage` includes a reconnect indicator with `text-amber-600` and `bg-amber-500`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/chat/ChatPage.tsx#L248-L251

### Documents UI (upload, list, chunk viewer)
- `DocumentUpload` uses fixed grays/blues/reds for the drop zone, file list, and status copy.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/DocumentUpload.tsx#L153-L206  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/DocumentUpload.tsx#L217-L224
- `UploadZone` mirrors the same fixed palette for drag state and labels.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/UploadZone.tsx#L58-L77
- `DocumentCard` status colors use fixed `text-*-600` values.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/DocumentCard.tsx#L17-L21
- `ChunkViewer` uses fixed highlight and text colors (`bg-yellow-50`, `hover:bg-gray-50`, `text-gray-800`).  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/ChunkViewer.tsx#L67-L82

### Auth flows (login/signup and pages)
- `LoginForm` uses fixed error banner and link/checkbox colors.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/auth/LoginForm.tsx#L35-L90
- `SignupForm` uses fixed error banner, password requirement colors, and link colors.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/auth/SignupForm.tsx#L63-L165
- `LoginPage` uses `bg-gray-50` and `text-gray-*` for the page shell.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/auth/LoginPage.tsx#L23-L35
- `SignupPage` uses `bg-gray-50`, `bg-white`, `border-gray-200`, and `bg-blue-600`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/auth/SignupPage.tsx#L24-L40

### Shared UI (modals, errors, empty states)
- `Modal` uses a fixed white panel and gray hover/icon colors.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/Modal.tsx#L43-L55
- `ConfirmModal` uses fixed palette variants for icon backgrounds and text, plus gray heading/body text.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/ConfirmModal.tsx#L26-L81
- `InlineError` uses `bg-red-50`, `border-red-200`, and `text-red-600`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/InlineError.tsx#L18-L30
- `ErrorWithRetry` uses `bg-red-50`, `text-red-500`, and gray text.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/ErrorWithRetry.tsx#L27-L33
- `EmptyState` uses `bg-gray-100` and gray text.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/EmptyState.tsx#L36-L47

### Layout, workspace, and navigation
- `Sidebar` hard-codes `bg-gray-900`, `bg-gray-800`, and gray text for nav and user menu.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/layout/Sidebar.tsx#L32-L71
- `Header` uses `bg-white`, `border-b`, `text-gray-900`, and `hover:bg-gray-100`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/layout/Header.tsx#L18-L23
- `WorkspaceSwitcher` uses fixed gray/blue palette for the dropdown and form fields.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/workspace/WorkspaceSwitcher.tsx#L36-L78  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/workspace/WorkspaceSwitcher.tsx#L131-L140
- `WorkspaceHomePage` uses fixed palette classes for stat icons and document status badges.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/workspace/WorkspaceHomePage.tsx#L81-L99  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/workspace/WorkspaceHomePage.tsx#L167-L183  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/workspace/WorkspaceHomePage.tsx#L256-L259
- `SessionViewPage` status badge mapping uses `text-*-600 bg-*-50`.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/pages/sessions/SessionViewPage.tsx#L180-L194

### Evidence UI
- `CitationPopover` uses fixed light palette for the popover surface and text.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/evidence/CitationPopover.tsx#L85-L125
- `ClaimTypeBadge` config maps types to fixed `bg-*` and `text-*` classes.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/ClaimTypeBadge.tsx#L16-L36

### App initialization states
- `SupabaseContext` renders fixed gray/red palette while initializing or on error.  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/contexts/SupabaseContext.tsx#L37-L55

## Code References
- `Project_4/src/components/chat/MessageBubble.tsx:25-71`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/MessageBubble.tsx#L25-L71
- `Project_4/src/components/chat/MessageList.tsx:101-123`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/MessageList.tsx#L101-L123
- `Project_4/src/components/chat/ModeToggle.tsx:17-46`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/ModeToggle.tsx#L17-L46
- `Project_4/src/components/chat/StreamingIndicator.tsx:15-64`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/StreamingIndicator.tsx#L15-L64
- `Project_4/src/components/chat/ResponseContent.tsx:42-46`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/chat/ResponseContent.tsx#L42-L46
- `Project_4/src/components/documents/DocumentUpload.tsx:153-206`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/DocumentUpload.tsx#L153-L206
- `Project_4/src/components/documents/UploadZone.tsx:58-77`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/documents/UploadZone.tsx#L58-L77
- `Project_4/src/components/auth/LoginForm.tsx:35-90`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/auth/LoginForm.tsx#L35-L90
- `Project_4/src/components/auth/SignupForm.tsx:63-165`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/auth/SignupForm.tsx#L63-L165
- `Project_4/src/components/ui/Modal.tsx:43-55`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/Modal.tsx#L43-L55
- `Project_4/src/components/ui/ConfirmModal.tsx:26-81`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/ConfirmModal.tsx#L26-L81
- `Project_4/src/components/ui/InlineError.tsx:18-30`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/ui/InlineError.tsx#L18-L30
- `Project_4/src/components/layout/Sidebar.tsx:32-71`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/layout/Sidebar.tsx#L32-L71
- `Project_4/src/components/layout/Header.tsx:18-23`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/layout/Header.tsx#L18-L23
- `Project_4/src/components/evidence/CitationPopover.tsx:85-125`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/components/evidence/CitationPopover.tsx#L85-L125
- `Project_4/src/contexts/SupabaseContext.tsx:37-55`  
  https://github.com/sciencenerd-des/Resume_Projects/blob/656868236287c6c510ed71acb05e0d0f82f1d60f/Project_4/src/contexts/SupabaseContext.tsx#L37-L55

## Architecture Documentation
- UI components use a mix of theme tokens (e.g., `bg-card`, `text-foreground`, `border-border`) and fixed palette utilities (`bg-white`, `text-gray-900`, `bg-blue-50`) depending on the component.
- Some modules define color maps in component-local config objects (e.g., `statusConfig` in `DocumentCard`, `variantConfig` in `ConfirmModal`, `typeConfig` in `ClaimTypeBadge`), while other components inline utility classes.
- The chat UI uses both a standalone `MessageBubble` component (`components/chat/MessageBubble.tsx`) and a locally defined `MessageBubble` inside `MessageList.tsx`, each with distinct styling definitions.

## Related Research
- `thoughts/shared/research/2026-01-04-veritydraft-frontend-modernization-research.md`
- `thoughts/shared/research/2026-01-04-veritydraft-tailwind-frontend-deviations.md`
- `thoughts/shared/research/2025-12-22-project2-ab-testing-gaps-analysis.md`

## Open Questions
- None noted for this pass.
