import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Sun, Moon } from 'lucide-react'
import './styles/global.css'
import SearchBar from './components/SearchBar'
import SettingsModal from './components/SettingsModal'
import ToolContainer from './components/ToolContainer'
import MacDock from './components/MacDock'
import ToolRegistry from './core/ToolRegistry'

function App() {
  const list = ToolRegistry.list();
  const preferred = list.find(t => t.id === 'clock')?.id || list[0]?.id || null;
  const [toolId, setToolId] = useState(preferred)
  const [light, setLight] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'light';
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight;
  })
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <div className="app-shell">
      <div className="topbar">
        <SearchBar onPick={setToolId} />
        <div className="topbar-actions">
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)} aria-label="Settings">
            <SettingsIcon size={18} />
          </button>
          <button className="icon-btn" onClick={() => setLight((v) => !v)} aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>
      <div className="content">
        <ToolContainer toolId={toolId} />
      </div>
      <MacDock currentId={toolId} onPick={setToolId} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

export default App
