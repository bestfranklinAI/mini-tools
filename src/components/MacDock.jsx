import { useEffect, useRef, useState } from 'react';
import { Home as HomeIcon } from 'lucide-react';
import ToolRegistry from '../core/ToolRegistry';
import Settings from '../core/Settings';

export default function MacDock({ currentId, onPick }) {
  const [limit, setLimit] = useState(15);
  const [dockTools, setDockTools] = useState([]);
  const ref = useRef(null);
  const itemRefs = useRef([]);
  const [mouseX, setMouseX] = useState(null);
  const [bouncing, setBouncing] = useState(null);

  // Responsive limit
  useEffect(() => {
    const updateLimit = () => {
      setLimit(window.innerWidth < 640 ? 5 : 15);
    };
    updateLimit();
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, []);

  // Sync dock items with Settings (Recents + Favorites)
  useEffect(() => {
    const updateItems = () => {
      const { recents = [], favorites = [] } = Settings.getUI();
      const all = ToolRegistry.list();
      
      // Build list prioritizing: Favorites first, then most recent tools
      const seen = new Set();
      const items = [];
      
      // Add favorites first (respecting limit)
      for (const favId of favorites) {
        if (items.length >= limit) break;
        const tool = all.find(t => t.id === favId);
        if (tool && !seen.has(favId)) {
          items.push(tool);
          seen.add(favId);
        }
      }
      
      // Fill remaining slots with recent tools (sorted by most recent)
      const sortedRecents = [...recents].sort((a, b) => b.lastUsed - a.lastUsed);
      for (const r of sortedRecents) {
        if (items.length >= limit) break;
        if (!seen.has(r.id)) {
          const tool = all.find(t => t.id === r.id);
          if (tool) {
            items.push(tool);
            seen.add(r.id);
          }
        }
      }
      
      // If empty, seed with first few available tools to avoid empty dock
      if (items.length === 0) {
        const seedLimit = Math.min(4, limit);
        for (let i = 0; i < seedLimit && i < all.length; i++) {
          items.push(all[i]);
        }
      }

      setDockTools(items);
    };

    updateItems(); // Initial load
    return Settings.onChange(updateItems); // Listen for usage updates
  }, [limit]);

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
        {(
          <button
            className={`dock-item${currentId == null ? ' active' : ''}`}
            style={{ width: 48, height: 48, display: 'grid', placeItems: 'center' }}
            title="Home"
            aria-label="Go to Home"
            onClick={() => onPick(null)}
          >
            <HomeIcon size={26} className="dock-icon" aria-hidden="true" />
            {currentId == null ? <span className="dock-indicator" /> : null}
          </button>
        )}
        {(() => {
          // Discrete, tiered magnification: hovered is biggest; immediate neighbors slightly smaller; then normal
          const base = 48; // fixed box size (we scale with transform to avoid reflow)
          let hoverIdx = null;
          if (mouseX != null && ref.current) {
            const containerRect = ref.current.getBoundingClientRect();
            let best = { d: Infinity, i: null };
            dockTools.forEach((_, i) => {
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

          return dockTools.map((t, idx) => {
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
                aria-label={`Open ${t.name}`}
                onMouseEnter={() => { try { ToolRegistry.getImporter(t.id)?.(); } catch { /* ignore */ } }}
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
  return <img className="dock-icon" src={url} alt="" width={size} height={size} style={{ objectFit: 'contain' }} />;
}
