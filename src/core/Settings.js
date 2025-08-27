// Centralized settings manager for persistent app settings (localStorage)
// Currently handles LLM connection settings

const STORAGE_KEY = 'miniapp:settings:v1';

const defaultState = {
  llm: {
    endpoint: '', // e.g. https://api.openai.com/v1/chat/completions (OpenAI-compatible)
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  },
  ui: {
    theme: 'system', // 'system' | 'light' | 'dark'
    density: 'comfortable', // 'comfortable' | 'compact'
    reduceMotion: false,
    startup: 'last', // 'home' | 'last'
    favorites: [], // tool ids
    recents: [], // [{ id, lastUsed, count }]
  },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    // Shallow merge with defaults to support upgrades
    return {
      ...defaultState,
      ...parsed,
      llm: { ...defaultState.llm, ...(parsed?.llm || {}) },
  ui: { ...defaultState.ui, ...(parsed?.ui || {}) },
    };
  } catch {
    return { ...defaultState };
  }
}

let state = load();
const listeners = new Set();

function save(newState) {
  state = newState;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  for (const cb of Array.from(listeners)) {
    try { cb(state); } catch (e) { console.error('Settings listener error', e); }
  }
}

const Settings = {
  get() { return state; },
  set(partial) {
    const next = { ...state, ...partial };
    // Merge nested llm if provided
    if (partial && Object.prototype.hasOwnProperty.call(partial, 'llm')) {
      next.llm = { ...state.llm, ...(partial.llm || {}) };
    }
    // Merge nested ui if provided
    if (partial && Object.prototype.hasOwnProperty.call(partial, 'ui')) {
      next.ui = { ...state.ui, ...(partial.ui || {}) };
    }
    save(next);
  },
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  // Helper getters/setters for LLM block
  getLLM() { return state.llm; },
  setLLM(partial) { save({ ...state, llm: { ...state.llm, ...(partial || {}) } }); },
  // UI helpers
  getUI() { return state.ui; },
  setUI(partial) { save({ ...state, ui: { ...state.ui, ...(partial || {}) } }); },
  toggleFavorite(id) {
    const favs = new Set(state.ui.favorites || []);
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    Settings.setUI({ favorites: Array.from(favs) });
  },
  isFavorite(id) { return (state.ui.favorites || []).includes(id); },
  recordUsage(id) {
    const recents = Array.isArray(state.ui.recents) ? [...state.ui.recents] : [];
    const now = Date.now();
    const idx = recents.findIndex((r) => r.id === id);
    if (idx >= 0) {
      const r = recents[idx];
      recents.splice(idx, 1, { ...r, lastUsed: now, count: (r.count || 0) + 1 });
    } else {
      recents.unshift({ id, lastUsed: now, count: 1 });
    }
    // keep last 20
    Settings.setUI({ recents: recents.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 20) });
  },
};

export default Settings;
