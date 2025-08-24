import { useMemo, useRef, useState } from 'react';
import ToolRegistry from '../core/ToolRegistry';

export default function MacDock({ currentId, onPick }) {
  const tools = useMemo(() => ToolRegistry.list(), []);
  const ref = useRef(null);
  const itemRefs = useRef([]);
  const [mouseX, setMouseX] = useState(null);
  const [bouncing, setBouncing] = useState(null);

  const onMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMouseX(e.clientX - rect.left);
  };

  const onMouseLeave = () => setMouseX(null);

  const handleClick = (id) => {
    setBouncing(id);
    onPick(id);
    setTimeout(() => setBouncing(null), 380);
  };

  return (
    <div className="dock-wrap">
      <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className="dock">
        {(() => {
          // Discrete, tiered magnification: hovered is biggest; immediate neighbors slightly smaller; then normal
          const base = 48; // fixed box size (we scale with transform to avoid reflow)
          let hoverIdx = null;
          if (mouseX != null && ref.current) {
            const containerRect = ref.current.getBoundingClientRect();
            let best = { d: Infinity, i: null };
            tools.forEach((_, i) => {
              const el = itemRefs.current[i];
              const elRect = el?.getBoundingClientRect();
              const center = elRect ? (elRect.left - containerRect.left) + elRect.width / 2 : (i + 0.5) * (base + 12);
              const d = Math.abs(mouseX - center);
              if (d < best.d) best = { d, i };
            });
            hoverIdx = best.i;
          }

          const scaleByTier = [1.2, 1.1, 1.05];
          const liftByTier = [16, 9, 4];

          return tools.map((t, idx) => {
            const tier = hoverIdx == null ? Infinity : Math.abs(idx - hoverIdx);
            const scale = tier === Infinity ? 1 : (scaleByTier[tier] ?? 1);
            const lift = tier === Infinity ? 0 : (liftByTier[tier] ?? 0);
            const active = currentId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleClick(t.id)}
                className={`dock-item${active ? ' active' : ''}${bouncing === t.id ? ' bounce' : ''}`}
                ref={(el) => (itemRefs.current[idx] = el)}
                style={{ width: base, height: base, transform: `translateY(${-lift}px) scale(${scale})`, zIndex: Math.round(100 + (3 - Math.min(tier, 3)) * 10) }}
                title={t.name}
              >
                {/* icon path relative to tool dir */}
                <ToolIcon dir={t.dir} iconPath={t.icon} size={Math.max(22, base - 22)} />
                {active ? <span className="dock-indicator" /> : null}
              </button>
            );
          });
        })()}
      </div>
    </div>
  );
}

function ToolIcon({ dir, iconPath, size }) {
  // Leverage Vite to resolve asset at build time using dynamic import of assets
  // Build the absolute (aliased) path for the icon inside tool dir
  const rel = `${dir}/${iconPath}`.replace(/^\.\//, '');
  const modules = import.meta.glob('../tools/*/assets/*.svg', { eager: true, query: '?url', import: 'default' });
  const url = modules[rel];
  if (!url) return <div style={{ width: size, height: size, background: 'var(--border)', borderRadius: 8 }} />;
  return <img src={url} alt="" width={size} height={size} style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 6px var(--shadow))' }} />;
}
