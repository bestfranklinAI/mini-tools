import ToolRegistry from '../core/ToolRegistry';
import Settings from '../core/Settings';

export default function HomeGrid({ onPick }) {
  const tools = ToolRegistry.list();
  const { favorites = [] } = Settings.getUI();
  const byId = new Map(tools.map(t => [t.id, t]));
  const favTools = favorites.map(id => byId.get(id)).filter(Boolean);

  return (
    <div className="home-grid">
      {favTools.length > 0 && (
        <section>
          <h3>Favorites</h3>
          <ToolGrid items={favTools} onPick={onPick} />
        </section>
      )}
      <section>
        <h3>All Tools</h3>
        <ToolGrid items={tools} onPick={onPick} />
      </section>
    </div>
  );
}

function ToolGrid({ items, onPick }) {
  return (
    <div className="tool-card-grid">
      {items.map((t) => (
        <div
          key={t.id}
          className="tool-card"
          role="button"
          tabIndex={0}
          onClick={() => { Settings.recordUsage(t.id); onPick?.(t.id); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              Settings.recordUsage(t.id);
              onPick?.(t.id);
            }
          }}
          onMouseEnter={() => { try { t.importer?.(); } catch {} }}
          title={t.name}
        >
          <ToolIcon dir={t.dir} iconPath={t.icon} />
          <div className="title">{t.name}</div>
          <div className="desc">{t.description}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <FavButton id={t.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolIcon({ dir, iconPath }) {
  const rel = `${dir}/${iconPath}`.replace(/^\.\//, '');
  const modules = import.meta.glob('../tools/*/assets/*.svg', { eager: true, query: '?url', import: 'default' });
  const url = modules[rel];
  return (
    <div className="icon-wrap">
  {url ? <img className="dock-icon" src={url} alt="" width={36} height={36} /> : <span style={{ width: 36, height: 36 }} />}
    </div>
  );
}

function FavButton({ id }) {
  const fav = Settings.isFavorite(id);
  return (
    <button className="btn" onClick={(e) => { e.stopPropagation(); Settings.toggleFavorite(id); }} aria-pressed={fav}>
      {fav ? '★ Favorited' : '☆ Favorite'}
    </button>
  );
}
