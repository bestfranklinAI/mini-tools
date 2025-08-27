import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import './randomSpin.css';

// Contract
// props: none; self-contained tool
// behavior: input names, add/remove; spin wheel; randomly select a name w/ pulse highlight

export default function RandomSpin() {
  const [input, setInput] = useState('');
  const [names, setNames] = useState(() => {
    // migrate from old key -> new namespaced key
    const NEW_KEY = 'tool:random-spin:names';
    const OLD_KEY = 'randomSpin:names';
    try {
      const rawNew = localStorage.getItem(NEW_KEY);
      if (rawNew) return JSON.parse(rawNew);
      const rawOld = localStorage.getItem(OLD_KEY);
      if (rawOld) return JSON.parse(rawOld);
    } catch {}
    return ['Alice', 'Bob', 'Charlie'];
  });
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [angle, setAngle] = useState(0);
  
  useEffect(() => {
    try { localStorage.setItem('tool:random-spin:names', JSON.stringify(names)); } catch {}
  }, [names]);
  
  const cleaned = useMemo(() =>
    names.filter((n) => n && n.trim()).map((n) => n.trim()),
    [names]
  );

  // Distinct, high-contrast palette with no repeats among current names
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const paletteSeed = useMemo(() => hashString(cleaned.join('|')), [cleaned]);
  const palette = useMemo(() => buildDistinctPalette(cleaned.length, paletteSeed, isLight), [cleaned.length, paletteSeed, isLight]);
  
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
  
  const wheelStyle = buildWheelStyleWithPalette(palette);
  const pointerLabel = spinning ? 'Spinning…' : (winner || 'Ready');
  
  return (
    <div className="tool randomspin">
      <ToolHeader title="Random Spin" subtitle="Add names, spin the wheel, pick a winner" />

  <div className="tool-content compact">
        <div className="tool-section">
          <div className="section-header">Add names</div>
          <div className="section-body">
            <div className="rs-input-row">
              <input
                className="input"
                placeholder="Type names, press Enter, or paste comma/newline separated"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="Name entry"
              />
              <button className="btn primary" onClick={addNamesFromInput} disabled={!input.trim()}>
                Add
              </button>
              <button className="btn danger" onClick={clearAll} disabled={names.length === 0}>
                Clear
              </button>
            </div>
            <div className="rs-chips" aria-live="polite">
              {cleaned.length === 0 ? (
                <span className="muted">No names yet. Add some to get started.</span>
              ) : (
                cleaned.map((n, i) => (
                  <span key={`${n}-${i}`} className={`chip${winner === n ? ' hit' : ''}`}>
                    {n}
                    <button className="chip-x" onClick={() => removeName(i)} aria-label={`Remove ${n}`}>
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="tool-section">
          <div className="section-header">Wheel</div>
          <div className="section-body">
            <div className="rs-grid">
              <div className="rs-wheel-col">
                <div className="rs-actions">
                  <button className="btn primary large" onClick={spin} disabled={disabled}>
                    {spinning ? 'Spinning…' : 'Spin'}
                  </button>
                  <div className="rs-winner" aria-live="polite">
                    {winner ? (
                      <span className={`badge ${pulse ? 'pulse' : ''}`}>Winner: {winner}</span>
                    ) : (
                      <span className="muted">{cleaned.length < 2 ? 'Add at least 2 names' : 'Ready'}</span>
                    )}
                  </div>
                </div>
                <div className="rs-wheel-container" role="img" aria-label="Selection wheel">
                  <div className="rs-pointer" aria-label={pointerLabel} />
                  <div
                    className="rs-wheel"
                    style={{ backgroundImage: wheelStyle, transform: `rotate(${angle}deg)` }}
                  />
                </div>
              </div>
              <div className="rs-legend-col">
                <div className="rs-legend">
                  {cleaned.length === 0 && (
                    <div className="muted">Legend will appear once you add names.</div>
                  )}
          {cleaned.map((n, i) => (
                    <div key={`${n}-${i}`} className={`rs-legend-item${winner === n ? ' hit' : ''}`}>
            <span className="rs-swatch" style={{ background: palette[i] }} />
                      <span className="rs-name">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function easeOutCubic(t) { 
  return 1 - Math.pow(1 - t, 3); 
}

function buildWheelStyleWithPalette(colors) {
  if (colors.length === 0) return 'conic-gradient(var(--border), var(--border))';
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => {
    const from = (i * step).toFixed(4);
    const to = ((i + 1) * step).toFixed(4);
    return `${c} ${from}% ${to}%`;
  });
  return `conic-gradient(${stops.join(',')})`;
}

function buildDistinctPalette(count, seed = 0, lightTheme = false) {
  const colors = [];
  if (count <= 0) return colors;
  const baseHue = ((seed % 360) + 360) % 360;
  const saturation = 70; // modern, not neon
  const lightness = lightTheme ? 58 : 64; // lighter for dark theme
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 360 / count)) % 360;
    colors.push(`hsl(${hue} ${saturation}% ${lightness}%)`);
  }
  // small dither for very large sets to avoid neighbors being too similar
  if (count > 10) {
    for (let i = 0; i < count; i++) {
      const jitter = (i % 2 === 0) ? (lightTheme ? -2 : 2) : 0;
      const [h, s, l] = parseHsl(colors[i]);
      colors[i] = `hsl(${h} ${s}% ${Math.max(40, Math.min(72, l + jitter))}%)`;
    }
  }
  return colors;
}

function parseHsl(str) {
  const m = str.match(/hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/);
  if (!m) return [0, 0, 0];
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
