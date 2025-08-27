import React, { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import './pomodoro.css';

function usePref(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function formatMMSS(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const Phases = { Focus: 'focus', Short: 'short', Long: 'long' };

export default function Pomodoro() {
  const [focusMin, setFocusMin] = usePref('pomo-focus', 25);
  const [shortMin, setShortMin] = usePref('pomo-short', 5);
  const [longMin, setLongMin] = usePref('pomo-long', 15);
  const [cyclesUntilLong, setCyclesUntilLong] = usePref('pomo-cycles-long', 4);
  const [autoStart, setAutoStart] = usePref('pomo-auto', true);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = usePref('pomo-phase', Phases.Focus);
  const [cycleCount, setCycleCount] = usePref('pomo-cycle-count', 0);

  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef(0);
  const audioCtxRef = useRef(null);
  function beep(duration = 0.2, freq = 660) {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      const now = ctx.currentTime; const total = duration;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + total);
      o.start(now); o.stop(now + total + 0.02);
    } catch {}
  }

  const phaseMs = useMemo(() => {
    if (phase === Phases.Focus) return focusMin * 60 * 1000;
    if (phase === Phases.Short) return shortMin * 60 * 1000;
    return longMin * 60 * 1000;
  }, [phase, focusMin, shortMin, longMin]);

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

  const progress = Math.max(0, Math.min(1, 1 - (elapsed / (phaseMs || 1))));
  const timeLeft = phaseMs - elapsed;
  const label = phase === Phases.Focus ? 'Focus' : (phase === Phases.Short ? 'Short Break' : 'Long Break');

  // Phase transitions
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      beep(0.22, phase === Phases.Focus ? 720 : 520);
      if (phase === Phases.Focus) {
        const nextCycle = cycleCount + 1;
        setCycleCount(nextCycle);
        // decide break type
        const nextPhase = nextCycle % cyclesUntilLong === 0 ? Phases.Long : Phases.Short;
        setPhase(nextPhase);
        setElapsed(0); setStartTime(performance.now()); setRunning(autoStart);
      } else {
        // go to focus
        setPhase(Phases.Focus);
        setElapsed(0); setStartTime(performance.now()); setRunning(autoStart);
      }
    }
  }, [timeLeft, running, phase, autoStart, cycleCount, cyclesUntilLong]);

  function start() { setStartTime(performance.now() - elapsed); setRunning(true); }
  function pause() { setRunning(false); }
  function resetPhase() { setRunning(false); setElapsed(0); }
  function skip() { setElapsed(phaseMs + 1); setRunning(true); }

  // Hue by phase
  const hue = phase === Phases.Focus ? 10 : (phase === Phases.Short ? 160 : 220);

  return (
    <div className="pomo-tool" style={{
      background: `radial-gradient(1100px 700px at 20% 10%, color-mix(in oklab, var(--accent) 12%, transparent), transparent), linear-gradient(120deg, hsl(${(hue)%360} 70% 50% / 0.10), hsl(${(hue+80)%360} 70% 55% / 0.12))`
    }}>
      <div className="pomo-inner">
        <ToolHeader title="Pomodoro" subtitle="Focus cycles with short/long breaks" />
        <div className="pomo-top">
          <div className="phase-label">
            <span className={`dot ${phase}`}></span>
            <span>{label}</span>
          </div>
          <div className="phase-controls">
            <button className="chip" onClick={()=>{ setPhase(Phases.Focus); resetPhase(); }}>Focus</button>
            <button className="chip" onClick={()=>{ setPhase(Phases.Short); resetPhase(); }}>Short</button>
            <button className="chip" onClick={()=>{ setPhase(Phases.Long); resetPhase(); }}>Long</button>
          </div>
        </div>

        <div className="pomo-display">
          <ProgressRing progress={progress} phase={phase} />
          <div className="time-main"><span className="time-text">{formatMMSS(timeLeft)}</span></div>
        </div>

        <div className="pomo-actions">
          {!running ? (
            <button className="btn primary" onClick={start}>Start</button>
          ) : (
            <button className="btn warning" onClick={pause}>Pause</button>
          )}
          <button className="btn" onClick={resetPhase}>Reset</button>
          <button className="btn" onClick={skip}>Skip</button>
        </div>

        <div className="tool-section">
          <div className="section-header">Settings</div>
          <div className="section-body">
            <div className="pomo-settings">
              <Setting label="Focus" value={focusMin} setValue={setFocusMin} min={1} max={180} suffix="m" />
              <Setting label="Short" value={shortMin} setValue={setShortMin} min={1} max={60} suffix="m" />
              <Setting label="Long" value={longMin} setValue={setLongMin} min={5} max={120} suffix="m" />
              <Setting label="Cycles→Long" value={cyclesUntilLong} setValue={setCyclesUntilLong} min={2} max={12} />
              <label className="switch sm">
                <input type="checkbox" checked={autoStart} onChange={(e)=>{ setAutoStart(e.target.checked); }} />
                <span>Auto start next</span>
              </label>
            </div>
          </div>
        </div>
      </div>
  {/* sound via WebAudio */}
    </div>
  );
}

function Setting({ label, value, setValue, min, max, suffix }) {
  const [local, setLocal] = useState(value);
  useEffect(()=>setLocal(value), [value]);
  function commit(v){ if(Number.isNaN(v)) return; const c = Math.min(max, Math.max(min, v)); setValue(c); }
  return (
    <label className="setting">
      <span>{label}</span>
      <input type="number" value={local} min={min} max={max}
        onChange={(e)=>setLocal(parseInt(e.target.value || '0',10))}
        onBlur={()=>commit(local)}
        onKeyDown={(e)=>{ if(e.key==='Enter'){ e.currentTarget.blur(); } }} />
      {suffix ? <em>{suffix}</em> : null}
    </label>
  );
}

function ProgressRing({ progress, phase }) {
  const size = 380; const stroke = 8; const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  const dash = Math.max(0.0001, c * progress);
  const color = phase === 'focus' ? 'var(--accent)' : (phase === 'short' ? 'var(--accent-2)' : 'color-mix(in oklab, var(--accent-2) 80%, var(--accent))');
  return (
    <svg className="ring" width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color}
        strokeWidth={stroke} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" fill="none"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}
