import { useEffect, useMemo, useState } from 'react';
import ToolHeader from '../../components/ToolHeader';
import UI from '../../core/UI';
import MarkdownIt from 'markdown-it';
import markdownItTaskLists from 'markdown-it-task-lists';
import { simplePrompt } from '../../core/LLMClient';

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
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);


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
          const next = `${line.replace(/\b\[( |x|X)\]\b/, checked ? '[ ]' : '[x]')}`;
          const newLines = [...lines];
          newLines[i] = next;
          const nextContent = newLines.join('\n');
          saveContent(nextContent);
          break;
        }
      }
    }
  };

  const handleGenerateTasks = async () => {
    if (!projectDescription.trim()) {
      UI.toast('Please enter a project description.', { type: 'warn' });
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Based on the following project description, generate a detailed task breakdown as a markdown checklist.

Project Description:
"${projectDescription}"

The output should be only the markdown checklist, with no other text before or after.`

      const { text } = await simplePrompt(prompt, { system: 'You are a project management assistant. Your goal is to create actionable task lists in markdown format.' });

      if (text) {
        const newNote = {
          id: uid(),
          title: `Tasks for "${projectDescription.substring(0, 20)}..."`,
          content: text,
          createdAt: nowTs(),
          updatedAt: nowTs(),
        };
        const updated = [newNote, ...notes].slice(0, MAX_NOTES);
        setNotes(updated);
        setSelectedId(newNote.id);
        setEditMode(false); // Switch to read mode to see the checklist
        setProjectDescription(''); // Clear the input
        UI.toast('Task list generated!', { type: 'success' });
      } else {
        throw new Error('LLM returned an empty response.');
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      UI.toast(error.message || 'Failed to generate tasks from LLM.', { type: 'error' });
    } finally {
      setIsGenerating(false);
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
    <div className="tool-root mknp-wrap">
      <ToolHeader title="Markdown Notepad" subtitle="Quick notes with markdown + checklists" />

      <div className="flex justify-between items-center p-3 border-b">
        <div className="flex gap-2">
          <button className="btn small primary" onClick={addNote}>New Note</button>
          {current && (
            <button className="btn small danger" onClick={() => deleteNote(current.id)}>Delete</button>
          )}
        </div>
        <div className="flex gap-2">
           <div className="segmented">
            <button className={`segmented-item ${!editMode ? 'active' : ''}`} onClick={() => setEditMode(false)}>Read</button>
            <button className={`segmented-item ${editMode ? 'active' : ''}`} onClick={() => setEditMode(true)}>Edit</button>
           </div>
        </div>
      </div>

      <div className="tool-split">
        {/* Sidebar: Notes List */}
        <div className="tool-pane" style={{ flex: '0 0 300px' }}>
          <div className="tool-pane-header">All Notes</div>
          <div className="tool-pane-content p-0">
            {notes.length === 0 && <div className="p-4 text-muted text-center">No notes yet</div>}
            <div className="flex flex-col">
            {notes.map((n) => (
              <div 
                key={n.id} 
                className={`p-3 border-b cursor-pointer transition-colors`}
                style={{
                  borderLeft: n.id === current?.id ? '4px solid var(--accent)' : '4px solid transparent',
                  background: n.id === current?.id ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'transparent'
                }}
                onClick={() => selectNote(n.id)}
              >
                <div className="font-medium truncate">{n.title || 'Untitled note'}</div>
                <div className="text-small text-muted" title={fmtDate(n.updatedAt)}> {new Date(n.updatedAt).toLocaleDateString()} </div>
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Main: Editor/Preview */}
        <div className="tool-pane flex-1">
          {current ? (
            <>
              <div className="tool-pane-header p-2">
                <input 
                  className="input border-0 w-full" 
                  style={{ background: 'transparent', fontWeight: 600, fontSize: '1.1em', boxShadow: 'none' }}
                  placeholder="Note Title" 
                  value={title} 
                  onChange={(e) => saveTitle(e.target.value)} 
                />
              </div>
              <div className="tool-pane-content p-0 flex flex-col h-full">
                {editMode ? (
                  <textarea 
                    className="textarea flex-1 border-0 h-full w-full" 
                    style={{ resize: 'none', borderRadius: 0, boxShadow: 'none', padding: '16px' }}
                    value={content} 
                    onChange={(e) => saveContent(e.target.value)} 
                    spellCheck="false" 
                    placeholder="Write Markdown here…" 
                  />
                ) : (
                  <div className="mknp-preview mknp-markdown flex-1 overflow-auto p-4" onClick={onPreviewClick}>
                    <article dangerouslySetInnerHTML={{ __html: rendered }} />
                  </div>
                )}
                
                {/* AI Generator at bottom of editor pane */}
                <div className="border-t p-3">
                   <div className="flex gap-2 items-start">
                      <textarea
                        className="input text-small flex-1"
                        style={{ minHeight: 40, resize: 'none' }}
                        rows={1}
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="✨ AI: Describe a project to generate a task list..."
                        disabled={isGenerating}
                      />
                      <button
                        className="btn small primary"
                        onClick={handleGenerateTasks}
                        disabled={isGenerating || !projectDescription.trim()}
                      >
                        {isGenerating ? '...' : 'Generate'}
                      </button>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex center h-full text-muted">Select or create a note</div>
          )}
        </div>
      </div>
    </div>
  );
}
