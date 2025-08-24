// Wrapper around fuzzy-search to index tool metadata
import ToolRegistry from './ToolRegistry';

let FuzzySearch;
try {
  FuzzySearch = (await import('fuzzy-search')).default;
} catch {
  console.warn('fuzzy-search not installed yet. Search will be simple substring until install.');
}

function normalizeToolMeta(tool) {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    tags: tool.tags,
    keywords: tool.keywords,
    icon: tool.icon,
  };
}

class SearchEngine {
  constructor() {
    this.tools = ToolRegistry.list().map(normalizeToolMeta);
    this.searcher = FuzzySearch
      ? new FuzzySearch(this.tools, ['name', 'description', 'tags', 'keywords'], { caseSensitive: false })
      : null;
  }

  query(q) {
    if (!q) return this.tools;
    if (this.searcher) return this.searcher.search(q);
    // Fallback: naive filter
    const s = q.toLowerCase();
    return this.tools.filter((t) =>
      [t.name, t.description, ...(t.tags || []), ...(t.keywords || [])]
        .join(' ').toLowerCase().includes(s)
    );
  }
}

const engine = new SearchEngine();
export default engine;
