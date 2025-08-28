# GEMINI.md

## Project Overview

This is a single-page application (SPA) built with Vite and React. It functions as a modular, plugin-based multi-tool platform. The application discovers and loads "tools" dynamically from the `src/tools` directory. Each tool is self-contained and defined by a `tool.json` manifest file.

The core architecture is designed for extensibility. New tools can be added by simply creating a new directory with the required files, and the application will automatically discover and integrate them. The UI features a fuzzy search for finding tools and a Mac-style dock for quick access.

**Key Technologies:**

*   **Frontend:** React, Vite
*   **UI/Animation:** Framer Motion, Lucide React for icons
*   **Search:** `fuzzy-search`
*   **Styling:** CSS with custom properties for theming (dark/light modes)

## Building and Running

The project uses `npm` for package management.

*   **Install Dependencies:**
    ```bash
    npm install
    ```

*   **Run in Development Mode:**
    ```bash
    npm run dev
    ```

*   **Build for Production:**
    ```bash
    npm run build
    ```

*   **Preview Production Build:**
    ```bash
    npm run preview
    ```

*   **Linting:**
    ```bash
    npm run lint
    ```

## Development Conventions

### Creating a New Tool

To create a new tool, follow these steps:

1.  **Copy the Template:** Duplicate the `src/tools/_template` directory and rename it to a unique ID for your tool (e.g., `src/tools/my-new-tool`).

2.  **Update `tool.json`:** Modify the `tool.json` file in your new tool's directory with the following information:
    *   `id`: A unique string identifier for the tool.
    *   `name`: The display name of the tool.
    *   `description`: A brief description of the tool's functionality.
    *   `tags`: An array of strings for categorization and search.
    *   `keywords`: An array of additional keywords for search.
    *   `icon`: The path to the tool's icon (e.g., `assets/icon.svg`).
    *   `entry`: The path to the main React component for the tool (e.g., `NewTool.jsx`).

3.  **Implement the Component:** Write the React component for your tool. The component should be self-contained and manage its own state.

4.  **Add Assets:** Place any assets for your tool (e.g., icons, images) in the `assets` directory within your tool's folder.

### Code Style

The project uses ESLint for code linting. Please run `npm run lint` to check for any issues before committing changes.

### Core Logic

*   **Tool Discovery:** The `src/core/ToolRegistry.js` module is responsible for discovering and registering tools. It uses `import.meta.glob` to find all `tool.json` files within the `src/tools` directory.
*   **Search:** The `src/core/SearchEngine.js` module provides a fuzzy search over the registered tools' metadata.
*   **UI Components:** Reusable UI components are located in the `src/components` directory.
*   **Styling:** Global styles and design tokens are defined in the `src/styles` directory.
