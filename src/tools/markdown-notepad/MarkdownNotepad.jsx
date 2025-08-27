import './markdownNotepad.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import UI from '../../core/UI';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';

// Storage keys
const LS_KEY = 'mknp:notes';
const MAX_NOTES = 200; // simple cap
const STORAGE_SOFT_LIMIT = 4_500_000; // ~4.5MB soft guard for localStorage (varies by browser)

function nowTs() { return Date.now(); }
function fmtDate(ts) { try { return new Date(ts).toLocaleString(); } catch { return '' } }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function defaultNote() {
  return {
    id: uid(),
    title: 'Untitled note',
    content: `# New note\n\n- [ ] Click checkboxes in read mode\n- [ ] Toggle Edit to write markdown\n\nSome text...`,
    createdAt: nowTs(),
    updatedAt: nowTs(),
  };
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [defaultNote()];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [defaultNote()];
    // sanitize & sort by updatedAt desc
    const fixed = arr
      .filter((n) => n && typeof n === 'object' && typeof n.id === 'string')
      .map((n) => ({
        id: n.id,
        title: n.title || 'Untitled note',
        content: typeof n.content === 'string' ? n.content : '',
        createdAt: n.createdAt || nowTs(),
        updatedAt: n.updatedAt || nowTs(),
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return fixed.length ? fixed : [defaultNote()];
  } catch {
    return [defaultNote()];
  }
}

function saveNotesSafe(notes) {
  try {
    const json = JSON.stringify(notes);
    if (json.length > STORAGE_SOFT_LIMIT) {
      // drop oldest until under limit
      const pruned = [...notes].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
      while (pruned.length > 1 && JSON.stringify(pruned).length > STORAGE_SOFT_LIMIT) pruned.shift();
      localStorage.setItem(LS_KEY, JSON.stringify(pruned));
      UI.toast('Storage full — pruned oldest notes', { type: 'warning' });
      return pruned;
    }
    localStorage.setItem(LS_KEY, json);
  } catch (e) {
    UI.toast('Failed to save notes to localStorage', { type: 'error' });
  }
  return notes;
}

export default function MarkdownNotepad() {
  const [notes, setNotes] = useState(loadNotes);
  const [selectedId, setSelectedId] = useState(() => notes[0]?.id);
  const [editMode, setEditMode] = useState(false);

  // Markdown-it with task list plugin (clickable in read mode)
  const md = useMemo(() => {
    const m = new MarkdownIt({ html: false, linkify: true, typographer: true });
    m.use(markdownItTaskLists, { enabled: true, label: true, labelAfter: true });
    return m;
  }, []);

  const current = notes.find((n) => n.id === selectedId) || notes[0];
  const [title, setTitle] = useState(current?.title || '');
  const [content, setContent] = useState(current?.content || '');

  // Keep local state in sync when switching notes
  useEffect(() => {
    setTitle(current?.title || '');
    setContent(current?.content || '');
  }, [current?.id]);

  // Persist on change
  useEffect(() => { saveNotesSafe(notes); }, [notes]);

  const selectNote = (id) => {
    setSelectedId(id);
  };

  const addNote = () => {
    const fresh = defaultNote();
    const updated = [fresh, ...notes].slice(0, MAX_NOTES);
    setNotes(updated);
    setSelectedId(fresh.id);
    setEditMode(true);
  };

  const deleteNote = (id) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated.length ? updated : [defaultNote()]);
    if (id === selectedId) setSelectedId(updated[0]?.id);
  };

  const updateCurrent = (partial) => {
    if (!current) return;
    const updated = notes.map((n) => n.id === current.id ? { ...n, ...partial, updatedAt: nowTs() } : n);
    setNotes(updated);
  };

  const saveTitle = (t) => {
    setTitle(t);
    updateCurrent({ title: t || 'Untitled note' });
  };

  const saveContent = (c) => {
    setContent(c);
    updateCurrent({ content: c });
  };

  // Rendered HTML for read mode
  const rendered = useMemo(() => md.render(content || ''), [md, content]);

  // Toggle checklist by rewriting markdown when a checkbox is clicked
  const onPreviewClick = (e) => {
    if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'checkbox') return;
    // find the list item element
    const itemEl = e.target.closest('li');
    if (!itemEl) return;
    // derive text of the list item by reading its textContent and reconstructing a search pattern
    const labelText = itemEl.textContent?.trim() || '';
    // Build regex to find matching markdown task in current content. This is heuristic but works well for simple lists.
    const lines = (content || '').split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
      if (m) {
        const body = m[2].trim();
        if (body === labelText) {
          const checked = m[1].toLowerCase() === 'x';
          const next = `${line.replace(/\[( |x|X)\]/, checked ? '[ ]' : '[x]')}`;
          const newLines = [...lines];
          newLines[i] = next;
          const nextContent = newLines.join('\n');
          saveContent(nextContent);
          break;
        }
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        UI.toast('Saved', { type: 'success' });
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addNote();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notes]);

  return (
    <div className="tool mknp-wrap">
      <ToolHeader title="Markdown Notepad" subtitle="Quick notes with markdown + checklists" />

      <div className="mknp-topbar">
        <div className="mknp-actions">
          <button className="mknp-btn" onClick={addNote}>New</button>
          {current && (
            <button className="mknp-btn mknp-danger" onClick={() => deleteNote(current.id)}>Delete</button>
          )}
        </div>
        <div className="mknp-actions">
          <label className="mknp-toggle">
            <input type="checkbox" checked={editMode} onChange={() => setEditMode((v) => !v)} />
            <span>{editMode ? 'Edit' : 'Read'}</span>
          </label>
        </div>
      </div>

      <div className="mknp-split">
        <div className="mknp-pane">
          <div className="mknp-notes">
            <div className="mknp-notes-header">Notes</div>
            <div className="mknp-list">
              {notes.length === 0 && <div className="mknp-empty">No notes yet</div>}
              {notes.map((n) => (
                <div key={n.id} className={`mknp-item${n.id === current?.id ? ' active' : ''}`} onClick={() => selectNote(n.id)}>
                  <div className="mknp-item-title">{n.title || 'Untitled note'}</div>
                  <div className="mknp-item-time" title={fmtDate(n.updatedAt)}> {new Date(n.updatedAt).toLocaleDateString()} </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mknp-pane">
          {current ? (
            <div className="mknp-editor-wrap">
              <div className="mknp-note-header">
                <input className="mknp-title-input" placeholder="Title" value={title} onChange={(e) => saveTitle(e.target.value)} />
              </div>
              <div className="mknp-editor-body">
                {editMode ? (
                  <textarea className="mknp-textarea" value={content} onChange={(e) => saveContent(e.target.value)} spellCheck="false" placeholder="Write Markdown here…" />
                ) : (
                  <div className="mknp-preview mknp-markdown" onClick={onPreviewClick}>
                    <article dangerouslySetInnerHTML={{ __html: rendered }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mknp-empty">Select or create a note</div>
          )}
        </div>
      </div>
    </div>
  );
}
