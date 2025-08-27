import './apiTester.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function tryPrettify(body, contentType) {
  if (!body) return '';
  const ct = (contentType || '').toLowerCase();
  // JSON pretty
  if (ct.includes('application/json')) {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  }
  // XML-ish formatting could be added; for now return as-is
  return body;
}

function parseHeaders(input) {
  // input: string lines "Key: Value" -> array of [k,v]
  const lines = (input || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

function headersToText(headersObj) {
  return Object.entries(headersObj || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export default function APITester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [authType, setAuthType] = useState('none'); // none | bearer | basic
  const [token, setToken] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [headersText, setHeadersText] = useState(() => headersToText({ 'Content-Type': 'application/json' }));
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null); // { ok, status, statusText, timeMs, headers:{}, bodyRaw, bodyPretty, type }
  const abortRef = useRef(null);

  // Persist minimal state between reloads
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('api:test:state') || 'null');
      if (saved) {
        setMethod(saved.method || 'GET');
        setUrl(saved.url || '');
        setAuthType(saved.authType || 'none');
        setToken(saved.token || '');
        setBasicUser(saved.basicUser || '');
        setBasicPass(saved.basicPass || '');
        setHeadersText(saved.headersText || '');
        setBody(saved.body || '');
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('api:test:state', JSON.stringify({ method, url, authType, token, basicUser, basicPass, headersText, body }));
    } catch {}
  }, [method, url, authType, token, basicUser, basicPass, headersText, body]);

  const headersObj = useMemo(() => parseHeaders(headersText), [headersText]);

  const doSend = async () => {
    if (!url) return;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setResp(null);
    const reqHeaders = { ...headersObj };
    if (authType === 'bearer' && token) reqHeaders['Authorization'] = `Bearer ${token}`;
    if (authType === 'basic' && (basicUser || basicPass)) {
      const cred = btoa(`${basicUser}:${basicPass}`);
      reqHeaders['Authorization'] = `Basic ${cred}`;
    }

    // For GET/HEAD, ignore body
    const hasBody = !['GET', 'HEAD'].includes(method);
    let bodyToSend = undefined;
    if (hasBody && body) {
      const ct = (reqHeaders['Content-Type'] || reqHeaders['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) bodyToSend = body; // assume already JSON string
      else if (ct.includes('application/x-www-form-urlencoded')) bodyToSend = body; // raw
      else bodyToSend = body; // send as-is
    }

    const started = performance.now();
    let res, text, timeMs = 0;
    try {
      res = await fetch(url, { method, headers: reqHeaders, body: bodyToSend, signal: controller.signal });
      timeMs = Math.round(performance.now() - started);
      // Try best-effort text
      text = await res.text();
      const headers = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      const bodyPretty = tryPrettify(text, headers['content-type']);
      setResp({ ok: res.ok, status: res.status, statusText: res.statusText, timeMs, headers, bodyRaw: text, bodyPretty, type: headers['content-type'] || '' });
    } catch (err) {
      timeMs = Math.round(performance.now() - started);
      setResp({ ok: false, status: 0, statusText: String(err?.name || 'Error'), timeMs, headers: {}, bodyRaw: String(err?.message || err), bodyPretty: String(err?.message || err), type: '' });
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  };

  const statusBadgeClass = (resp && resp.status) ? (resp.status >= 200 && resp.status < 300 ? 'ok' : resp.status >= 400 ? 'err' : 'warn') : 'idle';

  const [view, setView] = useState('pretty'); // pretty | raw | headers

  return (
    <div className="tool api-wrap">
      <ToolHeader title="API Tester" subtitle="Send HTTP requests quickly" />
      <div className="api-toolbar">
        <div className="left">
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="api-method">
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="api-url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/path" />
          <button className="btn primary" onClick={doSend} disabled={loading}>{loading ? 'Sending…' : 'Send'}</button>
          {loading && <button className="btn" onClick={cancel}>Cancel</button>}
        </div>
        <div className="right">
          <strong>Quick API Test</strong>
        </div>
      </div>

      <div className="api-panels">
        <div className="api-panel">
          <div className="api-section">
            <label className="api-label">Auth</label>
            <div className="api-auth">
              <select value={authType} onChange={(e) => setAuthType(e.target.value)}>
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>
              {authType === 'bearer' && (
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token" />
              )}
              {authType === 'basic' && (
                <>
                  <input type="text" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} placeholder="Username" />
                  <input type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} placeholder="Password" />
                </>
              )}
            </div>
          </div>

          <div className="api-section">
            <label className="api-label">Headers</label>
            <textarea className="api-headers" value={headersText} onChange={(e) => setHeadersText(e.target.value)} placeholder="Key: Value\nContent-Type: application/json" />
          </div>

          {!['GET', 'HEAD'].includes(method) && (
            <div className="api-section">
              <label className="api-label">Body</label>
              <textarea className="api-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder='{"hello":"world"}' />
            </div>
          )}
        </div>

        <div className="api-panel">
          <div className="api-result-toolbar">
            <div className={`status-badge ${statusBadgeClass}`}>
              {resp ? `${resp.status || 0} ${resp.statusText || ''}` : '—'}
            </div>
            <div className="muted">{resp ? `${resp.timeMs} ms` : ''}</div>
            <div className="spacer" />
            <div className="seg">
              <button className={view==='pretty'? 'seg-btn active':'seg-btn'} onClick={() => setView('pretty')}>Pretty</button>
              <button className={view==='raw'? 'seg-btn active':'seg-btn'} onClick={() => setView('raw')}>Raw</button>
              <button className={view==='headers'? 'seg-btn active':'seg-btn'} onClick={() => setView('headers')}>Headers</button>
            </div>
          </div>
          <div className="api-result">
            {!resp ? (
              <div className="muted" style={{ padding: 12 }}>No response yet. Send a request to see results.</div>
            ) : view === 'headers' ? (
              <div className="kv-list">
                {Object.keys(resp.headers).length === 0 && <div className="muted">No headers</div>}
                {Object.entries(resp.headers).map(([k,v]) => (
                  <div key={k} className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>
                ))}
              </div>
            ) : view === 'raw' ? (
              <pre className="code-block"><code>{resp.bodyRaw}</code></pre>
            ) : (
              <pre className="code-block"><code>{resp.bodyPretty}</code></pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
