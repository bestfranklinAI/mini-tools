import './markdownPreview.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';

// Markdown Preview tool with synchronized scrolling between editor and preview.
export default function MarkdownPreview() {
  // Create markdown-it instance with custom code renderers that embed data-line anchors for sync
  const md = useMemo(() => {
    const m = new MarkdownIt({
      html: false, // keep safe by default
      linkify: true,
      typographer: true,
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
      const lineAttr = token.map ? ` data-line="${token.map[0]}"` : '';
      const langClass = lang ? ` language-${m.utils.escapeHtml(lang)}` : '';
      return `<pre class="hljs${langClass}"${lineAttr}><code>${highlighted}</code></pre>`;
    };
    m.renderer.rules.fence = fence;

    // Indented code blocks
    m.renderer.rules.code_block = (tokens, idx) => {
      const token = tokens[idx];
      const content = token.content || '';
      const lineAttr = token.map ? ` data-line="${token.map[0]}"` : '';
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
    const env = {};
    const tokens = md.parse(input || '', env);
    // Add data-line attribute to block-level opens so headings/paragraphs/lists are anchorable
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.map && (t.type.endsWith('_open'))) {
        t.attrSet('data-line', String(t.map[0]));
      }
    }
    return md.renderer.render(tokens, md.options, env);
  }, [md, input]);

  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const rafRef = useRef(0);
  const syncingRef = useRef(null); // 'editor' | 'preview' | null

  // Helpers for precise mapping using data-line anchors
  const getAnchors = () => Array.from(previewRef.current?.querySelectorAll('[data-line]') || []);

  const getContainerScrollTopForAnchor = (el, container) => {
    const cRect = container.getBoundingClientRect();
    const aRect = el.getBoundingClientRect();
    return aRect.top - cRect.top + container.scrollTop;
  };

  const lineHeightPxRef = useRef(22);
  useEffect(() => {
    const ta = editorRef.current;
    if (!ta) return;
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight);
    if (!Number.isNaN(lh)) lineHeightPxRef.current = lh;
  }, []);

  const getTopLineFromEditor = () => {
    const ta = editorRef.current;
    if (!ta) return 0;
    const lh = Math.max(1, lineHeightPxRef.current);
    return Math.floor(ta.scrollTop / lh);
  };

  const scrollPreviewToEditor = () => {
    const container = previewRef.current;
    const ta = editorRef.current;
    if (!container || !ta) return;
    const anchors = getAnchors();
    if (anchors.length === 0) return;
    const topLine = getTopLineFromEditor();
    // find nearest prev and next anchors around topLine
    let prev = anchors[0];
    let next = null;
    for (let i = 0; i < anchors.length; i++) {
      const l = parseInt(anchors[i].getAttribute('data-line') || '0', 10);
      if (l <= topLine) prev = anchors[i];
      if (l > topLine) { next = anchors[i]; break; }
    }
    const prevLine = parseInt(prev.getAttribute('data-line') || '0', 10);
    const prevTop = getContainerScrollTopForAnchor(prev, container);
    if (!next) { container.scrollTop = prevTop; return; }
    const nextLine = parseInt(next.getAttribute('data-line') || '0', 10);
    const nextTop = getContainerScrollTopForAnchor(next, container);
    const spanLines = Math.max(1, nextLine - prevLine);
    const within = Math.max(0, Math.min(spanLines, topLine - prevLine));
    const ratio = within / spanLines;
    container.scrollTop = prevTop + ratio * (nextTop - prevTop);
  };

  const scrollEditorToPreview = () => {
    const container = previewRef.current;
    const ta = editorRef.current;
    if (!container || !ta) return;
    const anchors = getAnchors();
    if (anchors.length === 0) return;
    const cRect = container.getBoundingClientRect();
    // topmost visible anchor
    let idx = anchors.findIndex((a) => a.getBoundingClientRect().top >= cRect.top - 1);
    if (idx === -1) idx = anchors.length - 1;
    let curr = anchors[idx];
    let next = anchors[idx + 1] || null;
    const currLine = parseInt(curr.getAttribute('data-line') || '0', 10);
    if (!next) {
      ta.scrollTop = currLine * Math.max(1, lineHeightPxRef.current);
      return;
    }
    const nextLine = parseInt(next.getAttribute('data-line') || '0', 10);
    const currTop = getContainerScrollTopForAnchor(curr, container);
    const nextTop = getContainerScrollTopForAnchor(next, container);
    const span = Math.max(1, nextTop - currTop);
    const within = Math.max(0, Math.min(span, container.scrollTop - currTop));
    const ratio = within / span;
    const targetLine = Math.round(currLine + ratio * (nextLine - currLine));
    ta.scrollTop = targetLine * Math.max(1, lineHeightPxRef.current);
  };

  const onEditorScroll = () => {
    if (syncingRef.current === 'preview') return;
    syncingRef.current = 'editor';
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      scrollPreviewToEditor();
      syncingRef.current = null;
    });
  };

  const onPreviewScroll = () => {
    if (syncingRef.current === 'editor') return;
    syncingRef.current = 'preview';
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      scrollEditorToPreview();
      syncingRef.current = null;
    });
  };

  // Keep scroll positions aligned after re-rendering preview (when input changes)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => scrollPreviewToEditor());
    return () => cancelAnimationFrame(rafRef.current);
  }, [html]);

  return (
    <div className="tool mdp-wrap">
      <ToolHeader title="Markdown Preview" subtitle="Live preview with synchronized scroll" actions={(
        <>
          <button className="btn" onClick={() => setInput(DEFAULT_MD)}>Reset Demo</button>
          <button className="btn" onClick={() => setInput('')}>Clear</button>
        </>
      )} />

      <div className="mdp-split">
        <div className="mdp-pane">
          <textarea
            ref={editorRef}
            className="mdp-editor"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
`;
