import { useEffect, useMemo, useRef, useState } from 'react';
import './randomSpin.css';

// Contract
// props: none; self-contained tool
// behavior: input names, add/remove; spin wheel; randomly select a name w/ pulse highlight

export default function RandomSpin() {
  const [input, setInput] = useState('');
  const [names, setNames] = useState(() => {
    try {
      const raw = localStorage.getItem('randomSpin:names');
      return raw ? JSON.parse(raw) : ['Alice', 'Bob', 'Charlie'];
    } catch {
      return ['Alice', 'Bob', 'Charlie'];
    }
  });
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [angle, setAngle] = useState(0);
  
  useEffect(() => {
    localStorage.setItem('randomSpin:names', JSON.stringify(names));
  }, [names]);
  
  const cleaned = useMemo(() =>
    names.filter((n) => n && n.trim()).map((n) => n.trim()),
    [names]
  );

  // Stable color assignment based on name hashing for legend and wheel slices
  const palette = useMemo(() => (
    ['#7aa2f7', '#7dcfff', '#3ccf91', '#ffd166', '#ef476f', '#a78bfa', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#0ea5e9']
  ), []);
  const colorFor = (name, i) => {
    let h = 0;
    for (let c = 0; c < name.length; c++) h = (h * 31 + name.charCodeAt(c)) | 0;
    const idx = Math.abs(h + i) % palette.length;
    return palette[idx];
  };
  
  const disabled = cleaned.length < 2 || spinning;
  
  const addNamesFromInput = () => {
    const parts = input
      .split(/[\n,\t,;]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setNames((prev) => Array.from(new Set([...prev, ...parts])));
    setInput('');
  };
  
  const removeName = (idx) => 
    setNames((prev) => prev.filter((_, i) => i !== idx));
  
  const clearAll = () => setNames([]);
  
  const spin = () => {
    if (disabled) return;
    setSpinning(true);
    setWinner(null);
    
    // Determine target index and corresponding angle slice
    const targetIndex = Math.floor(Math.random() * cleaned.length);
    const slice = 360 / cleaned.length;
    const targetAngleCenter = targetIndex * slice + slice / 2; // center of segment
    
    // We want the pointer at 12 o'clock (0deg) to land at the center of target
    // Current angle is 'angle'. We'll spin several full turns plus the offset to target
    const fullTurns = 6 + Math.floor(Math.random() * 3); // 6-8 turns
    const targetAbsolute = fullTurns * 360 + (360 - targetAngleCenter);
    const duration = 3200; // ms
    const start = performance.now();
    const startAngle = angle % 360;
    const delta = targetAbsolute - startAngle;
    
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      setAngle(startAngle + delta * eased);
      
      if (t < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setWinner(cleaned[targetIndex]);
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      }
    };
    
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(animate);
  };
  
  const raf = useRef(null);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  
  const [pulse, setPulse] = useState(false);
  
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNamesFromInput();
    }
  };
  
  const wheelStyle = buildWheelStyle(cleaned, colorFor);
  const pointerLabel = spinning ? 'Spinning…' : (winner || 'Ready');
  
  return (
    <div className="tool rs-wrap">
      <div className="rs-panel">
        <div className="rs-config">
          <div className="rs-input modern">
            <input
              className="rs-input-field"
              placeholder="Add names (comma separated)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button 
              className="rs-btn rs-btn-add" 
              onClick={addNamesFromInput} 
              disabled={!input.trim()}
            >
              Add
            </button>
            <button 
              className="rs-btn rs-btn-clear" 
              onClick={clearAll} 
              disabled={names.length === 0}
            >
              Clear
            </button>
          </div>
          
          <div className="rs-tags">
            {cleaned.map((n, i) => (
              <span 
                key={`${n}-${i}`} 
                className={`rs-tag${winner === n ? ' hit' : ''}`}
              >
                {n}
                <button 
                  className="rs-tag-x" 
                  onClick={() => removeName(i)} 
                  aria-label={`remove ${n}`}
                >
                  ×
                </button>
              </span>
            ))}
            {cleaned.length === 0 && (
              <span className="rs-empty-message">No names yet. Add some to get started!</span>
            )}
          </div>
          
          <div className="rs-cta">
            <button 
              className="rs-btn rs-btn-spin" 
              onClick={spin} 
              disabled={disabled}
            >
              {spinning ? 'Spinning…' : 'Spin the Wheel'}
            </button>
          </div>
        </div>
        
        <div className="rs-wheel-container">
          <div 
            className="rs-pointer" 
            aria-label={pointerLabel}
          />
          <div 
            className="rs-wheel" 
            style={{ 
              backgroundImage: wheelStyle, 
              transform: `rotate(${angle}deg)` 
            }}
          >
            {/* Clean wheel: no embedded labels, central cap only */}
          </div>
        </div>

        {/* Legend showing slice colors and names */}
        <div className="rs-legend">
          {cleaned.length === 0 && (
            <div className="rs-legend-empty muted">Add names to populate the legend.</div>
          )}
          {cleaned.map((n, i) => (
            <div key={`${n}-${i}`} className={`rs-legend-item${winner === n ? ' hit' : ''}`}>
              <span className="rs-swatch" style={{ backgroundColor: colorFor(n, i) }} />
              <span className="rs-name">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function easeOutCubic(t) { 
  return 1 - Math.pow(1 - t, 3); 
}

function buildWheelStyle(names, colorFor) {
  if (names.length === 0) return 'conic-gradient(var(--border), var(--border))';

  const step = 100 / names.length;
  const stops = names.map((_, i) => {
  const c = colorFor(names[i], i);
    const from = (i * step).toFixed(4);
    const to = ((i + 1) * step).toFixed(4);
    return `${c} ${from}% ${to}%`;
  });
  
  return `conic-gradient(${stops.join(',')})`;
}
