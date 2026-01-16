// Core ToolRegistry: discovers tools via Vite import.meta.glob, validates metadata,
// and provides lazy component loaders per tool.

// Eagerly import tool.json files to build the registry synchronously at startup
const toolJsonModules = import.meta.glob('../tools/*/tool.json', { eager: true });

// Lazily import any JS/JSX inside each tool folder. We'll match by exact path built from entry in tool.json
const toolComponentModules = import.meta.glob('../tools/*/*.{jsx,js}', { eager: false });

function isString(x) { return typeof x === 'string' && x.trim().length > 0; }
function isArrayOfStrings(x) { return Array.isArray(x) && x.every((t) => typeof t === 'string'); }

function validateToolMeta(meta, sourcePath) {
  const errors = [];
  if (!isString(meta.id)) errors.push('id (string)');
  if (!isString(meta.name)) errors.push('name (string)');
  if (!isString(meta.description)) errors.push('description (string)');
  if (!isArrayOfStrings(meta.tags)) errors.push('tags (string[])');
  if (!isString(meta.icon)) errors.push('icon (string path to SVG)');
  if (!isString(meta.entry)) errors.push('entry (string path to component file within tool folder)');
  if (errors.length) {
    console.warn(`ToolRegistry: Invalid tool.json at ${sourcePath}. Missing/invalid: ${errors.join(', ')}`);
    return false;
  }
  return true;
}

function buildRegistry() {
  const tools = [];
  const ids = new Set();

  Object.entries(toolJsonModules).forEach(([path, mod]) => {
    // Vite JSON modules default export is parsed JSON
    const meta = mod?.default ?? mod;
    if (path.includes('/_template/')) return;
    if (!validateToolMeta(meta, path)) return;

    if (ids.has(meta.id)) {
      console.warn(`ToolRegistry: Duplicate tool id '${meta.id}' detected at ${path}. Skipping.`);
      return;
    }
    ids.add(meta.id);

    // Derive the directory path (without trailing filename)
    const dir = path.replace(/\/tool\.json$/, '').replace(/\/tool.json$/, '');
    const componentPath = `${dir}/${meta.entry}`;

    const importer = toolComponentModules[componentPath];
    if (!importer) {
      console.warn(`ToolRegistry: Entry component '${meta.entry}' not found for tool '${meta.id}'. Expected at ${componentPath}. Skipping.`);
      return;
    }

    tools.push({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      tags: meta.tags ?? [],
      keywords: meta.keywords ?? [],
      icon: meta.icon,
      dir,
      entry: meta.entry,
      importer, // () => Promise<{ default: React.ComponentType }>
    });
  });

  // Sort by name for consistent UI ordering
  tools.sort((a, b) => a.name.localeCompare(b.name));
  return tools;
}

const _tools = buildRegistry();

const ToolRegistry = {
  list() { return _tools.slice(); },
  getMeta(id) { return _tools.find((t) => t.id === id) || null; },
  getImporter(id) { return this.getMeta(id)?.importer || null; },
  has(id) { return !!this.getMeta(id); },
};

export default ToolRegistry;
