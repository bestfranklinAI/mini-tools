import { useCallback, useEffect, useState } from 'react';
import { motion as FM, AnimatePresence } from 'framer-motion';
import Settings from '../core/Settings';

export default function SettingsModal({ open, onClose }) {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [theme, setTheme] = useState('system');
  const [density, setDensity] = useState('comfortable');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [startup, setStartup] = useState('last');

  useEffect(() => {
    if (open) {
      const llm = Settings.getLLM();
  const ui = Settings.getUI();
      setEndpoint(llm.endpoint || '');
      setApiKey(llm.apiKey || '');
      setModel(llm.model || 'gpt-4o-mini');
      setTemperature(Number.isFinite(llm.temperature) ? llm.temperature : 0.7);
  setTheme(ui.theme || 'system');
  setDensity(ui.density || 'comfortable');
  setReduceMotion(!!ui.reduceMotion);
  setStartup(ui.startup || 'last');
    }
  }, [open]);

  const save = useCallback(() => {
    Settings.setLLM({ endpoint: endpoint.trim(), apiKey: apiKey.trim(), model: model.trim() || 'gpt-4o-mini', temperature: Number(temperature) });
  Settings.setUI({ theme, density, reduceMotion, startup });
    onClose?.();
  }, [endpoint, apiKey, model, temperature, theme, density, reduceMotion, startup, onClose]);

  // Save on cmd/ctrl+Enter for convenience
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, endpoint, apiKey, model, temperature, onClose, save]);

  return (
    <AnimatePresence>
      {open && (
        <FM.div className="modal-backdrop" onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FM.div className="modal" onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <div className="modal-header">
              <h3>Settings</h3>
            </div>
            <div className="modal-body">
          <section>
            <h4>LLM Connection</h4>
            <label className="form-label">Server Endpoint (OpenAI-compatible)</label>
            <input className="form-input" type="text" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
            <label className="form-label">API Key</label>
            <input className="form-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
            <div className="row">
              <div className="col">
                <label className="form-label">Model</label>
                <input className="form-input" type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />
              </div>
              <div className="col">
                <label className="form-label">Temperature</label>
                <input className="form-input" type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
            </div>
            <p className="muted" style={{ marginTop: 6 }}>
              Your settings are stored locally in your browser and persist across sessions.
            </p>
          </section>
          <section style={{ marginTop: 16 }}>
            <h4>Appearance & Behavior</h4>
            <div className="row">
              <div className="col">
                <label className="form-label">Theme</label>
                <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="col">
                <label className="form-label">Density</label>
                <select className="form-input" value={density} onChange={(e) => setDensity(e.target.value)}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <label className="form-label">Motion</label>
                <label className="switch"><input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} /><span>Reduce motion</span></label>
              </div>
              <div className="col">
                <label className="form-label">Startup</label>
                <select className="form-input" value={startup} onChange={(e) => setStartup(e.target.value)}>
                  <option value="last">Open last tool</option>
                  <option value="home">Open Home</option>
                </select>
              </div>
            </div>
          </section>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn primary" onClick={save}>Save</button>
            </div>
          </FM.div>
        </FM.div>
      )}
    </AnimatePresence>
  );
}
