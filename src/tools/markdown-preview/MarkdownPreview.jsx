import './markdownPreview.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';

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
    const env = {};
    const tokens = md.parse(input || '', env);
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

  const handleScroll = (scroller) => {
    if (scroller === 'editor') {
      if (activeScrollerRef.current === 'preview') return;
      activeScrollerRef.current = 'editor';
      
      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;

      const scrollPercent = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
      preview.scrollTop = scrollPercent * (preview.scrollHeight - preview.clientHeight);
    } else { // scroller === 'preview'
      if (activeScrollerRef.current === 'editor') return;
      activeScrollerRef.current = 'preview';

      const editor = editorRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;

      const scrollPercent = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      editor.scrollTop = scrollPercent * (editor.scrollHeight - editor.clientHeight);
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
    const scrollPercent = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    
    // Use a timeout to allow the preview to render and get its new scrollHeight
    setTimeout(() => {
      preview.scrollTop = scrollPercent * (preview.scrollHeight - preview.clientHeight);
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
