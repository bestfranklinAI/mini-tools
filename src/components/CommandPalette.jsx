import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion as FM } from 'framer-motion';
import SearchEngine from '../core/SearchEngine';
import ToolRegistry from '../core/ToolRegistry';

export default function CommandPalette({ open, onClose, onPick }) {
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [results, setResults] = useState(() => SearchEngine.query(''));
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // debounce search
  const debouncedSearch = useMemo(() => {
    let t;
    return (val) => {
      clearTimeout(t);
      t = setTimeout(() => setResults(SearchEngine.query(val)), 100);
    };
  }, []);

  useEffect(() => { if (open) debouncedSearch(q); }, [q, open, debouncedSearch]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActiveIdx(0);
    const r = SearchEngine.query('');
    setResults(r);
  }, [open]);

  // focus trap basic
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const to = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); scrollIntoView(activeIdx + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); scrollIntoView(activeIdx - 1); }
      if (e.key === 'Enter') {
        const pick = results[activeIdx];
        if (pick) { onPick?.(pick.id); onClose?.(); }
      }
    };
    const scrollIntoView = (idx) => {
      const el = listRef.current?.querySelector(`[data-idx="${idx}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(to); prev?.focus?.(); };
  }, [open, results, activeIdx, onClose, onPick]);

  const prefetch = (id) => {
    try { ToolRegistry.getImporter(id)?.(); } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <FM.div className="palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <FM.div className="palette" role="dialog" aria-modal="true" aria-label="Command palette"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="palette-input-wrap">
              <input
                ref={inputRef}
                className="palette-input"
                placeholder="Search tools and commands…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
                aria-autocomplete="list"
                aria-expanded
              />
            </div>
            <div className="palette-list" role="listbox" ref={listRef}>
              {results.slice(0, 20).map((r, idx) => (
                <button
                  key={r.id}
                  className={`palette-item${idx === activeIdx ? ' active' : ''}`}
                  role="option"
                  data-idx={idx}
                  aria-selected={idx === activeIdx}
                  onMouseEnter={() => { setActiveIdx(idx); prefetch(r.id); }}
                  onMouseDown={(e) => { e.preventDefault(); onPick?.(r.id); onClose?.(); }}
                >
                  <ToolIcon toolId={r.id} size={22} />
                  <div className="palette-meta">
                    <div className="title">{r.name}</div>
                    <div className="desc">{r.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </FM.div>
        </FM.div>
      )}
    </AnimatePresence>
  );
}

function ToolIcon({ toolId, size }) {
  const meta = ToolRegistry.getMeta(toolId);
  if (!meta) return <span style={{ width: size, height: size }} />;
  const rel = `${meta.dir}/${meta.icon}`.replace(/^\.\//, '');
  const modules = import.meta.glob('../tools/*/assets/*.svg', { eager: true, query: '?url', import: 'default' });
  const url = modules[rel];
  if (!url) return <span style={{ width: size, height: size }} />;
  return <img src={url} alt="" width={size} height={size} style={{ objectFit: 'contain', filter: 'drop-shadow(0 1px 3px var(--shadow))' }} />;
}
