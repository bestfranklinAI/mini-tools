# UI guidelines and styling conventions

This document defines the styling, theming, and UX protocols all tools must follow so everything feels cohesive inside the app.

## Design tokens and theming

Use CSS custom properties from `src/styles/designTokens.css` and shared classes from `src/styles/components.css` and `src/styles/global.css`.

- Color variables
  - Dark (default) is defined on `:root`; light mode overrides when the `<html>` element has class `light`.
  - Never hardcode colors in tools. Always use variables:
    - Backgrounds: `var(--bg)`, `var(--bg-elev)`
    - Text: `var(--text)`, `var(--muted)`
    - Accents and states: `var(--accent)`, `--accent-2`, `--success`, `--warning`, `--danger`, `--border`, `--shadow`
- Spacing and radii: `--space-1..8`, `--radius`, `--radius-sm`, `--radius-lg`
- Typography: `--font-sans`, `--font-mono`
- Motion: `--transition-fast`, `--transition-base`, `--transition-slow`

The app sets theme and density automatically in `App.jsx`:
- Light vs dark is toggled by adding/removing `light` on `<html>`.
- Density via `document.documentElement.dataset.density = 'comfortable' | 'compact'`.
- If `reduceMotion` is enabled, scroll-behavior is set to `auto`. Prefer CSS `@media (prefers-reduced-motion)` or check Settings when animating.

## Layout primitives

Your tool is rendered inside `.tool-stage` which provides an elevated panel with constrained height and scrolling. This means vertical space is limited and your content must manage its own internal scroll. Inside your tool:

- Wrap content with a container class and keep overflow within the tool, not the page.
- Make one primary area scrollable inside your tool (e.g., the main content panel) instead of letting the whole tool grow taller than the stage. Use `min-height: 0` on flex/grid parents to enable child scrolling.
- Recommended structure:
  - Optional header using the shared component `ToolHeader`
  - A content container with your UI

Shared layout classes you can use (from components.css/global.css):
- `.tool` basic padded container
- `.tool-header` and `ToolHeader` for consistent titles/subtitles/actions
- `.tool-section` with `.section-header` and `.section-body` for grouped panels
- `.tool-content` for the scrollable main area
- Utilities: `.grid`, `.flex`, `.card`, `.chip`, `.switch`, `.badge`, `.btn`

Keep scrollable regions inside your tool’s content; don’t expand beyond the `.tool-stage` height.

### Height-aware, responsive layouts (important)

Because the tool stage has a tight vertical height, design your layout to fit and scroll internally:

- Prefer a split layout: a left panel for the live preview and a right panel with tabs for controls. Each panel should be a flex column with `min-height: 0` and the panel body should use `overflow: auto`.
- Avoid stacking many full-width sections top-to-bottom. If you must stack, collapse/accordion or use tabs to reduce vertical sprawl.
- For previews that need to scale, measure the container and render content to fit instead of using fixed pixel sizes. Example: compute `renderSize = Math.min(maxAllowedWidth, requestedSize)` on resize.
- Use responsive breakpoints to collapse two columns into one on small screens and keep the most important information first (usually the preview).
- Ensure inputs and buttons wrap on small screens; don’t rely on long single lines.

CSS tips to prevent overflow:
- On a grid/flex parent that contains a scrolling child, set `min-height: 0` on the parent.
- On the scrollable content area, set `overflow: auto` and avoid fixed heights. Use padding instead of large margins to preserve space.
- Keep expensive backgrounds under control; use an absolutely positioned layer with `filter: blur(...)` if needed and keep the preview content above it.

Accessibility and mobile:
- All interactive controls must be reachable without horizontal scroll.
- Target sizes: buttons/inputs should remain comfortably tappable when density is compact.
- Test in both themes and at narrow widths; don’t let controls overflow the viewport.

## Components and states

Use shared component classes for a consistent look:
- Buttons
  - Base: `.btn`
  - Variants: `.btn.primary`, `.btn.danger`
  - Sizes: `.btn.small`, `.btn.large`
  - Focus uses `--shadow-focus` ring; ensure buttons are focusable (native `<button>` preferred)
- Inputs
  - Base: `.input`, `textarea`, `select` styled globally; rely on focus ring and placeholder color tokens
- Grouped panels
  - `.tool-section > .section-header` for mini section titles
  - `.tool-section > .section-body` for content
- Informational UI
  - `.banner` plus state variants `.banner.info`, `.banner.warn`, `.banner.success`
- Misc
  - `.chip` for segmented options or presets
  - `.card` for visual grouping with hover elevation

Don’t introduce new global class names unless they’re generic and reusable. Prefer namespacing tool-specific selectors (e.g., `.pt__…`) to avoid leakage.

## Dark/light mode protocol

- Never hardcode color values. Always use tokens so dark/light updates automatically.
- Icons in the dock and home grid receive filters in dark mode for contrast. Provide SVGs that look acceptable in both themes.
  - If using `<img>` icons, add the `dock-icon` class for best contrast handling.
- If a tool needs theme awareness, read it indirectly via tokens or by checking `document.documentElement.classList.contains('light')` (read-only; don’t toggle it yourself).

## Density and responsiveness

- Respect density via spacing tokens; don’t assume fixed paddings.
- Use responsive grids/flows from `components.css` such as `.grid.responsive-2` or flex utilities.
- Keep controls reachable on small screens; avoid fixed pixel heights.

## Motion and accessibility

- Prefer subtle, short transitions using provided variables.
- Honor reduced motion: avoid continuous animations if `prefers-reduced-motion` or app setting is enabled.
- Accessibility
  - Use semantic HTML (button/label/input, headings)
  - Provide `aria-label` for icon-only controls
  - Keep sufficient contrast (tokens already tuned for contrast)
  - Maintain focus states; don’t remove outlines without a replacement

## Message (toast) protocol

Use the central UI helper for ephemeral feedback.

- Import and use
  - `import UI from '../core/UI'` (or `../../core/UI` inside tools)
  - `UI.toast('Saved', { type: 'success', timeout: 2400 })`
- Contract
  - `message: string`
  - `type?: 'info' | 'success' | 'warn'` (default `info`)
  - `timeout?: number` in ms (default 2400). Use `0` or negative to persist until manually removed (you must manage removal via your own state if you do this).
- Rendering
  - Toasts are shown by `src/components/Toasts.jsx` using `.banner` styles stacked above the dock.

## Settings and persistence

- Global UI settings live in `src/core/Settings.js`. Tools should not mutate global UI behavior, except via explicit user actions (e.g., a tool that edits LLM settings may call `Settings.setLLM`).
- For tool-local persistence, prefer `localStorage` with a namespaced key like `tool:<tool-id>:myKey`.

## Do and don’t

- Do
  - Use design tokens and shared classes
  - Keep your tool’s CSS namespaced
  - Provide keyboard and screen-reader friendly controls
  - Use `ToolHeader` for consistent titles and action areas
  - Show feedback using `UI.toast`
- Don’t
  - Hardcode colors or fonts
  - Change theme/density classes directly
  - Overflow the `.tool-stage` (avoid fixed huge heights)
  - Block the UI without feedback (show progress or disable buttons)

---

If you need a new reusable primitive (button variant, badge, layout), add it to `components.css` rather than custom-styling in one tool.

## Full-height contract for tools (must follow)

All tools must fill the vertical space of `.tool-stage` and keep scrolling inside their own content area.

- Root container: `display: flex; flex-direction: column; height: 100%; min-height: 0;`
- Any grid/flex parent of a scrollable child: add `min-height: 0`
- The main content area: `flex: 1; overflow: auto; min-height: 0`
- Prefer a 2-column split (preview | controls) with responsive collapse on small screens

Quick template:

```jsx
<div className="tool mytool" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
  <ToolHeader title="My Tool" />
  <div className="mytool__layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', flex: 1, minHeight: 0 }}>
    <div className="tool-section" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="section-header">Preview</div>
      <div className="section-body" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>…</div>
    </div>
    <div className="tool-section" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="section-header">Controls</div>
      <div className="section-body" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>…</div>
    </div>
  </div>
</div>
```

Checklist for PRs:
- Root fills height (100%) and uses min-height: 0
- Exactly one scrollable area in the main region (no page scroll from tool)
- Works in both themes; preview scales to fit container
- Responsive down to mobile; no horizontal scroll; controls wrap as needed
