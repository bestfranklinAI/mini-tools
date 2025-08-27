import { useEffect, useMemo, useRef, useState, startTransition, memo } from 'react';
import './obsidianSearch.css';
import LoadingSpinner from '../../components/LoadingSpinner';

const DEFAULT_ENDPOINT = 'http://localhost:51361';
const LS_KEY = 'miniapp:obsidianSearch:v1';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { endpoint: DEFAULT_ENDPOINT };
    const parsed = JSON.parse(raw);
    return { endpoint: parsed?.endpoint || DEFAULT_ENDPOINT };
  } catch {
    return { endpoint: DEFAULT_ENDPOINT };
  }
}

function savePrefs(prefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore storage errors */ }
}

function stripHtml(input) {
  if (!input) return '';
  return String(input)
    .replace(/<br\s*\/?>/gi, ' \u00B7 ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function useDebouncedCallback(cb, delay = 180) {
  const ref = useRef();
  useEffect(() => () => clearTimeout(ref.current), []);
  return useMemo(() => (arg) => {
    clearTimeout(ref.current);
    ref.current = setTimeout(() => cb(arg), delay);
  }, [cb, delay]);
}

function ObsidianIcon({ size = 22 }) {
  // Use a robust URL resolution relative to this file to avoid glob key mismatches
  const url = new URL('./assets/icon.svg', import.meta.url).href;
  return <img src={url} alt="Obsidian" width={size} height={size} style={{ display: 'block' }} />;
}

export default function ObsidianSearch() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [serverOk, setServerOk] = useState(null); // null=unknown, true/false
  const [showSettings, setShowSettings] = useState(false);
  const abortRef = useRef(null);
  const activeReqId = useRef(0);

  const fetchSearch = async (q) => {
    if (!q || !q.trim()) { setResults([]); setError(''); return; }
    // Cancel any in-flight request to avoid out-of-order updates
  try { abortRef.current?.abort(); } catch (_e) { /* already aborted */ }
    const controller = new AbortController();
    abortRef.current = controller;
    const myId = ++activeReqId.current;
    setBusy(true); setError('');
    try {
      const url = `${prefs.endpoint.replace(/\/$/, '')}/search?q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      if (activeReqId.current !== myId) return; // stale response
      startTransition(() => setResults(data));
      setServerOk(true);
    } catch (e) {
      if (e?.name === 'AbortError') return; // ignore aborted
      if (activeReqId.current !== myId) return; // stale
      setError(`Failed to search: ${e.message}`);
      setServerOk(false);
    } finally {
      if (activeReqId.current === myId) setBusy(false);
    }
  };

  const debouncedSearch = useDebouncedCallback(fetchSearch, 200);

  useEffect(() => {
    // lightweight server probe on mount
    let aborted = false;
    (async () => {
      try {
        const url = `${prefs.endpoint.replace(/\/$/, '')}/search?q=test`;
        const res = await fetch(url, { method: 'GET' });
        if (!aborted) setServerOk(res.ok);
      } catch {
        if (!aborted) setServerOk(false);
      }
    })();
    return () => { aborted = true; };
  }, [prefs.endpoint]);

  const onSubmit = (e) => { e.preventDefault(); fetchSearch(query); };

  const updateEndpoint = (val) => {
    const next = { endpoint: val };
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <div className="tool obsidian-search">
      <header className="obsidian-header">
        <div className="title">
          <ObsidianIcon size={22} />
          <h3>Omni Search for Obsidian</h3>
        </div>
        <div className="server-status" title={serverOk === null ? 'Unknown' : serverOk ? 'Server reachable' : 'Server unreachable'}>
          <span className={`dot ${serverOk ? 'ok' : serverOk === false ? 'bad' : 'unk'}`} />
          <span className="muted">{prefs.endpoint}</span>
          <button className="ghost" onClick={() => setShowSettings((v) => !v)} aria-label="Settings">⚙︎</button>
        </div>
      </header>

      {showSettings && (
        <div className="panel settings">
          <label className="field">
            <span>Search endpoint</span>
            <input value={prefs.endpoint} onChange={(e) => updateEndpoint(e.target.value)} placeholder={DEFAULT_ENDPOINT} />
          </label>
          <p className="muted small">Expected JSON array response from GET /search?q=…</p>
        </div>
      )}

      <form className="query-bar" onSubmit={onSubmit}>
        <input
          className="query-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); debouncedSearch(e.target.value); }}
          placeholder="Search your vaults… (e.g., github copilot)"
          autoFocus
        />
        <button className="primary" type="submit" disabled={busy}>Search</button>
      </form>

      {busy && (
        <div className="loading">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="panel error">{error}</div>
      )}

      {!busy && !error && results?.length > 0 && (
        <ul className="results">
          {results.map((r, idx) => (
            <ResultItem key={r.vault + r.path + idx} item={r} query={query} />
          ))}
        </ul>
      )}

      {!busy && !error && query && results?.length === 0 && (
        <div className="panel empty">No matches. Try different keywords.</div>
      )}
    </div>
  );
}

const ResultItem = memo(function ResultItem({ item, query }) {
  const { score, vault, path, basename, foundWords = [], excerpt } = item || {};

  const obsidianUrl = useMemo(() => {
    if (!vault || !path) return '#';
    return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(path)}`;
  }, [vault, path]);

  const obsidianSearchUrl = useMemo(() => {
    if (!vault) return '#';
    const q = query && query.trim() ? query : (foundWords?.slice(0, 3).join(' ') || '');
    return `obsidian://search?vault=${encodeURIComponent(vault)}&query=${encodeURIComponent(q)}`;
  }, [vault, query, foundWords]);

  const safeExcerpt = useMemo(() => stripHtml(excerpt).slice(0, 280), [excerpt]);

  return (
    <li className="card result">
      <div className="left">
        <div className="path">
          <span className="vault">{vault}</span>
          <span className="muted"> / </span>
          <span>{path}</span>
        </div>
        <div className="title-row">
          <a className="title" href={obsidianUrl}> {basename || 'Untitled'} </a>
          <span className="score" title="Search score">{Math.round(score)}</span>
        </div>
        {foundWords?.length > 0 && (
          <div className="chips">
            {foundWords.slice(0, 8).map((w, i) => (
              <span key={i} className="chip">{w}</span>
            ))}
            {foundWords.length > 8 && <span className="chip more">+{foundWords.length - 8}</span>}
          </div>
        )}
        {safeExcerpt && (
          <p className="excerpt">{safeExcerpt}</p>
        )}
      </div>
      <div className="actions">
        <a className="btn" href={obsidianUrl}>Open in Obsidian</a>
  <a className="btn" href={obsidianSearchUrl} title="Open Obsidian search">Search in Obsidian</a>
      </div>
    </li>
  );
}, (prev, next) => {
  const a = prev.item, b = next.item;
  if (prev.query !== next.query) return false;
  if (!a || !b) return a === b;
  return a.vault === b.vault && a.path === b.path && a.basename === b.basename && a.score === b.score && a.excerpt === b.excerpt && (a.foundWords?.length || 0) === (b.foundWords?.length || 0);
});
