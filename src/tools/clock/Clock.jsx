import React, { useEffect, useMemo, useRef, useState } from 'react';
import './clock.css';

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

function pad(n) { return n.toString().padStart(2, '0'); }

function formatTime(date, opts) {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  if (opts.twentyFour) {
    return {
      main: `${pad(h)}:${pad(m)}`,
      seconds: pad(s),
      suffix: ''
    };
  } else {
    const am = h < 12;
    const hr = h % 12 || 12;
    return {
      main: `${pad(hr)}:${pad(m)}`,
      seconds: pad(s),
      suffix: am ? 'AM' : 'PM'
    };
  }
}

function formatDate(date, locale) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return fmt.format(date);
}

function usePref(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

export default function Clock() {
  const now = useNow(1000);
  const [twentyFour, setTwentyFour] = usePref('clock-24h', true);
  const [showSeconds, setShowSeconds] = usePref('clock-seconds', true);
  const [floating, setFloating] = usePref('clock-floating', true);

  const time = useMemo(() => formatTime(now, { twentyFour }), [now, twentyFour]);
  const dateStr = useMemo(() => formatDate(now, navigator.language || 'en-US'), [now]);

  // animated background hue shift
  const hue = (now.getHours() * 60 + now.getMinutes()) / (24 * 60) * 360; // day cycle

  // seconds progress for ring
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const progress = seconds / 60; // 0..1

  return (
    <div className={`clock-tool ${floating ? 'floating' : ''}`} style={{
      background: `radial-gradient(1200px 800px at 20% 10%, color-mix(in oklab, var(--accent) 15%, transparent), transparent), linear-gradient(120deg, hsl(${(hue+20)%360} 70% 55% / 0.12), hsl(${(hue+140)%360} 70% 50% / 0.10))`
    }}>
      <ParticleField active={floating} hue={hue} />
      <div className="clock-inner">
  <div className="time-wrap">
          <div className="time-main" aria-label="current time">
            <span className="time-text">{time.main}</span>
            {showSeconds && <span className="time-sec">{time.seconds}</span>}
            {!twentyFour && <span className="time-suffix">{time.suffix}</span>}
          </div>
        </div>
        <div className="date-row" aria-label="current date">{dateStr}</div>

        <div className="controls">
          <label className="switch">
            <input type="checkbox" checked={twentyFour} onChange={(e) => setTwentyFour(e.target.checked)} />
            <span>24h</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={showSeconds} onChange={(e) => setShowSeconds(e.target.checked)} />
            <span>Seconds</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={floating} onChange={(e) => setFloating(e.target.checked)} />
            <span>Motion</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function ParticleField({ active, hue }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let particles = Array.from({ length: 40 }, () => spawn(canvas));

    function spawn(c) {
      const speed = 0.2 + Math.random() * 0.6;
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: 1 + Math.random() * 2,
        a: 0.05 + Math.random() * 0.2,
      };
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = canvas.width + 10; if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10; if (p.y > canvas.height + 10) p.y = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [active, hue]);

  return <canvas ref={ref} className="particles" aria-hidden="true" />;
}
