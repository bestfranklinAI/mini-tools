import './imageEditor.css';
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import ToolHeader from '../../components/ToolHeader';
import UI from '../../core/UI';
import { useDropzone } from 'react-dropzone';
import { saveAs } from 'file-saver';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

// Lightweight button components using shared classes; avoid direct MUI to keep bundle lean.
function Button({ children, variant, className = '', ...props }) {
  const cls = ['btn', variant === 'primary' ? 'primary' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>{children}</button>
  );
}

function Dropzone({ onImage }) {
  const onDrop = useCallback((accepted) => {
    if (accepted && accepted.length) {
      const file = accepted[0];
      const url = URL.createObjectURL(file);
      onImage({ url, file });
    }
  }, [onImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    maxFiles: 1,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={`image-editor__dropzone ${isDragActive ? 'active' : ''}`}
    >
      <input {...getInputProps()} />
      {isDragActive ? <p>Drop the image here…</p> : <p>Drag & drop an image, or click to choose</p>}
    </div>
  );
}

function Canvas({ imageUrl, width, height, rotation, scale, offset, stageRef, onStageMouseDown, onStageMouseMove, onStageMouseUp }) {
  const [img] = useImage(imageUrl || null, 'anonymous');
  const stageW = width;
  const stageH = height;

  return (
    <Stage
      ref={stageRef}
      width={stageW}
      height={stageH}
      className="image-editor__konva"
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
    >
      <Layer>
        {img && (
          <KonvaImage
            image={img}
            x={stageW / 2 + (offset?.x || 0)}
            y={stageH / 2 + (offset?.y || 0)}
            offsetX={img.width / 2}
            offsetY={img.height / 2}
            rotation={rotation}
            scaleX={scale}
            scaleY={scale}
          />
        )}
      </Layer>
    </Stage>
  );
}

export default function ImageEditor() {
  // State
  const [original, setOriginal] = useState(null); // { url, file }
  const [currentUrl, setCurrentUrl] = useState(null);
  const [processing, setProcessing] = useState({ busy: false, progress: 0, error: null });
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [format, setFormat] = useState('png');
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null); // {x,y,w,h}
  const cropStartRef = useRef(null);

  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 800, h: 520 });

  // Resize stage to container
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const cr = e.contentRect;
        setStageSize({ w: Math.max(320, cr.width - 2), h: Math.max(360, cr.height - 2) });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Cleanup object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (original?.url) URL.revokeObjectURL(original.url);
      if (currentUrl && currentUrl !== original?.url) URL.revokeObjectURL(currentUrl);
    };
  }, [original, currentUrl]);

  const onImage = useCallback(({ url, file }) => {
    if (original?.url && original.url !== url) URL.revokeObjectURL(original.url);
    setOriginal({ url, file });
    setCurrentUrl(url);
    setRotation(0);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [original]);

  // Lazy loader for background removal
  const [bgModule, setBgModule] = useState(null);
  const ensureBgModule = useCallback(async () => {
    if (bgModule) return bgModule;
    try {
      const mod = await import('@imgly/background-removal');
      setBgModule(mod);
      return mod;
    } catch (e) {
      UI.toast('Failed to load background removal lib', { type: 'warn' });
      throw e;
    }
  }, [bgModule]);

  const removeBackground = useCallback(async () => {
    if (!currentUrl) return;
    setProcessing({ busy: true, progress: 0, error: null });
    try {
      const mod = await ensureBgModule();
      const resp = await fetch(currentUrl);
      const blobIn = await resp.blob();
      const blobOut = await mod.removeBackground(blobIn, {
        progress: (p) => {
          const n = typeof p === 'number' ? p : Number(p);
          const val = Number.isFinite(n) ? n : 0;
          setProcessing(prev => ({ ...prev, busy: true, progress: val }));
        },
      });
      const newUrl = URL.createObjectURL(blobOut);
      if (currentUrl && currentUrl !== original?.url) URL.revokeObjectURL(currentUrl);
      setCurrentUrl(newUrl);
      UI.toast('Background removed', { type: 'success' });
    } catch (err) {
      console.error(err);
      setProcessing({ busy: false, progress: 0, error: err?.message || 'Error' });
      UI.toast('Background removal failed', { type: 'warn' });
      return;
    } finally {
      setProcessing(prev => ({ ...prev, busy: false }));
    }
  }, [currentUrl, original, ensureBgModule]);

  // Basic transforms
  const rotate = (delta) => setRotation(r => (r + delta) % 360);
  const zoom = (factor) => setScale(s => Math.max(0.1, Math.min(8, s * factor)));
  const resetView = () => { setRotation(0); setScale(1); setOffset({ x: 0, y: 0 }); };

  // Download/export
  const handleDownload = useCallback(async () => {
    if (!stageRef.current) return;
    const mime = `image/${format === 'jpg' ? 'jpeg' : format}`;
    const dataUrl = stageRef.current.toDataURL({ mimeType: mime, quality: 1.0, pixelRatio: 1 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    saveAs(blob, `edited-image.${format}`);
  }, [format]);

  // Simple panning with buttons for accessibility (no drag handlers to keep minimal)
  const nudge = (dx, dy) => setOffset(o => ({ x: o.x + dx, y: o.y + dy }));

  // Crop interactions
  const onStageMouseDown = useCallback((e) => {
    if (!cropMode) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    cropStartRef.current = pos;
    setCropRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }, [cropMode]);

  const onStageMouseMove = useCallback((e) => {
    if (!cropMode || !cropStartRef.current) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const s = cropStartRef.current;
    const x = Math.min(s.x, pos.x);
    const y = Math.min(s.y, pos.y);
    const w = Math.abs(pos.x - s.x);
    const h = Math.abs(pos.y - s.y);
    setCropRect({ x, y, w, h });
  }, [cropMode]);

  const onStageMouseUp = useCallback(() => {
    if (!cropMode) return;
    cropStartRef.current = null;
  }, [cropMode]);

  const applyCrop = useCallback(async () => {
    if (!stageRef.current || !cropRect || cropRect.w < 2 || cropRect.h < 2) {
      setCropMode(false);
      setCropRect(null);
      return;
    }
    const dataUrl = stageRef.current.toDataURL({ x: cropRect.x, y: cropRect.y, width: cropRect.w, height: cropRect.h, pixelRatio: 1 });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const newUrl = URL.createObjectURL(blob);
    if (currentUrl && currentUrl !== original?.url) URL.revokeObjectURL(currentUrl);
    setCurrentUrl(newUrl);
    setCropMode(false);
    setCropRect(null);
    UI.toast('Cropped', { type: 'success' });
  }, [cropRect, currentUrl, original]);

  const cancelCrop = () => { setCropMode(false); setCropRect(null); };

  // Derived safe progress for UI
  const safeProgress = Number.isFinite(processing.progress) && processing.progress >= 0
    ? Math.min(100, Math.max(0, Math.round(processing.progress)))
    : 0;

  const actions = (
    <div className="image-editor__toolbar">
      <Button onClick={() => rotate(-90)} aria-label="Rotate left">⟲ 90°</Button>
      <Button onClick={() => rotate(90)} aria-label="Rotate right">⟳ 90°</Button>
      <Button onClick={() => zoom(1.1)} aria-label="Zoom in">＋</Button>
      <Button onClick={() => zoom(1/1.1)} aria-label="Zoom out">－</Button>
      <Button onClick={resetView}>Reset</Button>
      {!cropMode && (
        <Button onClick={() => setCropMode(true)} aria-label="Start crop">Crop</Button>
      )}
      {cropMode && (
        <>
          <Button className="primary" onClick={applyCrop} aria-label="Apply crop">Apply</Button>
          <Button onClick={cancelCrop} aria-label="Cancel crop">Cancel</Button>
        </>
      )}
      <Button className="primary" onClick={removeBackground} disabled={!currentUrl || processing.busy}>
        {processing.busy ? `Removing… ${safeProgress}%` : 'Remove Background'}
      </Button>
      <div className="image-editor__progress" role="status" aria-live="polite">
        {processing.busy && <span>Working… {safeProgress}%</span>}
        {processing.error && <span className="badge">{processing.error}</span>}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label htmlFor="fmt">Format</label>
        <select id="fmt" className="input" value={format} onChange={e => setFormat(e.target.value)}>
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WEBP</option>
        </select>
        <Button className="primary" onClick={handleDownload} disabled={!currentUrl}>Download</Button>
      </div>
    </div>
  );

  return (
    <div className="tool image-editor">
      <ToolHeader
        title="Image Editor"
        subtitle="Upload, edit, remove background, and export"
        actions={actions}
      />

      <div className="image-editor__body">
        <div ref={containerRef} className="image-editor__stage">
          <Canvas
            imageUrl={currentUrl}
            width={stageSize.w}
            height={stageSize.h}
            rotation={rotation}
            scale={scale}
            offset={offset}
            stageRef={stageRef}
            onStageMouseDown={onStageMouseDown}
            onStageMouseMove={onStageMouseMove}
            onStageMouseUp={onStageMouseUp}
          />
          {cropMode && cropRect && cropRect.w > 1 && cropRect.h > 1 && (
            <div
              className="image-editor__crop-rect"
              style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
            />
          )}
        </div>
        <div className="image-editor__sidebar">
          <div className="tool-section">
            <div className="section-header">Upload</div>
            <div className="section-body">
              <Dropzone onImage={onImage} />
            </div>
          </div>
          <div className="tool-section">
            <div className="section-header">Properties</div>
            <div className="section-body image-editor__props">
              <label>Rotation
                <input className="input" type="range" min="-180" max="180" value={rotation}
                       onChange={e => setRotation(parseInt(e.target.value))} />
              </label>
              <label>Zoom
                <input className="input" type="range" min="0.1" max="4" step="0.01" value={scale}
                       onChange={e => setScale(parseFloat(e.target.value))} />
              </label>
              <div className="grid">
                <Button onClick={() => setOffset({ x: 0, y: 0 })}>Center</Button>
                <Button onClick={() => { setRotation(0); setScale(1); }}>Reset All</Button>
              </div>
            </div>
          </div>
          <div className="banner info">Tip: Use Remove Background for transparent PNGs.</div>
        </div>
      </div>
    </div>
  );
}
