import { useMemo, useState } from 'react';
import UI from '../../core/UI';
import ToolHeader from '../../components/ToolHeader';

function stripHtmlTags(t) {
  return t.replace(/<[^>]+>/g, '');
}

function decodeEntities(t) {
  return t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripMarkdown(t) {
  let s = t;
  // Remove fenced code blocks but keep inner content
  s = s.replace(/```[a-z0-9_-]*\n?([\s\s]*?)```/gi, '$1');
  s = s.replace(/~~~[a-z0-9_-]*\n?([\s\s]*?)~~~/gi, '$1');
  // Inline code
  s = s.replace(/`([^`]+)`/g, '$1');
  // Images: keep alt text
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Links: keep link text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Reference-style links: [text][ref]
  s = s.replace(/\[([^\]]+)\]\s*\[[^\]]*\]/g, '$1');
  // Headings: leading/trailing hashes
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\s+#+\s*$/gm, '');
  // Setext headings (==== or ---- lines) -> drop underline
  s = s.replace(/^\s*=+\s*$|^\s*-+\s*$/gm, '');
  // Blockquotes
  s = s.replace(/^\s*>+\s?/gm, '');
  // Task lists: remove [ ] or [x]
  s = s.replace(/^\s*[-*+]\s*\[[ xX]\]\s+/gm, '');
  // Bulleted lists
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  // Numbered lists
  s = s.replace(/^\s*\d+[\.)]\s+/gm, '');
  // Horizontal rules
  s = s.replace(/^\s{0,3}(?:-{3,}|_{3,}|\*{3,})\s*$/gm, '');
  // Tables: drop header separators and outer pipes
  s = s.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '');
  s = s.replace(/^\s*\|\s*/gm, '');
  s = s.replace(/\s*\|\s*$/gm, '');
  s = s.replace(/\s*\|\s*/g, ' \u2502 '); // visually separate columns with a thin bar
  // Bold/italic/strikethrough markers
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  s = s.replace(/___([^_]+)___/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');
  // Escapes: \* \_ \` etc.
  s = s.replace(/\\([*_`~\[\]{}()#+.!|-])/g, '$1');
  return s;
}

function sanitizePlainText(raw, { collapseWhitespace, stripMd }) {
  if (!raw) return '';
  let t = String(raw);
  // Normalize newlines to \n
  t = t.replace(/\r\n?|\u2028|\u2029/g, '\n');
  // Replace non-breaking spaces with regular spaces
  t = t.replace(/\u00A0/g, ' ');
  // Remove zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)
  t = t.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Straighten quotes
  t = t
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"');
  // Remove other control chars except tab/newline
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Decode entities, strip HTML, then Markdown if opted
  t = decodeEntities(t);
  t = stripHtmlTags(t);
  if (stripMd) t = stripMarkdown(t);
  if (collapseWhitespace) {
    // Collapse runs of spaces/tabs and trim each line
    t = t
      .split('\n')
      .map((line) => line.replace(/[\t ]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n'); // cap consecutive blank lines to 2
  }
  return t;
}

export default function PlainText() {
  const [input, setInput] = useState('');
  const [collapseWhitespace, setCollapseWhitespace] = useState(false);
  const [stripMd, setStripMd] = useState(true);

  const output = useMemo(
    () => sanitizePlainText(input, { collapseWhitespace, stripMd }),
    [input, collapseWhitespace, stripMd]
  );

  const copyOut = async () => {
    try {
      await navigator.clipboard.writeText(output);
  UI.toast('Copied cleaned text', { type: 'success' });
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const pasteIn = async () => {
    try {
      const text = await navigator.clipboard.readText();
  if (text) { setInput((prev) => (prev ? prev + '\n' + text : text)); UI.toast('Pasted from clipboard', { type: 'info' }); }
    } catch (e) {
      console.warn('Paste failed (permissions?)', e);
    }
  };

  const onPaste = (e) => {
    // Ensure plain text on paste, even if source is rich text.
    const text = e.clipboardData?.getData('text/plain');
    if (typeof text === 'string') {
      e.preventDefault();
      const target = e.target;
      // For controlled textarea, replace current selection with text
      const start = target.selectionStart ?? input.length;
      const end = target.selectionEnd ?? input.length;
      const next = input.slice(0, start) + text + input.slice(end);
      setInput(next);
      // Move cursor to end of inserted text on next tick
      setTimeout(() => {
        try {
          target.selectionStart = target.selectionEnd = start + text.length;
        } catch { /* ignore */ }
      }, 0);
    }
  };

  return (
    <div className="tool-root pt">
      <ToolHeader title="Plain Text Cleaner" subtitle="Strip markup and sanitize text" />
      
      <div className="flex gap-4 p-4 items-center wrap border-b">
        <button className="btn small" type="button" onClick={pasteIn} title="Paste from clipboard">
          Paste
        </button>
        <button className="btn small" type="button" onClick={() => setInput('')} title="Clear input">
          Clear
        </button>
        <div className="flex gap-4 ml-auto">
          <label className="switch small">
            <input
              type="checkbox"
              checked={collapseWhitespace}
              onChange={(e) => setCollapseWhitespace(e.target.checked)}
            />
            <span>Collapse whitespace</span>
          </label>
          <label className="switch small">
            <input
              type="checkbox"
              checked={stripMd}
              onChange={(e) => setStripMd(e.target.checked)}
            />
            <span>Strip Markdown</span>
          </label>
        </div>
      </div>

      <div className="tool-split">
        <div className="tool-pane">
          <div className="tool-pane-header">Input (Rich Text)</div>
          <div className="tool-pane-content p-0">
            <textarea
              className="textarea h-full border-0"
              style={{ borderRadius: 0 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={onPaste}
              placeholder="Paste rich text here. Formatting will be stripped."
            />
          </div>
        </div>

        <div className="tool-pane">
          <div className="tool-pane-header">
            <span>Cleaned Text</span>
            <button className="btn small primary" type="button" onClick={copyOut} title="Copy cleaned text">
              Copy
            </button>
          </div>
          <div className="tool-pane-content p-0">
            <textarea 
              className="textarea h-full border-0" 
              style={{ borderRadius: 0 }}
              value={output} 
              readOnly 
            />
          </div>
          <div className="p-2 border-t text-small text-muted flex gap-3">
            <span>{output.length.toLocaleString()} chars</span>
            <span>{output.split('\n').length.toLocaleString()} lines</span>
          </div>
        </div>
      </div>
    </div>
  );
}
