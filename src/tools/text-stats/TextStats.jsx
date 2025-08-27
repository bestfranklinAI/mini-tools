import { useEffect, useMemo, useRef, useState } from 'react';
import './textStats.css';

// Contract
// - Self-contained tool: textarea input with live counts
// - Shows: characters, characters (no spaces), words, lines, paragraphs, sentences, bytes, tokens (approx)
// - Optional: count only selection; copy summary; clear & paste helpers

function countSentences(text) {
  if (!text) return 0;
  // naive sentence boundary on ., !, ? followed by space or EOL
  const chunks = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'\(\[])|(?<=[.!?])$/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks.length;
}

function utf8Bytes(text) {
  if (!text) return 0;
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    // Fallback: rough estimate (not exact for non-BMP)
    return Array.from(text).reduce((n, ch) => (n + (ch.codePointAt(0) > 0x7f ? 2 : 1)), 0);
  }
}

export default function TextStats() {
  const [text, setText] = useState('');
  const [useSelection, setUseSelection] = useState(false);
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const taRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('textStats:last');
      if (raw != null) setText(raw);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('textStats:last', text);
    } catch {}
  }, [text]);

  // When enabling selection mode, capture current selection immediately
  useEffect(() => {
    if (useSelection && taRef.current) {
      const el = taRef.current;
      setSel({ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 });
    }
  }, [useSelection]);

  const activeText = useMemo(() => {
    if (!useSelection || !taRef.current) return text;
    const { start, end } = sel;
    if (start === end) return text; // nothing selected
    return text.slice(start, end);
  }, [text, useSelection, sel.start, sel.end]);

  const stats = useMemo(() => {
    const t = activeText || '';
    const chars = t.length;
    const charsNoSpaces = t.replace(/\s/g, '').length;
    const words = t.trim() ? t.trim().split(/\s+/g).filter(Boolean).length : 0;
    const lines = t === '' ? 0 : t.split(/\r?\n/).length;
    const paragraphs = t.trim() ? t.split(/\n{2,}/g).filter((p) => p.trim().length > 0).length : 0;
    const sentences = countSentences(t);
    const bytes = utf8Bytes(t);
    const tokens = Math.ceil(chars / 4); // rough heuristic
    return { chars, charsNoSpaces, words, lines, paragraphs, sentences, bytes, tokens };
  }, [activeText]);

  const copySummary = async () => {
    const s = stats;
    const lines = [
      'Text Stats',
      `- Characters: ${s.chars}`,
      `- Characters (no spaces): ${s.charsNoSpaces}`,
      `- Words: ${s.words}`,
      `- Lines: ${s.lines}`,
      `- Paragraphs: ${s.paragraphs}`,
      `- Sentences: ${s.sentences}`,
      `- UTF-8 Bytes: ${s.bytes}`,
      `- Tokens (approx): ${s.tokens}`,
    ].join('\n');
    try { await navigator.clipboard.writeText(lines); } catch {}
  };

  const pasteFromClipboard = async () => {
    try {
      const v = await navigator.clipboard.readText();
      if (v != null) setText(v);
    } catch {}
  };

  return (
    <div className="tool wc">
      <div className="wc__controls">
        <label className="wc__chk">
          <input type="checkbox" checked={useSelection} onChange={(e) => setUseSelection(e.target.checked)} />
          Count selection only
        </label>
        <div className="wc__spacer" />
        <button className="wc__btn" onClick={() => setText('')} disabled={!text}>
          Clear
        </button>
        <button className="wc__btn" onClick={pasteFromClipboard}>
          Paste
        </button>
        <button className="wc__btn wc__btn-accent" onClick={copySummary}>
          Copy summary
        </button>
      </div>

      <div className="wc__grid">
        <textarea
          ref={taRef}
          className="wc__input"
          placeholder="Type or paste your text here…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // keep selection in sync when typing
            if (useSelection) setSel({ start: e.target.selectionStart, end: e.target.selectionEnd });
          }}
          onSelect={(e) => {
            if (useSelection) setSel({ start: e.target.selectionStart, end: e.target.selectionEnd });
          }}
          onKeyUp={(e) => {
            if (useSelection) setSel({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
          }}
          onMouseUp={(e) => {
            if (useSelection) setSel({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
          }}
        />

        <div className="wc__panel">
          <div className="wc__row">
            <div className="wc__metric">
              <div className="wc__label">Characters</div>
              <div className="wc__value">{stats.chars.toLocaleString()}</div>
            </div>
            <div className="wc__metric">
              <div className="wc__label">Chars (no spaces)</div>
              <div className="wc__value">{stats.charsNoSpaces.toLocaleString()}</div>
            </div>
          </div>
          <div className="wc__row">
            <div className="wc__metric">
              <div className="wc__label">Words</div>
              <div className="wc__value">{stats.words.toLocaleString()}</div>
            </div>
            <div className="wc__metric">
              <div className="wc__label">Lines</div>
              <div className="wc__value">{stats.lines.toLocaleString()}</div>
            </div>
          </div>
          <div className="wc__row">
            <div className="wc__metric">
              <div className="wc__label">Paragraphs</div>
              <div className="wc__value">{stats.paragraphs.toLocaleString()}</div>
            </div>
            <div className="wc__metric">
              <div className="wc__label">Sentences</div>
              <div className="wc__value">{stats.sentences.toLocaleString()}</div>
            </div>
          </div>
          <div className="wc__row">
            <div className="wc__metric">
              <div className="wc__label">UTF-8 Bytes</div>
              <div className="wc__value">{stats.bytes.toLocaleString()}</div>
            </div>
            <div className="wc__metric">
              <div className="wc__label">Tokens (approx)</div>
              <div className="wc__value">{stats.tokens.toLocaleString()}</div>
            </div>
          </div>

          <div className="wc__hint">
            Token count is an approximation. For precise model tokenization, use a model-specific tokenizer.
          </div>
        </div>
      </div>
    </div>
  );
}
