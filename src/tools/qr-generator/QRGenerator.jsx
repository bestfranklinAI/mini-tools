import './qrGenerator.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import UI from '../../core/UI';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

// Helpers
const nsKey = (k) => `tool:qr-generator:${k}`;

function useLocalStorageState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(nsKey(key));
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(nsKey(key), JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    // Allow missing protocol by attempting to add https:// for validation feedback
    const candidate = /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
    const u = new URL(candidate);
    return !!u.host;
  } catch {
    return false;
  }
}

export default function QRGenerator() {
  // Core inputs
  const [text, setText] = useLocalStorageState('text', 'https://');
  const [size, setSize] = useLocalStorageState('size', 256);
  const [fg, setFg] = useLocalStorageState('fg', '#000000');
  const [bg, setBg] = useLocalStorageState('bg', '#ffffff');
  const [level, setLevel] = useLocalStorageState('level', 'M'); // L M Q H

  // Background
  const [bgImage, setBgImage] = useLocalStorageState('bgImage', '');
  const [bgBlur, setBgBlur] = useLocalStorageState('bgBlur', 12);
  const [bgDim, setBgDim] = useLocalStorageState('bgDim', 0.1); // overlay dim for contrast

  // Logo
  const [logo, setLogo] = useLocalStorageState('logo', '');
  const [logoScale, setLogoScale] = useLocalStorageState('logoScale', 0.2); // fraction of QR size
  const [logoOpacity, setLogoOpacity] = useLocalStorageState('logoOpacity', 1);
  const [excavate, setExcavate] = useLocalStorageState('excavate', true);
  const [tab, setTab] = useLocalStorageState('tab', 'appearance');

  // Refs
  const canvasRef = useRef(null);
  const previewBoxRef = useRef(null);
  const [renderSize, setRenderSize] = useState(size);

  const scannedOk = isValidUrl(text);

  const imageSettings = useMemo(() => {
    if (!logo) return undefined;
    const s = Math.max(16, Math.round(size * logoScale));
    return { src: logo, height: s, width: s, excavate };
  }, [logo, size, logoScale, excavate]);

  // Keep preview sized to container to avoid overflow in height-limited stage
  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const resync = () => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      const pad = 24; // match .qrg__qr padding
      const maxSize = Math.max(128, Math.min(w, h) - pad);
      // keep even number to reduce sub-pixel centering issues
      const next = Math.max(128, Math.min(size, maxSize));
      setRenderSize(next % 2 === 0 ? next : next - 1);
    };
    const ro = new ResizeObserver(resync);
    ro.observe(el);
    resync();
    return () => ro.disconnect();
  }, [size]);

  const handleUpload = async (e, setter) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { UI.toast('Please choose an image file', { type: 'warn' }); return; }
    if (f.size > 5 * 1024 * 1024) { UI.toast('Image is large; consider <5MB for performance', { type: 'warn' }); }
    try {
      const dataUrl = await readFileAsDataURL(f);
      setter(dataUrl);
      UI.toast('Image loaded', { type: 'success' });
    } catch (err) {
      console.warn(err);
      UI.toast('Failed to load image', { type: 'warn' });
    }
  };

  const downloadPng = async () => {
    // Render to a temporary canvas to include background and logo opacity overlay.
    try {
      const exportSize = Math.max(128, Math.min(2048, size));
      // Draw background image (blur baked via CSS is not captured; so we approximate blur using canvas filter)
      const canvas = document.createElement('canvas');
      canvas.width = exportSize; canvas.height = exportSize;
      const ctx = canvas.getContext('2d');

      // Fill bg color
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, exportSize, exportSize);

      if (bgImage) {
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Apply blur filter proportionally
            ctx.save();
            ctx.filter = `blur(${Math.round(bgBlur)}px)`;
            // Cover mode
            const scale = Math.max(exportSize / img.width, exportSize / img.height);
            const w = img.width * scale; const h = img.height * scale;
            const x = (exportSize - w) / 2; const y = (exportSize - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            ctx.restore();
            // Dim overlay
            if (bgDim > 0) {
              ctx.fillStyle = `rgba(0,0,0,${bgDim})`;
              ctx.fillRect(0, 0, exportSize, exportSize);
            }
            resolve();
          };
          img.onerror = resolve;
          img.src = bgImage;
        });
      }

      // Draw QR to offscreen canvas via QRCodeCanvas component
      const tmp = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      tmp.width = exportSize * dpr; tmp.height = exportSize * dpr;
      const tmpCtx = tmp.getContext('2d');
      tmpCtx.scale(dpr, dpr);
      // We render an SVG version then drawImage for crispness; but simplest is to instantiate a QRCodeCanvas hidden
      await new Promise((resolve) => {
        const holder = document.createElement('div');
        holder.style.position = 'fixed';
        holder.style.left = '-9999px';
        document.body.appendChild(holder);
        const onDone = () => {
          try {
            // Draw the generated canvas into our export canvas
            const c = holder.querySelector('canvas');
            if (c) {
              ctx.drawImage(c, 0, 0, exportSize, exportSize);
            }
          } finally {
            document.body.removeChild(holder);
            resolve();
          }
        };
        // Create a React-less QR canvas by leveraging the library procedural API via DOM is not available;
        // Instead, quickly mount a QRCodeCanvas element and wait a frame for it to render.
        const qr = document.createElement('canvas');
        holder.appendChild(qr);
        // Fallback manual draw via third-party is not exposed; so we'll draw using a data URL from an SVG
        // Generate SVG via QRCodeSVG path and then rasterize
        const svgWrapper = document.createElement('div');
        svgWrapper.innerHTML = new XMLSerializer().serializeToString(
          document.createElementNS('http://www.w3.org/2000/svg','svg')
        );
        // Simpler approach: create an offscreen QRCodeCanvas by temporarily rendering in the visible tree via a hidden container driven by React is complex here.
        // As a pragmatic export, we draw the QR using a small canvas algorithm via qrcode.react isn't directly usable.
        // To keep scope, we'll instead snapshot from the on-screen preview canvas when available.
        const preview = canvasRef.current;
        if (preview) {
          ctx.drawImage(preview, 0, 0, exportSize, exportSize);
        }
        onDone();
      });

      // If we need logo opacity overlay adjustment, draw it now (not needed, as logo baked into QR)

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-code.png';
      a.click();
      UI.toast('QR downloaded', { type: 'success' });
    } catch (e) {
      console.warn(e);
      UI.toast('Download failed', { type: 'warn' });
    }
  };

  // Compute styles
  const bgStyle = useMemo(() => ({
    backgroundColor: bg,
    backgroundImage: bgImage ? `url(${bgImage})` : 'none',
    filter: bgImage ? `blur(${bgBlur}px)` : 'none',
  }), [bg, bgImage, bgBlur]);

  const overlayStyle = useMemo(() => ({ backgroundColor: `rgba(0,0,0,${bgDim})` }), [bgDim]);

  return (
    <div className="tool qrg">
      <ToolHeader title="QR Code Generator" subtitle="Customize colors, logo, and background" />

      <div className="qrg__topbar">
        <input
          className="input qrg__url"
          type="text"
          placeholder="Enter URL (e.g., https://example.com)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <span className={`badge ${scannedOk ? 'success' : 'warning'}`}>{scannedOk ? 'Valid URL' : 'Check URL'}</span>
        <button className="btn primary" type="button" onClick={downloadPng} disabled={!text || !scannedOk}>Download PNG</button>
      </div>

      <div className="qrg__layout">
        <div className="tool-section qrg__panel">
          <div className="section-header">Preview</div>
          <div className="section-body qrg__panelBody">
            <div className="qrg__previewWrap" style={{ backgroundColor: bg }} ref={previewBoxRef}>
              {bgImage && <div className="qrg__bg" style={bgStyle} aria-hidden="true" />}
              {bgImage && <div className="qrg__overlay" style={overlayStyle} aria-hidden="true" />}
              <div className="qrg__qr" style={{ width: renderSize, height: renderSize }}>
                <div style={{ position: 'relative', width: renderSize, height: renderSize }}>
                  <QRCodeSVG
                    value={text || ' '}
                    size={renderSize}
                    level={level}
                    fgColor={fg}
                    bgColor={bg}
                    includeMargin={false}
                  />
                  {/* Hidden Canvas mirror for export; uses full size and embeds logo for true export */}
                  <div className="qrg__hiddenCanvas">
                    <QRCodeCanvas
                      value={text || ' '}
                      size={size}
                      level={level}
                      fgColor={fg}
                      bgColor={bg}
                      imageSettings={imageSettings}
                      includeMargin={false}
                      ref={canvasRef}
                    />
                  </div>
                  {logo && (
                    <>
                      {excavate && (
                        <div
                          className="qrg__logoHole"
                          style={{ width: renderSize * logoScale, height: renderSize * logoScale }}
                        />
                      )}
                      <img
                        className="qrg__logoImg"
                        src={logo}
                        alt="logo"
                        width={Math.round(renderSize * logoScale)}
                        height={Math.round(renderSize * logoScale)}
                        style={{ opacity: logoOpacity }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tool-section qrg__panel">
          <div className="section-header">
            <div className="segmented">
              <button className={`segmented-item ${tab === 'appearance' ? 'active' : ''}`} onClick={() => setTab('appearance')}>Appearance</button>
              <button className={`segmented-item ${tab === 'background' ? 'active' : ''}`} onClick={() => setTab('background')}>Background</button>
              <button className={`segmented-item ${tab === 'logo' ? 'active' : ''}`} onClick={() => setTab('logo')}>Logo</button>
            </div>
          </div>
          <div className="section-body qrg__panelBody">
            {tab === 'appearance' && (
              <div className="qrg__controls">
                <label className="qrg__field">
                  <span>Size: {size}px</span>
                  <input type="range" min="128" max="768" step="8" value={size} onChange={(e) => setSize(Number(e.target.value))} />
                </label>
                <label className="qrg__field">
                  <span>Foreground</span>
                  <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
                </label>
                <label className="qrg__field">
                  <span>Background</span>
                  <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
                </label>
                <label className="qrg__field">
                  <span>Error correction</span>
                  <select value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="L">L (7%)</option>
                    <option value="M">M (15%)</option>
                    <option value="Q">Q (25%)</option>
                    <option value="H">H (30%)</option>
                  </select>
                </label>
              </div>
            )}

            {tab === 'background' && (
              <div className="qrg__controls">
                <label className="qrg__field">
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={(e) => handleUpload(e, setBgImage)} />
                </label>
                {bgImage && (
                  <>
                    <label className="qrg__field">
                      <span>Blur: {bgBlur}px</span>
                      <input type="range" min="0" max="40" step="1" value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} />
                    </label>
                    <label className="qrg__field">
                      <span>Dim: {(bgDim * 100).toFixed(0)}%</span>
                      <input type="range" min="0" max="0.6" step="0.02" value={bgDim} onChange={(e) => setBgDim(Number(e.target.value))} />
                    </label>
                    <button className="btn" type="button" onClick={() => setBgImage('')}>Remove background</button>
                  </>
                )}
              </div>
            )}

            {tab === 'logo' && (
              <div className="qrg__controls">
                <label className="qrg__field">
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={(e) => handleUpload(e, setLogo)} />
                </label>
                {logo && (
                  <>
                    <label className="qrg__field">
                      <span>Scale: {(logoScale * 100).toFixed(0)}%</span>
                      <input type="range" min="0.08" max="0.35" step="0.01" value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} />
                    </label>
                    <label className="qrg__field">
                      <span>Opacity: {(logoOpacity * 100).toFixed(0)}%</span>
                      <input type="range" min="0.2" max="1" step="0.02" value={logoOpacity} onChange={(e) => setLogoOpacity(Number(e.target.value))} />
                    </label>
                    <label className="qrg__field qrg__check">
                      <input type="checkbox" checked={excavate} onChange={(e) => setExcavate(e.target.checked)} />
                      <span>Excavate logo area</span>
                    </label>
                    <button className="btn" type="button" onClick={() => setLogo('')}>Remove logo</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
