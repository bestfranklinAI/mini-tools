import React, { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import './timer.css';

function usePref(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function formatHMS(ms) {
  const sign = ms < 0 ? '-' : '';
  const t = Math.abs(ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return { main: `${h > 0 ? `${pad(h)}:` : ''}${pad(m)}:${pad(s)}`, h, m, s, sign };
}

export default function Timer() {
  // mode: 'down' | 'up'
  const [mode, setMode] = usePref('timer-mode', 'down');
  const [targetMs, setTargetMs] = usePref('timer-target', 5 * 60 * 1000);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [ding, setDing] = usePref('timer-sound', true);
  const [loop, setLoop] = usePref('timer-loop', false);

  const rafRef = useRef(0);
  const audioCtxRef = useRef(null);
  function beep(duration = 0.25, freq = 880) {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.start(now); o.stop(now + duration + 0.02);
    } catch {}
  }

  const msLeft = useMemo(() => {
    if (mode === 'up') return elapsed; // elapsed grows upward
    const remaining = targetMs - elapsed;
    return remaining;
  }, [elapsed, targetMs, mode]);

  const time = useMemo(() => formatHMS(mode === 'up' ? elapsed : Math.max(msLeft, 0)), [msLeft, elapsed, mode]);

  useEffect(() => {
    if (!running) return;
    function tick() {
      const now = performance.now();
      setElapsed(now - startTime);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, startTime]);

  // fire alarm when countdown hits zero
  const didAlarm = useRef(false);
  useEffect(() => {
    if (mode === 'down' && running) {
      if (msLeft <= 0 && !didAlarm.current) {
        didAlarm.current = true;
  if (ding) beep();
        if (loop) {
          // restart cycle
          const now = performance.now();
          setStartTime(now);
          setElapsed(0);
          didAlarm.current = false;
        } else {
          setRunning(false);
        }
      } else if (msLeft > 0) {
        didAlarm.current = false;
      }
    }
  }, [msLeft, mode, running, ding, loop]);

  function start() {
    setStartTime(performance.now() - elapsed);
    setRunning(true);
  }
  function pause() { setRunning(false); }
  function reset() { setRunning(false); setElapsed(0); }

  function setPreset(mins) {
    setTargetMs(mins * 60 * 1000);
    setElapsed(0);
    setRunning(false);
  }

  const progress = useMemo(() => {
    if (mode === 'up') return (elapsed % (targetMs || 1)) / (targetMs || 1);
    return Math.max(0, Math.min(1, 1 - (elapsed / (targetMs || 1))));
  }, [elapsed, targetMs, mode]);

  const hue = 200 + progress * 140; // blue to green sweep

  return (
    <div className="timer-tool" style={{
      background: `radial-gradient(1100px 700px at 20% 10%, color-mix(in oklab, var(--accent) 12%, transparent), transparent), linear-gradient(120deg, hsl(${(hue)%360} 70% 50% / 0.10), hsl(${(hue+120)%360} 70% 55% / 0.12))`
    }}>
      <div className="timer-inner">
        <ToolHeader title="Timer" subtitle="Count up or down with presets" />
        <div className="timer-header">
          <div className="mode-toggle" role="tablist" aria-label="Timer mode">
            <button className={`chip ${mode==='down'?'active':''}`} onClick={() => { setMode('down'); reset(); }}>Count Down</button>
            <button className={`chip ${mode==='up'?'active':''}`} onClick={() => { setMode('up'); reset(); }}>Count Up</button>
          </div>
          <div className="options"></div>
        </div>
        <div className="tool-section">
          <div className="section-header">Options</div>
          <div className="section-body" style={{ display: 'flex', gap: 12 }}>
            <label className="switch sm">
              <input type="checkbox" checked={ding} onChange={(e)=>setDing(e.target.checked)} />
              <span>Sound</span>
            </label>
            <label className="switch sm">
              <input type="checkbox" checked={loop} onChange={(e)=>setLoop(e.target.checked)} />
              <span>Loop</span>
            </label>
          </div>
        </div>

        <div className="timer-display">
          <ProgressRing progress={progress} />
          <div className="time-main">
            <span className="time-text">{time.main}</span>
          </div>
        </div>

        <div className="timer-controls">
          <div className="tool-section">
            <div className="section-header">Presets & Custom</div>
            <div className="section-body">
              <div className="presets">
                {[1, 5, 10, 15, 25].map((m) => (
                  <button key={m} className="chip" onClick={() => setPreset(m)}>{m}m</button>
                ))}
                <CustomInput targetMs={targetMs} setTargetMs={setTargetMs} disabled={mode==='up'} />
              </div>
            </div>
          </div>
          <div className="actions">
            {!running ? (
              <button className="btn primary" onClick={start}>Start</button>
            ) : (
              <button className="btn warning" onClick={pause}>Pause</button>
            )}
            <button className="btn" onClick={reset}>Reset</button>
          </div>
        </div>
      </div>
  {/* sound via WebAudio */}
    </div>
  );
}

function CustomInput({ targetMs, setTargetMs, disabled }) {
  const h = Math.floor(targetMs / 3600000);
  const m = Math.floor((targetMs % 3600000) / 60000);
  const s = Math.floor((targetMs % 60000) / 1000);
  function update(next) { setTargetMs((next.h * 3600 + next.m * 60 + next.s) * 1000); }
  return (
    <div className="custom-input" aria-label="custom time">
      <NumberInput label="h" value={h} min={0} max={23} onChange={(v)=>update({ h: v, m, s })} disabled={disabled} />
      <NumberInput label="m" value={m} min={0} max={59} onChange={(v)=>update({ h, m: v, s })} disabled={disabled} />
      <NumberInput label="s" value={s} min={0} max={59} onChange={(v)=>update({ h, m, s: v })} disabled={disabled} />
    </div>
  );
}

function NumberInput({ label, value, min, max, onChange, disabled }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  function commit(val) {
    if (Number.isNaN(val)) return;
    const clamped = Math.min(max, Math.max(min, val));
    onChange(clamped);
  }
  return (
    <label className={`num ${disabled?'disabled':''}`}>
      <span>{label}</span>
      <input type="number" value={local} min={min} max={max}
        disabled={disabled}
        onChange={(e)=>setLocal(parseInt(e.target.value || '0', 10))}
        onBlur={()=>commit(local)}
        onKeyDown={(e)=>{ if(e.key==='Enter'){ e.currentTarget.blur(); } }} />
    </label>
  );
}

function ProgressRing({ progress }) {
  const size = 380; const stroke = 8; const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const dash = Math.max(0.0001, c * progress);
  return (
    <svg className="ring" width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
  <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
  <circle cx={size/2} cy={size/2} r={r} stroke="url(#grad2)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" fill="none"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}
