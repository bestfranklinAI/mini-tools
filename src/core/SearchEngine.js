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
    const s = String(q || '').trim().toLowerCase();
    if (!s) return this.tools;

    // Build candidate list with simple scoring to prioritize exact and prefix matches
    const fields = (t) => [t.name, t.description, ...(t.tags || []), ...(t.keywords || [])]
      .filter(Boolean).map((x) => String(x).toLowerCase());

    const scored = this.tools.map((t) => {
      const fs = fields(t);
      let score = 0;
      for (const f of fs) {
        if (f === s) { score = Math.max(score, 100); break; }
        if (f.startsWith(s)) score = Math.max(score, 80);
        if (f.includes(s)) score = Math.max(score, 50);
      }
      return { t, score };
    }).filter((x) => x.score > 0); // drop unrelated content entirely

    // If fuzzy-search is available, merge in fuzzy results but cap low-confidence
    if (this.searcher) {
      const fuzzy = this.searcher.search(q);
      // Boost those already scored; add new ones with lower base score
      const byId = new Map(scored.map((x) => [x.t.id, x]));
      for (const f of fuzzy) {
        const cur = byId.get(f.id);
        if (cur) {
          cur.score = Math.max(cur.score, 60); // ensure fuzzy matches don't outrank exact/prefix
        } else {
          // Only include fuzzy if some field contains at least part of q to avoid wild mismatches
          const fs = fields(f);
          if (fs.some((v) => v.includes(s))) {
            byId.set(f.id, { t: f, score: 40 });
          }
        }
      }
      return Array.from(byId.values())
        .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
        .map((x) => x.t);
    }

    return scored
      .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
      .map((x) => x.t);
  }
}

const engine = new SearchEngine();
export default engine;
