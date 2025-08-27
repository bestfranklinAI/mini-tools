import './markdownPreview.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import markdownItKatex from 'markdown-it-katex';
import 'katex/dist/katex.min.css';

// Markdown Preview tool with synchronized scrolling between editor and preview.
export default function MarkdownPreview() {
  // Debug mode - can be toggled via button
  const [debugMode, setDebugMode] = useState(false);
  
  const log = (...args) => {
    if (debugMode) console.log('[MarkdownPreview]', ...args);
  };
  // Create markdown-it instance with custom code renderers that embed data-line anchors for sync
  const md = useMemo(() => {
    const m = new MarkdownIt({
      html: false, // keep safe by default
      linkify: true,
      typographer: true,
    });

    // Enable LaTeX math via KaTeX (inline $...$ and block $$...$$)
    m.use(markdownItKatex, {
      throwOnError: false,
      errorColor: '#cc0000',
      output: 'html',
      strict: 'warn',
      trust: false,
      macros: {}
    });


    // Custom fence renderer to include data-line and syntax highlighting
    const fence = (tokens, idx) => {
      const token = tokens[idx];
      const info = token.info ? m.utils.unescapeAll(token.info).trim() : '';
      const lang = info.split(/\s+/g)[0];
      const content = token.content || '';
      let highlighted;
      try {
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
        } else {
          highlighted = m.utils.escapeHtml(content);
        }
      } catch {
        highlighted = m.utils.escapeHtml(content);
      }
      const lineAttr = token.map ? ` data-line="${token.map[0] + 1}"` : '';
      const langClass = lang ? ` language-${m.utils.escapeHtml(lang)}` : '';
      return `<pre class="hljs${langClass}"${lineAttr}><code>${highlighted}</code></pre>`;
    };
    m.renderer.rules.fence = fence;

    // Indented code blocks
    m.renderer.rules.code_block = (tokens, idx) => {
      const token = tokens[idx];
      const content = token.content || '';
      const lineAttr = token.map ? ` data-line="${token.map[0] + 1}"` : '';
      return `<pre class="hljs"${lineAttr}><code>${m.utils.escapeHtml(content)}</code></pre>`;
    };

    return m;
  }, []);

  const [input, setInput] = useState(() => {
    try {
      const saved = localStorage.getItem('mdp:input');
      return saved ?? DEFAULT_MD;
    } catch {
      return DEFAULT_MD;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('mdp:input', input); } catch {}
  }, [input]);

  // Render with line anchors using markdown-it tokens
  const html = useMemo(() => {
    // Normalize TeX delimiters before parsing so that \[...\] and \(...\) work
    const normalizeMathDelimiters = (src) => {
      if (!src) return src;

      // State for fenced code blocks (``` or ~~~)
      let inFence = false;
      let fenceMarker = '';

      const lines = src.split(/\n/);
      const outLines = [];

      const replaceOutsideInline = (line) => {
        let i = 0;
        let inInline = false;
        let inlineTicks = 0;
        let buf = '';
        let out = '';

        const applyRepl = (s) => {
          // Replace \\[ ... \\] => $$ ... $$ (display math)
          s = s
            .replace(/(^|[^\\])\\\[/g, '$1$$')
            .replace(/(^|[^\\])\\\]/g, '$1$$');
          // Also support \( ... \) => $ ... $ (inline math)
          s = s
            .replace(/(^|[^\\])\\\(/g, '$1$')
            .replace(/(^|[^\\])\\\)/g, '$1$');
          return s;
        };

        while (i < line.length) {
          if (!inInline && line[i] === '`') {
            // entering inline code span of N backticks
            // flush buffer with replacements
            out += applyRepl(buf);
            buf = '';
            let j = i;
            while (j < line.length && line[j] === '`') j++;
            inlineTicks = j - i;
            inInline = true;
            out += line.slice(i, j);
            i = j;
            continue;
          }
          if (inInline) {
            // look for closing backticks of the same length
            if (line[i] === '`') {
              let j = i;
              while (j < line.length && line[j] === '`') j++;
              const ticks = j - i;
              if (ticks === inlineTicks) {
                inInline = false;
                out += line.slice(i, j);
                i = j;
                continue;
              }
            }
            // inside inline code: copy as-is
            out += line[i++];
            continue;
          }
          // normal text region, accumulate into buffer
          buf += line[i++];
        }
        // flush remainder
        out += applyRepl(buf);
        return out;
      };

  for (const rawLine of lines) {
        const line = rawLine;
        const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
        if (fenceMatch) {
          const marker = fenceMatch[2];
          if (!inFence) {
            inFence = true;
            fenceMarker = marker;
          } else if (marker[0] === fenceMarker[0]) {
            // closing fence only if same marker type (backtick vs tilde)
            inFence = false;
            fenceMarker = '';
          }
          outLines.push(line);
          continue;
        }
        if (inFence) {
          outLines.push(line);
          continue;
        }
        // Skip typical indented code blocks (leading 4 spaces or a tab)
        if (/^(\t| {4,})/.test(line)) {
          outLines.push(line);
          continue;
        }
        outLines.push(replaceOutsideInline(line));
      }

      return outLines.join('\n');
    };

    const env = {};
    const normalized = normalizeMathDelimiters(input || '');
    const tokens = md.parse(normalized, env);
    // Add data-line attribute to all block-level tokens for better sync
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.map && (t.type.endsWith('_open') || t.level === 0)) {
        t.attrSet('data-line', String(t.map[0] + 1)); // Use 1-based line numbers
      }
    }
    return md.renderer.render(tokens, md.options, env);
  }, [md, input]);

  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const activeScrollerRef = useRef(null); // 'editor' | 'preview'


  const handlePaste = (e) => {
    const ta = editorRef.current;
    if (!ta) return;
    const pasted = e.clipboardData?.getData('text/plain');
    if (!pasted) return;
    // Convert \[...\] to $$...$$ in pasted text
    const converted = pasted
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$');
    // If no change, let default paste happen
    if (converted === pasted) return;
    e.preventDefault();
    const start = ta.selectionStart ?? input.length;
    const end = ta.selectionEnd ?? start;
    const next = (input ?? '').slice(0, start) + converted + (input ?? '').slice(end);
    setInput(next);
    // Restore caret after React updates value
    setTimeout(() => {
      try {
        const pos = start + converted.length;
        ta.selectionStart = ta.selectionEnd = pos;
      } catch {}
    }, 0);
  };

  const handleScroll = (scroller) => {
    if (scroller === 'editor') {
      if (activeScrollerRef.current === 'preview') return;
      activeScrollerRef.current = 'editor';
      
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;
      const eScrollable = editor.scrollHeight > editor.clientHeight + 1;
      const pScrollable = preview.scrollHeight > preview.clientHeight + 1;
      if (!eScrollable || !pScrollable) {
        // If either side can't scroll, skip syncing to avoid NaN/Inf
        return;
      }
      const eDen = editor.scrollHeight - editor.clientHeight;
      const pDen = preview.scrollHeight - preview.clientHeight;
      if (eDen <= 0 || pDen <= 0) return;
      const scrollPercent = editor.scrollTop / eDen;
      preview.scrollTop = scrollPercent * pDen;
    } else { // scroller === 'preview'
      if (activeScrollerRef.current === 'editor') return;
      activeScrollerRef.current = 'preview';

      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;
      const eScrollable = editor.scrollHeight > editor.clientHeight + 1;
      const pScrollable = preview.scrollHeight > preview.clientHeight + 1;
      if (!eScrollable || !pScrollable) {
        return;
      }
      const eDen = editor.scrollHeight - editor.clientHeight;
      const pDen = preview.scrollHeight - preview.clientHeight;
      if (eDen <= 0 || pDen <= 0) return;
      const scrollPercent = preview.scrollTop / pDen;
      editor.scrollTop = scrollPercent * eDen;
    }

    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      activeScrollerRef.current = null;
    }, 150); // Cooldown period
  };

  const onEditorScroll = () => handleScroll('editor');
  const onPreviewScroll = () => handleScroll('preview');

  // Keep scroll positions aligned after re-rendering preview (when input changes)
  useEffect(() => {
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    // Preserve scroll position on re-render
    const eDen = editor.scrollHeight - editor.clientHeight;
    const pDen = preview.scrollHeight - preview.clientHeight;
    const eScrollable = eDen > 0;
    const pScrollable = pDen > 0;
    if (!eScrollable || !pScrollable) return;
    const scrollPercent = editor.scrollTop / eDen;
    
    // Use a timeout to allow the preview to render and get its new scrollHeight
    setTimeout(() => {
      const newDen = preview.scrollHeight - preview.clientHeight;
      if (newDen > 0) {
        preview.scrollTop = scrollPercent * newDen;
      }
    }, 50);
    
  }, [html]);

  return (
    <div className="tool mdp-wrap">
      <ToolHeader title="Markdown Preview" subtitle="Live preview with synchronized scroll" />

  <div className="mdp-split">
        <div className="mdp-pane">
          <textarea
            ref={editorRef}
            className="mdp-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            onScroll={onEditorScroll}
            wrap="soft"
            spellCheck="false"
            placeholder="Write Markdown here…"
          />
        </div>
        <div className="mdp-pane">
          <div ref={previewRef} className="mdp-preview" onScroll={onPreviewScroll}>
            <article className="mdp-content" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>
  </div>
  );
}

const DEFAULT_MD = `# Markdown Live Preview

Type on the left, see preview on the right. Scroll is kept in sync.

## Features

- Live rendering via markdown-it
- Safe by default (raw HTML is disabled)
- Code highlighting with highlight.js
- Two-way synchronized scrolling

### Code

\`\`\`js
function hello(name) {
  console.log('Hello, ' + name + '!');
}
hello('world');
\`\`\`

### Table

| Name   | Value |
| ------ | -----:|
| Alpha  |  3.14 |
| Beta   |   123 |

> Blockquotes are supported too.

### Math

Inline math with \\( ... \\): e.g., \\(a_i = x^2 + y_1\\) and subscripts/superscripts.

Display math with \\[ ... \\]:

\\[ \int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi} \\]
`;
