## Linear-Inspired Redesign — Layout Preview Only

Scope: visual/layout changes only. No business logic edits in tool components. All existing tools keep working as-is inside the new shell.

### 1. Design tokens (`src/index.css`, `tailwind.config.ts`)
- Override theme to: bg `#0a0a0f`, surface `#111118`, text `#e2e2e8`, muted `#6b6b78`, accent purple `#8b5cf6`.
- Remove gradients / glass / heavy shadows from `glass-card`, `gradient-text`, `btn-gradient` utilities — flatten them.
- Load Inter (UI) + JetBrains Mono (code) via Google Fonts in `index.html`; map to Tailwind `font-sans` / `font-mono`.
- Fluid type scale via `clamp()`.

### 2. Two app modes (`src/pages/Index.tsx`)
- **Home mode** (default, no tool selected):
  - Centered large command/search input.
  - Horizontal "Recent" row (localStorage-backed, icon tiles).
  - Bento grid of all tools — 3 columns, minimal cards, icon + name + one-line description.
- **Tool mode** (tool selected):
  - Sidebar hidden entirely.
  - Top bar: breadcrumb (Home › Tool), privacy shield badge ("Client-side"), close (×) returns to Home.
  - Full-width tool area.
  - No more `glass-card` wrapper — flat surface.

### 3. Command Palette (`src/components/CommandPalette.tsx`, new)
- Built on existing `components/ui/command.tsx` (cmdk).
- Global `Cmd/Ctrl+K` opens it; type to fuzzy-find any tool, Enter to switch.
- Recents listed at top.

### 4. Recents store (`src/hooks/useRecentTools.ts`, new)
- Tracks last 5 selected tools in localStorage.

### 5. Zen mode + shortcuts (in `Index.tsx`)
- `Esc` toggles chrome (top bar) hidden in tool mode.
- `?` opens a small shortcuts cheatsheet dialog.

### 6. What I will NOT touch this pass
- Internal layout of each tool component (JSONTool, ImageTool, etc.) — they'll just render inside the new flat shell. Per-tool polish (drag-drop overlay, live validation squiggles, diff view, persistent input) is a follow-up.
- Backend / state handlers.

### Files
- edit: `src/index.css`, `tailwind.config.ts`, `index.html`, `src/pages/Index.tsx`, `src/components/AppSidebar.tsx` (only used in command palette mode now)
- new: `src/components/CommandPalette.tsx`, `src/components/HomeDashboard.tsx`, `src/components/ToolShell.tsx`, `src/hooks/useRecentTools.ts`

Confirm and I'll implement. Reply "go" or tell me what to drop/add.