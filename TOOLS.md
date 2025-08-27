# Tool authoring guide

This guide explains how to build tools that plug into the site seamlessly. Follow these conventions for discovery, styling, UX, and APIs.

## Overview

- Tools live under src/tools/<tool-id>/
- Each tool must include a manifest (tool.json) and a React entry component (.jsx or .js)
- The registry (src/core/ToolRegistry.js) discovers tool.json files and lazy-loads the entry component
- The container (src/components/ToolContainer.jsx) renders your tool with Suspense and an error boundary

## Folder structure

    src/tools/
      <tool-id>/
        tool.json
        <Entry>.jsx
        <style>.css
        assets/
          icon.svg

Use src/tools/_template as a minimal starting point.

## Manifest (tool.json)

Required fields:
- id: string (unique across all tools)
- name: string
- description: string (one-line summary)
- tags: string[] (used for grouping and search)
- icon: string (relative path to an SVG in this folder, e.g. assets/icon.svg)
- entry: string (component filename in this folder, e.g. MyTool.jsx)

Optional fields:
- keywords: string[] (extra searchable terms)

Example manifest:

    {
      "id": "plain-text",
      "name": "Plain Text Formatter",
      "description": "Strip all rich text styling and copy clean plain text.",
      "tags": ["text", "format", "clean"],
      "keywords": ["plain", "paste", "copy", "sanitize"],
      "icon": "assets/plain.svg",
      "entry": "PlainText.jsx"
    }

Validation happens at startup; invalid entries or duplicate ids are skipped with a console warning.

## Entry component

- Default export a React component; it will be lazy-loaded
- Keep internal state self-contained; avoid global mutations
- Recommended structure:
  - Header using ToolHeader with title/subtitle/actions
  - Content using tool-section panels and shared controls

Minimal example:

    import './myTool.css';
    import ToolHeader from '../../components/ToolHeader';
    import UI from '../../core/UI';

    export default function MyTool() {
      const run = () => UI.toast('Done', { type: 'success' });
      return (
        <div className="tool mytool">
          <ToolHeader title="My Tool" subtitle="Does a focused job" />
          <div className="tool-section">
            <div className="section-header">Controls</div>
            <div className="section-body">
              <button className="btn primary" onClick={run}>Run</button>
            </div>
          </div>
        </div>
      );
    }

## Styling rules

- Use design tokens and shared classes (see UI.md)
- Namespace your CSS to avoid collisions, e.g. .mytool__grid, .mytool__btn
- Don’t hardcode colors; use var(--bg-elev), var(--text), var(--border), var(--accent)
- Keep layout within the .tool-stage bounds; make inner areas scroll instead of growing the outer container

## Icons

- Place an SVG under assets/ and reference it from tool.json via icon
- Prefer simple, single-color SVGs readable in both themes. The dock applies filters for dark mode contrast

## Messaging and feedback

- Use UI.toast(message, { type, timeout }) for ephemeral feedback
  - Types: info (default), success, warn
  - timeout default is 2400ms; use 0 to avoid auto-dismiss

## Settings and persistence

- Global settings live in src/core/Settings.js
  - Read: Settings.get(), Settings.getUI(), Settings.getLLM()
  - Write: Settings.set(), Settings.setUI(), Settings.setLLM()
- Prefer namespaced localStorage keys for tool-local persistence, e.g. tool:<tool-id>:key

## LLM API (optional)

If your tool needs an LLM:
- Use src/core/api.js (simple) or src/core/LLMClient.js (advanced)
  - import api from '../../core/api'
  - const { text } = await api.prompt('Your prompt', { model, temperature, system })
- Endpoint/API key/model are user-configured; never hardcode secrets
- Handle errors gracefully and show a toast or inline banner

## Events and decoupling

- For app-wide notifications, use UI.toast
- For custom decoupled events, use the event bus:
  - import bus from '../../core/EventBus'
  - const off = bus.on('tool:mytool:event', (payload) => { /* ... */ })
  - bus.emit('tool:mytool:event', payload)

## Accessibility checklist

- All controls are keyboard-accessible
- Focus indicators preserved; don’t remove outlines without a replacement
- Icon-only buttons include aria-label
- Use semantic elements (button, label, input, headings)

## Performance tips

- Debounce heavy transforms on input
- Memoize derived values with useMemo/useCallback
- Avoid re-render storms; split into smaller components if needed

## Error handling

- The ToolContainer provides an error boundary, but you should still catch expected errors and present friendly messages
- For network/LLM failures: try/catch, show a toast, optionally an inline .banner.warn

## Quality bar for new tools

- No console errors or unhandled promise rejections
- Adheres to tokens and shared classes (see UI.md)
- Respects theme, density, and reduced-motion
- Keyboard and screen-reader friendly
- Provides feedback for actions

## Adding a new tool (step-by-step)

1. Create folder src/tools/<tool-id>/
2. Add tool.json with required fields
3. Add the entry component file and import a local CSS file
4. Add an SVG icon under assets/ and reference it from the manifest
5. Use ToolHeader, tool-section, btn, input, etc. for consistent styling
6. Run the app; the registry auto-discovers your tool and it shows in search/home/dock
7. Test in light and dark themes and compact density

## Example template

- See src/tools/_template/ for a minimal starting point (NewTool.jsx, newTool.css, tool.json)

If your tool requires a new shared primitive, propose it in src/styles/components.css so others can reuse it.
