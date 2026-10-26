import React, { useState } from 'react';
import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolId,
  type ToolCategoryId,
} from '../types/tools';
import {
  ArrowUpRight,
  Info,
  FileText,
  Briefcase,
  GraduationCap,
  Zap,
  LayoutGrid,
  BookOpen,
} from 'lucide-react';
import type { StaticPageId } from './InfoPages';

interface InteractiveLandingProps {
  isDark: boolean;
  selectedCategory: ToolCategoryId;
  searchQuery: string;
  onNavigateTool: (id: ToolId, e?: React.MouseEvent) => void;
  onSelectCategory: (cat: ToolCategoryId, e?: React.MouseEvent) => void;
  onNavigatePage?: (page: StaticPageId, e?: React.MouseEvent) => void;
}

const CATEGORY_PILLS: Array<{
  id: ToolCategoryId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'all', label: 'All Tools', icon: LayoutGrid },
  { id: 'documents', label: 'Documents & Media', icon: FileText },
  { id: 'business', label: 'Business & Finance', icon: Briefcase },
  { id: 'academic', label: 'Academic & Data', icon: GraduationCap },
  { id: 'productivity', label: 'Productivity & Dev', icon: Zap },
];

export const InteractiveLanding: React.FC<InteractiveLandingProps> = ({
  isDark,
  selectedCategory,
  searchQuery,
  onNavigateTool,
  onSelectCategory,
  onNavigatePage,
}) => {
  const [openInfoId, setOpenInfoId] = useState<ToolId | null>(null);

  const activeCategoryMeta =
    selectedCategory !== 'all'
      ? CATEGORIES_CATALOG.find((c) => c.id === selectedCategory)
      : null;

  const filteredTools = TOOLS_CATALOG.filter((tool) => {
    const matchesCat = selectedCategory === 'all' || tool.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      tool.title.toLowerCase().includes(q) ||
      tool.shortTitle.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Compact Header & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {activeCategoryMeta ? activeCategoryMeta.label : 'Workspace Utilities'}
          </h1>
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            100% private client-side processing • Select a tool to begin
          </p>
        </div>

        {onNavigatePage && (
          <a
            href="/how-to-use"
            onClick={(e) => onNavigatePage('how-to-use', e)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium transition self-start sm:self-auto touch-manipulation ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>How to Use Guides</span>
          </a>
        )}
      </div>

      {/* Single Clean Category Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {CATEGORY_PILLS.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={(e) => onSelectCategory(cat.id, e)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-[#121215] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Focused, Scannable Tool Grid (Single Redirection Per Tool + Info Icon Popover) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTools.map((tool) => {
          const isInfoOpen = openInfoId === tool.id;
          return (
            <div
              key={tool.id}
              className={`group relative rounded-xl border p-4 transition flex flex-col justify-between gap-2.5 ${
                isDark
                  ? 'bg-[#121215] border-zinc-800/90 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200/90 hover:border-indigo-400 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={tool.path}
                  onClick={(e) => onNavigateTool(tool.id, e)}
                  className="flex-1 min-w-0 space-y-1"
                >
                  <span
                    className={`block text-[10px] font-semibold uppercase tracking-wider ${
                      isDark ? 'text-indigo-400' : 'text-indigo-600'
                    }`}
                  >
                    {tool.categoryLabel}
                  </span>
                  <h2
                    className={`text-sm font-bold tracking-tight truncate ${
                      isDark ? 'text-zinc-100' : 'text-slate-900'
                    }`}
                  >
                    {tool.shortTitle}
                  </h2>
                </a>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setOpenInfoId(isInfoOpen ? null : tool.id);
                    }}
                    title="View tool details"
                    aria-label={`Details for ${tool.shortTitle}`}
                    className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition cursor-pointer flex items-center justify-center touch-manipulation ${
                      isInfoOpen
                        ? 'bg-indigo-600 text-white'
                        : isDark
                        ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0" />
                  </button>

                  <a
                    href={tool.path}
                    onClick={(e) => onNavigateTool(tool.id, e)}
                    aria-label={`Open ${tool.shortTitle}`}
                    className={`p-2 min-h-[36px] min-w-[36px] rounded-lg transition flex items-center justify-center touch-manipulation ${
                      isDark
                        ? 'text-zinc-500 group-hover:text-white'
                        : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Short 1-line summary by default; expands only when (i) is clicked */}
              {isInfoOpen ? (
                <div
                  className={`p-2.5 rounded-lg border text-xs space-y-2 ${
                    isDark
                      ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <p className="leading-relaxed text-[11px]">{tool.description}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-zinc-800">
                    {onNavigatePage && (
                      <a
                        href="/how-to-use"
                        onClick={(e) => onNavigatePage('how-to-use', e)}
                        className="text-[11px] font-semibold text-indigo-500 hover:underline"
                      >
                        Step-by-step guide
                      </a>
                    )}
                    <a
                      href={tool.path}
                      onClick={(e) => onNavigateTool(tool.id, e)}
                      className="text-[11px] font-bold text-indigo-500 hover:underline"
                    >
                      Open Tool →
                    </a>
                  </div>
                </div>
              ) : (
                <a
                  href={tool.path}
                  onClick={(e) => onNavigateTool(tool.id, e)}
                  className={`text-xs line-clamp-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  {tool.badges.slice(0, 3).join(' • ')}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
