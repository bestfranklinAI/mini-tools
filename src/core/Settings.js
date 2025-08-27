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
    save(next);
  },
  onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  // Helper getters/setters for LLM block
  getLLM() { return state.llm; },
  setLLM(partial) { save({ ...state, llm: { ...state.llm, ...(partial || {}) } }); },
};

export default Settings;
