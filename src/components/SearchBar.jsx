import { useEffect, useMemo, useRef, useState } from 'react';
import SearchEngine from '../core/SearchEngine';

export default function SearchBar({ onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(() => SearchEngine.query(''));
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    debounced(q);
  }, [q, debounced]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search tools…"
  className="search-input"
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 10px 30px var(--shadow)', maxHeight: 320, overflow: 'auto', zIndex: 20 }}>
          {results.slice(0, 12).map((r) => (
            <button key={r.id} className="search-item" onMouseDown={() => onPick(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: 10, background: 'transparent', border: 0, color: 'var(--text)', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{r.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>{r.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
