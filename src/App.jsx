import { useEffect, useRef, useState } from 'react'
import { Settings as SettingsIcon, Sun, Moon, Home as HomeIcon } from 'lucide-react'
import './styles/global.css'
import SearchBar from './components/SearchBar'
import CommandPalette from './components/CommandPalette'
import SettingsModal from './components/SettingsModal'
import ToolContainer from './components/ToolContainer'
import MacDock from './components/MacDock'
import Toasts from './components/Toasts'
import ToolRegistry from './core/ToolRegistry'
import Settings from './core/Settings'
import HomeGrid from './components/HomeGrid'

function App() {
  const list = ToolRegistry.list();
  const preferred = list.find(t => t.id === 'clock')?.id || list[0]?.id || null;
  const initialUi = Settings.getUI();
  const initialTool = initialUi.startup === 'home' ? null : (localStorage.getItem('lastToolId') || preferred);
  const [toolId, setToolId] = useState(initialTool)
  const [ui, setUi] = useState(Settings.getUI());
  const [light, setLight] = useState(() => {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const t = ui.theme;
    return t === 'light' || (t === 'system' && prefersLight);
  })
  const [showSettings, setShowSettings] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const forceLight = ui.theme === 'light' || (ui.theme === 'system' && prefersLight);
    document.documentElement.classList.toggle('light', forceLight);
    document.documentElement.dataset.density = ui.density || 'comfortable';
    document.documentElement.style.setProperty('scroll-behavior', ui.reduceMotion ? 'auto' : 'smooth');
    localStorage.setItem('theme', forceLight ? 'light' : 'dark');
    setLight(forceLight);
  }, [ui]);

  // React to settings changes
  useEffect(() => {
    const prevStartupRef = { current: Settings.getUI().startup };
    const off = Settings.onChange((s) => {
      setUi(s.ui);
      const prev = prevStartupRef.current;
      if (prev !== s.ui.startup && s.ui.startup === 'home') {
        setToolId(null);
      }
      prevStartupRef.current = s.ui.startup;
    });
    return off;
  }, []);
  // persist last used tool + record usage
  useEffect(() => {
    if (toolId) {
      localStorage.setItem('lastToolId', toolId);
      Settings.recordUsage(toolId);
    }
  }, [toolId]);

  // Global Cmd/Ctrl+K to open command palette
  useEffect(() => {
    const onKey = (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <div className="topbar">
        <button
          className={`icon-btn${toolId == null ? ' active' : ''}`}
          title="Home"
          aria-label="Home"
          onClick={() => setToolId(null)}
        >
          <HomeIcon size={18} />
        </button>
        <SearchBar onPick={setToolId} />
        <div className="topbar-actions">
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)} aria-label="Settings">
            <SettingsIcon size={18} />
          </button>
          <button className="icon-btn" onClick={() => {
            const next = ui.theme === 'light' ? 'dark' : 'light';
            Settings.setUI({ theme: next });
          }} aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
      <div className="content">
        {toolId != null ? <ToolContainer toolId={toolId} /> : <div className="tool-stage"><HomeGrid onPick={setToolId} /></div>}
      </div>
      <MacDock currentId={toolId} onPick={setToolId} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
  <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onPick={setToolId} />
  <Toasts />
    </div>
  )
}

export default App
