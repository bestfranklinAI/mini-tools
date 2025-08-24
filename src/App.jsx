import { useEffect, useState } from 'react'
import './styles/global.css'
import SearchBar from './components/SearchBar'
import ToolContainer from './components/ToolContainer'
import MacDock from './components/MacDock'
import ToolRegistry from './core/ToolRegistry'

function App() {
  const firstId = ToolRegistry.list()[0]?.id || null;
  const [toolId, setToolId] = useState(firstId)
  const [light, setLight] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'light';
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight;
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <div className="app-shell">
      <div className="topbar">
        <SearchBar onPick={setToolId} />
        <button className="btn toggle" onClick={() => setLight((v) => !v)}>{light ? 'Dark' : 'Light'}</button>
      </div>
      <div className="content">
        <ToolContainer toolId={toolId} />
      </div>
      <MacDock currentId={toolId} onPick={setToolId} />
    </div>
  )
}

export default App
