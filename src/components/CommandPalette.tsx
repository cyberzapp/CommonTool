import React, { useState, useEffect, useRef } from 'react';
import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolId,
  type ToolCategoryId,
} from '../types/tools';
import { STATIC_PAGES_META, type StaticPageId } from './InfoPages';
import {
  Search,
  Wrench,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Heart,
  LayoutGrid,
  Command,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
  onNavigateTool: (id: ToolId) => void;
  onNavigateCategory: (cat: ToolCategoryId) => void;
  onNavigatePage: (page: StaticPageId) => void;
}

interface PaletteItem {
  id: string;
  type: 'tool' | 'category' | 'page';
  title: string;
  subtitle: string;
  categoryLabel?: string;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  isDark,
  onClose,
  onNavigateTool,
  onNavigateCategory,
  onNavigatePage,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build items based on query
  const q = query.toLowerCase().trim();

  const toolItems: PaletteItem[] = TOOLS_CATALOG.filter((t) => {
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.shortTitle.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }).map((t) => ({
    id: `tool-${t.id}`,
    type: 'tool',
    title: t.title,
    subtitle: t.description,
    categoryLabel: t.categoryLabel,
    badge: 'Tool',
    action: () => {
      onNavigateTool(t.id);
      onClose();
    },
  }));

  const categoryItems: PaletteItem[] = CATEGORIES_CATALOG.filter((c) => {
    if (!q) return false; // only show categories on active search
    return c.label.toLowerCase().includes(q) || c.headline.toLowerCase().includes(q);
  }).map((c) => ({
    id: `cat-${c.id}`,
    type: 'category',
    title: c.label,
    subtitle: c.headline,
    badge: 'Category',
    action: () => {
      onNavigateCategory(c.id);
      onClose();
    },
  }));

  const pageItems: PaletteItem[] = (
    Object.keys(STATIC_PAGES_META) as StaticPageId[]
  )
    .filter((pid) => {
      if (!q) return false;
      const meta = STATIC_PAGES_META[pid];
      return (
        meta.label.toLowerCase().includes(q) ||
        meta.seoTitle.toLowerCase().includes(q) ||
        meta.seoDescription.toLowerCase().includes(q)
      );
    })
    .map((pid) => ({
      id: `page-${pid}`,
      type: 'page',
      title: STATIC_PAGES_META[pid].label,
      subtitle: STATIC_PAGES_META[pid].seoDescription,
      badge: 'Guide',
      action: () => {
        onNavigatePage(pid);
        onClose();
      },
    }));

  const allItems = [...toolItems, ...categoryItems, ...pageItems];

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex((prev) => (allItems.length === 0 ? 0 : Math.min(prev, allItems.length - 1)));
  }, [allItems.length]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDark
            ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          className={`flex items-center gap-3 px-4 py-3.5 border-b ${
            isDark ? 'border-zinc-800 bg-zinc-900/80' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tools, templates, guides (e.g. PDF, OCR, Invoice, EMI)..."
            className={`w-full bg-transparent text-sm outline-hidden placeholder:text-xs ${
              isDark ? 'text-white placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />
          <kbd
            className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-medium ${
              isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            ESC
          </kbd>
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 shrink-0 touch-manipulation"
          >
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent space-y-1"
        >
          {allItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                No matching tools or guides found for "{query}".
              </p>
              <p className="text-xs text-slate-400">
                Try searching for <span className="font-semibold">pdf</span>, <span className="font-semibold">ocr</span>, <span className="font-semibold">invoice</span>, or <span className="font-semibold">convert</span>.
              </p>
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition text-left touch-manipulation ${
                    isSelected
                      ? isDark
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                        : 'bg-indigo-50 border border-indigo-200 text-slate-900'
                      : isDark
                      ? 'hover:bg-zinc-800/60 text-zinc-300 border border-transparent'
                      : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.type === 'tool' ? (
                        <Wrench className="w-4 h-4 shrink-0" />
                      ) : item.type === 'category' ? (
                        <LayoutGrid className="w-4 h-4 shrink-0" />
                      ) : (
                        <BookOpen className="w-4 h-4 shrink-0" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate">{item.title}</span>
                        {item.categoryLabel && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium ${
                              isDark
                                ? 'bg-zinc-800 text-zinc-400'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.categoryLabel}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] truncate ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                        isSelected ? 'translate-x-0.5 text-indigo-500' : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          className={`px-4 py-2 border-t flex items-center justify-between text-[11px] ${
            isDark ? 'border-zinc-800 bg-zinc-950/70 text-zinc-500' : 'border-slate-100 bg-slate-50 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> Select
            </span>
            <span>
              <kbd className="font-mono">ESC</kbd> Close
            </span>
          </div>
          <span className="flex items-center gap-1 font-semibold text-emerald-500">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            100% Zero-Upload
          </span>
        </div>
      </div>
    </div>
  );
};
