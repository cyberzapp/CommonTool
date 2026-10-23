import React, { useState, useEffect } from 'react';
import {
  NotebookPen,
  CheckSquare,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';

interface ScratchNote {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

const NOTES_KEY = 'commontool_scratchpad_notes';
const TASKS_KEY = 'commontool_checklist_items';

export const ScratchpadChecklist: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [notes, setNotes] = useState<ScratchNote[]>(() => {
    try {
      const saved = localStorage.getItem(NOTES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'default-1',
        title: 'Quick Architecture Scratchpad',
        body: '• All notes auto-save to LocalStorage on every keystroke.\n• Zero login required.\n• Optional Firebase Cloud Sync in the top bar backs up notes across devices.',
        updatedAt: new Date().toLocaleTimeString(),
      },
    ];
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id || 'default-1');

  const [tasks, setTasks] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 't1', text: 'Merge Q3 client invoices into single PDF archive', completed: true, priority: 'high' },
      { id: 't2', text: 'Generate mutual NDA for new vendor onboarding', completed: false, priority: 'high' },
      { id: 't3', text: 'Export SVG QR code for product launch booth', completed: false, priority: 'medium' },
    ];
  });

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const reloadFromCloud = () => {
      try {
        const rawNotes = localStorage.getItem(NOTES_KEY);
        if (rawNotes) setNotes(JSON.parse(rawNotes));
        const rawTasks = localStorage.getItem(TASKS_KEY);
        if (rawTasks) setTasks(JSON.parse(rawTasks));
      } catch {
        // ignore
      }
    };
    window.addEventListener('commontool-cloud-pulled', reloadFromCloud);
    return () => window.removeEventListener('commontool-cloud-pulled', reloadFromCloud);
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const updateActiveNote = (field: 'title' | 'body', value: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNote?.id
          ? { ...n, [field]: value, updatedAt: new Date().toLocaleTimeString() }
          : n
      )
    );
  };

  const createNote = () => {
    const created: ScratchNote = {
      id: crypto.randomUUID(),
      title: `Untitled Note ${notes.length + 1}`,
      body: '',
      updatedAt: new Date().toLocaleTimeString(),
    };
    setNotes((prev) => [created, ...prev]);
    setActiveNoteId(created.id);
  };

  const addChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        text: newTaskText.trim(),
        completed: false,
        priority: newTaskPriority,
      },
      ...prev,
    ]);
    setNewTaskText('');
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <NotebookPen className="w-5 h-5 text-lime-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Quick Scratchpad & Priority Checklist</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Saved ({activeNote?.updatedAt || 'Now'})
          </span>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Instant client-side LocalStorage persistence without requiring an account — auto-saved on every keystroke.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-Note Scratchpad (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveNoteId(n.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    n.id === activeNote?.id
                      ? 'bg-lime-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {n.title.slice(0, 22)}
                </button>
              ))}
            </div>
            <button
              onClick={createNote}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-lime-400" />
              New Note
            </button>
          </div>

          {activeNote && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => updateActiveNote('title', e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-white"
                />
                {notes.length > 1 && (
                  <button
                    onClick={() => {
                      const remaining = notes.filter((n) => n.id !== activeNote.id);
                      setNotes(remaining);
                      setActiveNoteId(remaining[0].id);
                    }}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <textarea
                rows={12}
                value={activeNote.body}
                onChange={(e) => updateActiveNote('body', e.target.value)}
                placeholder="Jot down code snippets, meeting notes, calculations, or ideas..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Right: Priority Checklist (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-lime-400" />
              Action Checklist
            </h3>
            <span className="text-xs text-slate-400">
              {completedCount}/{tasks.length} Done
            </span>
          </div>

          <form onSubmit={addChecklistItem} className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
            >
              <option value="high">High</option>
              <option value="medium">Med</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Add
            </button>
          </form>

          <div className="space-y-2 max-h-80 overflow-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800"
              >
                <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() =>
                      setTasks((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                      )
                    }
                  />
                  <span
                    className={`text-xs truncate ${
                      task.completed ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {task.text}
                  </span>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      task.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300'
                        : task.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <button
                    onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
