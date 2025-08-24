# Modular Tools SPA (Vite + React)

Single-page, plugin-based multi-tool app. Tools are discovered from `src/tools/**/tool.json` via `import.meta.glob`, lazily loaded, and shown one-at-a-time with transitions. Includes fuzzy search and a Mac-style dock.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## Structure

- `src/core/ToolRegistry.js` — discovers `tool.json`, validates, exposes lazy importers
- `src/core/SearchEngine.js` — fuzzy search over tool metadata
- `src/components/` — `SearchBar`, `MacDock`, `ToolContainer`, `LoadingSpinner`
- `src/styles/` — design tokens and global styles (dark/light)
- `src/tools/` — each tool self-contained
	- `text-formatter/` — example tool
	- `_template/` — scaffold to copy for new tools

## Create a Tool

1. Copy `src/tools/_template` to `src/tools/<your-id>`
2. Update `tool.json`:
	 - `id`: unique string
	 - `name`, `description`, `tags`, `keywords`
	 - `icon`: path like `assets/icon.svg`
	 - `entry`: component file, e.g. `NewTool.jsx`
3. Implement your component and styles. Keep state inside the component.
4. Assets should live under the tool folder.

No core code changes needed — the app discovers the tool automatically.

## Notes

- Fuzzy search via `fuzzy-search`
- Transitions via `react-transition-group`
- Dark mode toggle uses CSS custom properties
- Error boundary and loading states included in `ToolContainer`
