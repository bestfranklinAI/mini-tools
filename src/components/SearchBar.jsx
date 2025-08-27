import { useEffect, useMemo, useRef, useState } from 'react';
import { motion as FM, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Command } from 'lucide-react';
import SearchEngine from '../core/SearchEngine';
import ToolRegistry from '../core/ToolRegistry';

export default function SearchBar({ onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(() => SearchEngine.query(''));
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  const debounced = useMemo(() => {
    let t;
    return (val) => {
      clearTimeout(t);
      t = setTimeout(() => {
        setResults(SearchEngine.query(val));
      }, 120);
    };
  }, []);

  useEffect(() => { debounced(q); }, [q, debounced]);

  // keyboard handling (arrows / enter / esc).
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        const pick = results[activeIdx] || results[0];
        if (pick) { onPick(pick.id); setOpen(false); inputRef.current?.blur(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, activeIdx, onPick]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div className="search-wrap">
        <SearchIcon size={16} className="search-lead" aria-hidden="true" />
        <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search tools…"
        className="search-input"
        aria-autocomplete="list"
        aria-expanded={open}
      />
        <kbd className="search-kbd"><Command size={12} />K</kbd>
      </div>
    <AnimatePresence>
        {open && results.length > 0 && (
      <FM.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="search-pop"
            role="listbox"
          >
            {results.slice(0, 12).map((r, idx) => (
              <button
                key={r.id}
                className={`search-item${idx === activeIdx ? ' active' : ''}`}
                onMouseDown={() => onPick(r.id)}
                onMouseEnter={() => { setActiveIdx(idx); try { ToolRegistry.getImporter(r.id)?.(); } catch {} }}
                role="option"
                aria-selected={idx === activeIdx}
              >
                <ToolIcon toolId={r.id} size={22} />
                <div className="search-meta">
                  <span>{r.name}</span>
                  <span className="muted desc">{r.description}</span>
                </div>
              </button>
            ))}
          </FM.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolIcon({ toolId, size }) {
  const meta = ToolRegistry.getMeta(toolId);
  if (!meta) return <span style={{ width: size, height: size }} />;
  // Reuse the same glob as MacDock
  const rel = `${meta.dir}/${meta.icon}`.replace(/^\.\//, '');
  const modules = import.meta.glob('../tools/*/assets/*.svg', { eager: true, query: '?url', import: 'default' });
  const url = modules[rel];
  if (!url) return <span style={{ width: size, height: size }} />;
  return <img className="dock-icon" src={url} alt="" width={size} height={size} style={{ objectFit: 'contain' }} />;
}
