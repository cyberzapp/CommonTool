import React, { useState, useEffect } from 'react';
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
  Sparkles,
  BarChart3,
  ShieldCheck,
  Lock,
  ArrowRight,
  LineChart,
  Layers,
  Database,
  Cpu,
  Image as ImageIcon,
  Eye,
  FileSpreadsheet,
  Calculator,
  CreditCard,
  Palette,
  Binary,
  Type,
  FileCode,
  Clock,
  CheckSquare,
  Terminal,
  X,
  CheckCircle2,
} from 'lucide-react';
import type { StaticPageId } from './InfoPages';

interface InteractiveLandingProps {
  isDark: boolean;
  selectedCategory: ToolCategoryId;
  searchQuery: string;
  onNavigateTool: (id: ToolId, e?: React.MouseEvent, viewMode?: 'workspace' | 'landing') => void;
  onSelectCategory: (cat: ToolCategoryId, e?: React.MouseEvent) => void;
  onNavigatePage?: (page: StaticPageId, e?: React.MouseEvent) => void;
}

const CATEGORY_PILLS: Array<{
  id: ToolCategoryId;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}> = [
  { id: 'all', label: 'All Utilities', shortLabel: 'All', icon: LayoutGrid },
  { id: 'documents', label: 'Documents & Files', shortLabel: 'Files', icon: FileText },
  { id: 'business', label: 'Business & Finance', shortLabel: 'Business', icon: Briefcase },
  { id: 'academic', label: 'Student & Academic', shortLabel: 'Academic', icon: GraduationCap },
  { id: 'productivity', label: 'Productivity & Dev', shortLabel: 'Daily', icon: Zap },
];

const TOOL_ICON_MAP: Record<
  ToolId,
  { icon: React.ElementType; color: string; bg: string }
> = {
  'pdf-multitool': { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
  'pdf-organizer': { icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  'media-converter': { icon: ImageIcon, color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  'ocr-scanner': { icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'invoice-generator': { icon: FileSpreadsheet, color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  'business-templates': { icon: Briefcase, color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/20' },
  'financial-calculators': { icon: Calculator, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
  'loan-emi-planner': { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
  'branding-utilities': { icon: Palette, color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
  'citation-formatter': { icon: GraduationCap, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  'math-solver': { icon: Binary, color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  'data-workbench': { icon: Database, color: 'text-teal-500', bg: 'bg-teal-500/10 border-teal-500/20' },
  'writing-aids': { icon: Type, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
  'markdown-studio': { icon: FileCode, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  'pomodoro-timer': { icon: Clock, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
  'scratchpad-checklist': { icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  'privacy-security': { icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  'dev-diagnostics': { icon: Terminal, color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  'ai-solutions': { icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
};

export const InteractiveLanding: React.FC<InteractiveLandingProps> = ({
  isDark,
  selectedCategory,
  searchQuery,
  onNavigateTool,
  onSelectCategory,
  onNavigatePage,
}) => {
  const [openInfoId, setOpenInfoId] = useState<ToolId | null>(null);
  const [showToast, setShowToast] = useState(true);

  // Auto-dismiss dynamic welcome toast after 4.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowToast(false), 4500);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="space-y-5 sm:space-y-7 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* DYNAMIC WELCOME POP-UP / TOAST (Auto-dismisses in 4.5s)                   */}
      {/* ========================================================================= */}
      {showToast && (
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-black/40 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">
              <strong>100% On-Device Privacy Guaranteed:</strong> Zero file uploads. All 20+ utilities
              process locally in your browser sandbox.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer shrink-0"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}






      {/* ========================================================================= */}
      {/* 2. PLATFORM TRUST STRIP (One-liner for Mobile, 4-stat bar for Desktop)    */}
      {/* ========================================================================= */}
      {/* Mobile-Only Sleek Ticker / Horizontal Pill Bar */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/80 text-[11px] font-semibold text-zinc-300 overflow-x-auto no-scrollbar gap-3 whitespace-nowrap">
        <span className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          100% On-Device
        </span>
        <span className="text-zinc-700">•</span>
        <span className="flex items-center gap-1 text-indigo-400">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          {TOOLS_CATALOG.length} Pro Utilities
        </span>
        <span className="text-zinc-700">•</span>
        <span className="flex items-center gap-1 text-amber-400">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          $0 Free Forever
        </span>
      </div>

      {/* Desktop 4-stat grid */}
      <div
        className={`hidden sm:grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-2xl border ${
          isDark
            ? 'bg-[#121215]/80 border-zinc-800/80 text-zinc-400'
            : 'bg-white border-slate-200/90 text-slate-600 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 px-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              100% On-Device
            </p>
            <p className="text-[10px] truncate text-slate-400">Zero server uploads</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              {TOOLS_CATALOG.length} Pro Utilities
            </p>
            <p className="text-[10px] truncate text-slate-400">PDF, Media, Data & Dev</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              $0 Free Forever
            </p>
            <p className="text-[10px] truncate text-slate-400">Zero paywalls or watermarks</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2">
          <Cpu className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className={`text-xs font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              WebAssembly Core
            </p>
            <p className="text-[10px] truncate text-slate-400">Native CPU processing speed</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CATALOG CATEGORY FILTER & SEARCH BAR                                   */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2
            className={`text-base sm:text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}
          >
            {activeCategoryMeta ? activeCategoryMeta.label : 'All Workspace Utilities'}
          </h2>
          <p className="text-xs text-slate-400">
            Select any tool to launch the local sandbox • 100% private in-browser execution
          </p>
        </div>

        {onNavigatePage && (
          <a
            href="/how-to-use"
            onClick={(e) => onNavigatePage('how-to-use', e)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition self-start sm:self-auto touch-manipulation cursor-pointer ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-2xs'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>How to Use Guides</span>
          </a>
        )}
      </div>

      {/* Segmented Category Pill Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {CATEGORY_PILLS.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={(e) => onSelectCategory(cat.id, e)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 touch-manipulation active:scale-95 ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-[#121215] text-zinc-400 border border-zinc-800/80 hover:text-zinc-200 hover:bg-zinc-900'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. OPTIMIZED TOOL GRID (Focused on Icons + Headings for Mobile)            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTools.map((tool) => {
          const isInfoOpen = openInfoId === tool.id;
          const iconConfig = TOOL_ICON_MAP[tool.id] || {
            icon: Zap,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10 border-indigo-500/20',
          };
          const ToolIcon = iconConfig.icon;

          return (
            <div
              key={tool.id}
              className={`group relative rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between gap-2.5 ${
                isDark
                  ? 'bg-[#121215] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#16161a] hover:shadow-lg hover:shadow-black/30'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md shadow-2xs'
              }`}
            >
              <div className="space-y-2">
                {/* Header: Visual Tool Icon + Badges + Quick Actions */}
                <div className="flex items-start justify-between gap-2.5">
                  <a
                    href={tool.path}
                    onClick={(e) => onNavigateTool(tool.id, e, 'workspace')}
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                  >
                    {/* Prominent Visual Icon Container (Mobile Focus) */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconConfig.bg} ${iconConfig.color}`}
                    >
                      <ToolIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tool.categoryLabel.split(' ')[0]}
                        </span>
                      </div>
                      <h3
                        className={`text-sm sm:text-base font-bold tracking-tight truncate leading-tight group-hover:text-indigo-500 transition ${
                          isDark ? 'text-zinc-100' : 'text-slate-900'
                        }`}
                      >
                        {tool.shortTitle}
                      </h3>
                    </div>
                  </a>

                  {/* Info and Launch Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setOpenInfoId(isInfoOpen ? null : tool.id);
                      }}
                      title="Quick summary"
                      aria-label={`Details for ${tool.shortTitle}`}
                      className={`p-1.5 min-h-[36px] min-w-[36px] rounded-lg transition cursor-pointer flex items-center justify-center touch-manipulation ${
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
                      onClick={(e) => onNavigateTool(tool.id, e, 'workspace')}
                      aria-label={`Open ${tool.shortTitle}`}
                      className={`p-1.5 min-h-[36px] min-w-[36px] rounded-lg transition flex items-center justify-center touch-manipulation ${
                        isDark
                          ? 'text-zinc-500 group-hover:text-white'
                          : 'text-slate-400 group-hover:text-indigo-600'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  </div>
                </div>

                {/* Desktop-only full description paragraph (Hidden on mobile to keep screen ultra-clean!) */}
                <p
                  className={`hidden sm:block text-xs leading-relaxed line-clamp-2 ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}
                >
                  {tool.description}
                </p>
              </div>

              {/* Collapsible Info Drawer / Default Badges Bar */}
              {isInfoOpen ? (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 mt-1 animate-in fade-in duration-150 ${
                    isDark
                      ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <p className="leading-relaxed text-[11px]">{tool.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={(e) => onNavigateTool(tool.id, e, 'landing')}
                      className="text-[11px] font-semibold text-indigo-500 hover:underline cursor-pointer"
                    >
                      Overview & Guide
                    </button>
                    <a
                      href={tool.path}
                      onClick={(e) => onNavigateTool(tool.id, e, 'workspace')}
                      className="text-[11px] font-bold text-indigo-500 hover:underline cursor-pointer"
                    >
                      Open Workspace &rarr;
                    </a>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span
                    className={`line-clamp-1 truncate ${
                      isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}
                  >
                    {tool.badges.slice(0, 2).join(' • ')}
                  </span>
                  <a
                    href={tool.path}
                    onClick={(e) => onNavigateTool(tool.id, e, 'workspace')}
                    className="text-indigo-500 font-semibold shrink-0 group-hover:underline cursor-pointer pl-1"
                  >
                    Open &rarr;
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
