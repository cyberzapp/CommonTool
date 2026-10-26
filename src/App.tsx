import React, { useState, useEffect, useCallback } from 'react';
import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolCategoryId,
  type ToolId,
} from './types/tools';
import { auth, onAuthStateChanged, type User } from './lib/firebase';
import { updatePageSeo } from './lib/seo';
import { CloudSyncModal } from './components/CloudSyncModal';
import { CommandPalette } from './components/CommandPalette';
import { InteractiveLanding } from './components/InteractiveLanding';
import {
  InfoPages,
  STATIC_PAGES_META,
  type StaticPageId,
} from './components/InfoPages';

// 18 Tool Modules
import { PdfMultiTool } from './components/tools/PdfMultiTool';
import { PdfOrganizer } from './components/tools/PdfOrganizer';
import { MediaConverter } from './components/tools/MediaConverter';
import { OcrScanner } from './components/tools/OcrScanner';
import { InvoiceGenerator } from './components/tools/InvoiceGenerator';
import { BusinessTemplates } from './components/tools/BusinessTemplates';
import { FinancialCalculators } from './components/tools/FinancialCalculators';
import { LoanEmiPlanner } from './components/tools/LoanEmiPlanner';
import { BrandingUtilities } from './components/tools/BrandingUtilities';
import { CitationFormatter } from './components/tools/CitationFormatter';
import { MathSolver } from './components/tools/MathSolver';
import { DataWorkbench } from './components/tools/DataWorkbench';
import { WritingAids } from './components/tools/WritingAids';
import { MarkdownStudio } from './components/tools/MarkdownStudio';
import { PomodoroTimer } from './components/tools/PomodoroTimer';
import { ScratchpadChecklist } from './components/tools/ScratchpadChecklist';
import { PrivacySecurity } from './components/tools/PrivacySecurity';
import { DevDiagnostics } from './components/tools/DevDiagnostics';
import { AiSolutions } from './components/tools/AiSolutions';

import {
  ShieldCheck,
  Search,
  Cloud,
  LayoutGrid,
  FileText,
  Briefcase,
  GraduationCap,
  Zap,
  Wrench,
  ArrowLeft,
  Sun,
  Moon,
  Menu,
  X,
  Download,
  Smartphone,
  Share2,
  Check,
  Heart,
  Mail,
  BookOpen,
  Maximize2,
  Minimize2,
  Command as CommandIcon,
  ChevronDown,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function parseLocationRoute(): {
  toolId: ToolId | null;
  categoryId: ToolCategoryId;
  staticPageId: StaticPageId | null;
  pathname: string;
} {
  const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(window.location.search);

  const queryTool = params.get('tool') as ToolId | null;
  if (queryTool && TOOLS_CATALOG.some((t) => t.id === queryTool)) {
    const cleanPath = `/tools/${queryTool}`;
    window.history.replaceState({}, '', cleanPath);
    return { toolId: queryTool, categoryId: 'all', staticPageId: null, pathname: cleanPath };
  }

  const trimmedSlug = rawPath.slice(1) as StaticPageId;
  if (trimmedSlug in STATIC_PAGES_META) {
    return {
      toolId: null,
      categoryId: 'all',
      staticPageId: trimmedSlug,
      pathname: STATIC_PAGES_META[trimmedSlug].path,
    };
  }

  if (rawPath.startsWith('/tools/')) {
    const slug = rawPath.replace('/tools/', '') as ToolId;
    const found = TOOLS_CATALOG.find((t) => t.id === slug);
    if (found) {
      return { toolId: found.id, categoryId: found.category, staticPageId: null, pathname: found.path };
    }
  }

  if (rawPath.startsWith('/category/')) {
    const catSlug = rawPath.replace('/category/', '') as ToolCategoryId;
    if (['documents', 'business', 'academic', 'productivity'].includes(catSlug)) {
      return { toolId: null, categoryId: catSlug, staticPageId: null, pathname: `/category/${catSlug}` };
    }
  }

  return { toolId: null, categoryId: 'all', staticPageId: null, pathname: '/' };
}

export function App() {
  const initialRoute = parseLocationRoute();
  const [selectedCategory, setSelectedCategory] = useState<ToolCategoryId>(initialRoute.categoryId);
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(initialRoute.toolId);
  const [activeStaticPage, setActiveStaticPage] = useState<StaticPageId | null>(initialRoute.staticPageId);
  const [guideToolId, setGuideToolId] = useState<ToolId | null>(initialRoute.toolId);
  const [currentPathname, setCurrentPathname] = useState<string>(initialRoute.pathname);

  const [searchQuery, setSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isWideWorkspace, setIsWideWorkspace] = useState<boolean>(() => {
    return localStorage.getItem('commontool_wide_workspace') === 'true';
  });

  const [user, setUser] = useState<User | null>(null);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pwaHelpOpen, setPwaHelpOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('commontool_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('commontool_theme', theme);
    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#09090b' : '#f8fafc');
    }
  }, [theme]);

  // Persist wide workspace setting
  useEffect(() => {
    localStorage.setItem('commontool_wide_workspace', isWideWorkspace ? 'true' : 'false');
  }, [isWideWorkspace]);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Listen for Post-Download Completion events across all utilities
  useEffect(() => {
    const handleDownloadComplete = () => {
      setActiveToolId(null);
      setActiveStaticPage('download-success');
      setCurrentPathname('/download-success');
      window.history.pushState({}, '', '/download-success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('commontool-download-complete', handleDownloadComplete);
    return () => window.removeEventListener('commontool-download-complete', handleDownloadComplete);
  }, []);

  useEffect(() => {
    if (activeStaticPage) {
      const meta = STATIC_PAGES_META[activeStaticPage];
      document.title = meta.seoTitle;
    } else {
      updatePageSeo({
        toolId: activeToolId,
        categoryId: selectedCategory,
        pathname: currentPathname,
      });
    }
  }, [activeToolId, selectedCategory, activeStaticPage, currentPathname]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseLocationRoute();
      setActiveToolId(parsed.toolId);
      setSelectedCategory(parsed.categoryId);
      setActiveStaticPage(parsed.staticPageId);
      setCurrentPathname(parsed.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const navigateToTool = useCallback((id: ToolId | null, e?: React.MouseEvent) => {
    if (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
    }
    const targetPath = id ? `/tools/${id}` : '/';
    window.history.pushState({}, '', targetPath);
    setActiveStaticPage(null);
    setActiveToolId(id);
    if (id) {
      setGuideToolId(id);
      const found = TOOLS_CATALOG.find((t) => t.id === id);
      if (found) setSelectedCategory(found.category);
    }
    setCurrentPathname(targetPath);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToCategory = useCallback((cat: ToolCategoryId, e?: React.MouseEvent) => {
    if (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
    }
    const targetPath = cat === 'all' ? '/' : `/category/${cat}`;
    window.history.pushState({}, '', targetPath);
    setActiveStaticPage(null);
    setActiveToolId(null);
    setSelectedCategory(cat);
    setCurrentPathname(targetPath);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToStaticPage = useCallback(
    (page: StaticPageId, e?: React.MouseEvent, forToolId?: ToolId) => {
      if (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
      }
      if (forToolId) {
        setGuideToolId(forToolId);
      } else if (activeToolId) {
        setGuideToolId(activeToolId);
      }
      const targetPath = STATIC_PAGES_META[page].path;
      window.history.pushState({}, '', targetPath);
      setActiveToolId(null);
      setActiveStaticPage(page);
      setCurrentPathname(targetPath);
      setMobileMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [activeToolId]
  );

  const handleInstallPwaClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setPwaHelpOpen(true);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1800);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const activeToolMeta = TOOLS_CATALOG.find((t) => t.id === activeToolId);

  const renderActiveTool = () => {
    switch (activeToolId) {
      case 'pdf-multitool':
        return <PdfMultiTool />;
      case 'pdf-organizer':
        return <PdfOrganizer />;
      case 'media-converter':
        return <MediaConverter />;
      case 'ocr-scanner':
        return <OcrScanner />;
      case 'invoice-generator':
        return <InvoiceGenerator />;
      case 'business-templates':
        return <BusinessTemplates />;
      case 'financial-calculators':
        return <FinancialCalculators />;
      case 'loan-emi-planner':
        return <LoanEmiPlanner />;
      case 'branding-utilities':
        return <BrandingUtilities />;
      case 'citation-formatter':
        return <CitationFormatter />;
      case 'math-solver':
        return <MathSolver />;
      case 'data-workbench':
        return <DataWorkbench />;
      case 'writing-aids':
        return <WritingAids />;
      case 'markdown-studio':
        return <MarkdownStudio />;
      case 'pomodoro-timer':
        return <PomodoroTimer />;
      case 'scratchpad-checklist':
        return <ScratchpadChecklist />;
      case 'privacy-security':
        return <PrivacySecurity />;
      case 'dev-diagnostics':
        return <DevDiagnostics />;
      case 'ai-solutions':
        return <AiSolutions />;
      default:
        return null;
    }
  };

  const CATEGORIES: Array<{
    id: ToolCategoryId;
    path: string;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    count: number;
  }> = [
    { id: 'all', path: '/', label: 'All Utilities', shortLabel: 'All', icon: LayoutGrid, count: TOOLS_CATALOG.length },
    { id: 'documents', path: '/category/documents', label: 'Documents & Files', shortLabel: 'Files', icon: FileText, count: 4 },
    { id: 'business', path: '/category/business', label: 'Business & Finance', shortLabel: 'Business', icon: Briefcase, count: 5 },
    { id: 'academic', path: '/category/academic', label: 'Student & Academic', shortLabel: 'Academic', icon: GraduationCap, count: 5 },
    { id: 'productivity', path: '/category/productivity', label: 'Daily Productivity', shortLabel: 'Daily', icon: Zap, count: 4 },
  ];

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 transition-colors duration-150 ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* ========================================================================= */}
      {/* UNIFIED STUDIO NAVBAR (Sleek, Single-Header Experience for Both Modes)   */}
      {/* ========================================================================= */}
      <header
        className={`sticky top-0 z-30 w-full backdrop-blur-md border-b px-2.5 sm:px-6 transition-colors ${
          isDark
            ? 'bg-[#09090b]/92 border-zinc-800/80 shadow-xs shadow-black/40'
            : 'bg-white/92 border-slate-200/90 shadow-xs shadow-slate-900/5'
        }`}
      >
        <div
          className={`${
            activeToolId && isWideWorkspace ? 'w-full' : 'max-w-7xl'
          } mx-auto flex items-center justify-between gap-1.5 sm:gap-2.5 h-13 min-w-0 transition-all`}
        >
          {/* Left Group: Logo or Studio Breadcrumb */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
            {activeToolId && activeToolMeta ? (
              /* Studio Mode: Breadcrumb with Quick Switcher */
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <a
                  href="/"
                  onClick={(e) => navigateToCategory('all', e)}
                  title="Return to All Tools"
                  className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 min-h-[36px] touch-manipulation ${
                    isDark
                      ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                      : 'bg-slate-100/80 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">All Tools</span>
                </a>

                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-800 shrink-0 hidden sm:block" />

                {/* Tool Selector Dropdown */}
                <div className="relative flex items-center min-w-0">
                  <select
                    aria-label="Switch active tool"
                    value={activeToolId}
                    onChange={(e) => navigateToTool(e.target.value as ToolId)}
                    className={`text-xs font-bold pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 rounded-lg border appearance-none cursor-pointer truncate max-w-[125px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-none transition min-h-[36px] ${
                      isDark
                        ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100 hover:border-zinc-700'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {TOOLS_CATALOG.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.shortTitle}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 absolute right-1.5 sm:right-2 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            ) : (
              /* Catalog Mode: Brand Logo & Navigation Links */
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open all tools menu"
                  className={`lg:hidden p-2 rounded-lg border transition cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Menu className="w-4 h-4 shrink-0" />
                </button>

                <a
                  href="/"
                  onClick={(e) => navigateToCategory('all', e)}
                  className="flex items-center gap-2 cursor-pointer group min-w-0 shrink-0"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-105">
                    <Wrench className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="text-sm sm:text-base font-bold tracking-tight truncate">
                    CommonTool
                  </span>
                </a>

                {/* Top Nav Links for Desktop */}
                <nav className="hidden xl:flex items-center gap-1 ml-2">
                  {(['how-to-use', 'about', 'security', 'faq', 'help-and-support'] as StaticPageId[]).map((pid) => (
                    <a
                      key={pid}
                      href={STATIC_PAGES_META[pid].path}
                      onClick={(e) => navigateToStaticPage(pid, e)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                        activeStaticPage === pid
                          ? 'bg-indigo-600 text-white'
                          : isDark
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      {STATIC_PAGES_META[pid].label}
                    </a>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Center Group: Command Palette Search Bar (Cmd+K) */}
          <div className="flex-1 max-w-[38px] sm:max-w-xs md:max-w-md mx-1 sm:mx-2 min-w-0">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search tools and guides"
              className={`w-full flex items-center justify-center sm:justify-between gap-2 p-2 sm:px-3 sm:py-1.5 min-h-[36px] rounded-xl border text-xs transition cursor-pointer touch-manipulation ${
                isDark
                  ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'bg-slate-100/70 hover:bg-slate-200/70 border-slate-200 text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline truncate">
                  {activeToolId ? 'Jump to tool...' : 'Search 18 tools, guides...'}
                </span>
              </div>
              <kbd
                className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-medium ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                <CommandIcon className="w-2.5 h-2.5 shrink-0" /> K
              </kbd>
            </button>
          </div>

          {/* Right Group: Studio Controls & Platform Utilities */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {activeToolId ? (
              /* Studio Mode Actions */
              <>
                <span
                  className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    isDark
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                  title="All files and data are processed locally inside your web browser. Nothing is uploaded."
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>100% On-Device</span>
                </span>

                <button
                  onClick={() => setIsWideWorkspace(!isWideWorkspace)}
                  title={isWideWorkspace ? 'Standard width (Centered)' : 'Expand workspace (Full width)'}
                  className={`hidden sm:inline-flex items-center justify-center p-2 min-h-[36px] min-w-[36px] rounded-lg border text-xs font-semibold transition cursor-pointer touch-manipulation ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {isWideWorkspace ? (
                    <Minimize2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  )}
                </button>

                <button
                  onClick={copyShareUrl}
                  title="Share this tool"
                  className={`inline-flex items-center justify-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold transition cursor-pointer touch-manipulation ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span className="hidden lg:inline text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 shrink-0 text-indigo-500" />
                      <span className="hidden lg:inline">Share</span>
                    </>
                  )}
                </button>

                <a
                  href="/how-to-use"
                  onClick={(e) => navigateToStaticPage('how-to-use', e, activeToolMeta?.id)}
                  title="Step-by-step documentation for this tool"
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-indigo-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-600'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Guides</span>
                </a>
              </>
            ) : (
              /* Catalog Mode Actions */
              <>
                <a
                  href="/donate"
                  onClick={(e) => navigateToStaticPage('donate', e)}
                  title="Support CommonTool development"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  <Heart className="w-3.5 h-3.5 shrink-0 fill-white" />
                  <span>Donate</span>
                </a>

                <button
                  onClick={handleInstallPwaClick}
                  title="Install CommonTool App"
                  className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span>Install</span>
                </button>
              </>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer touch-manipulation ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-amber-400'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0 text-slate-600" />}
            </button>

            {/* Cloud Sync Status */}
            <button
              onClick={() => setCloudModalOpen(true)}
              aria-label="Cloud Sync"
              className={`p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border transition cursor-pointer touch-manipulation ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Cloud className={`w-4 h-4 shrink-0 ${user ? 'text-emerald-500' : 'text-indigo-500'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT ARCHITECTURE                                               */}
      {/* ========================================================================= */}
      {activeToolId && activeToolMeta ? (
        /* ----------------------------------------------------------------------- */
        /* 1. DEDICATED STUDIO WORKSPACE (100% Uncluttered, Full-Width Focus)       */
        /* ----------------------------------------------------------------------- */
        <main
          className={`flex-1 w-full transition-all ${
            isWideWorkspace ? 'px-2 sm:px-6 py-3' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6'
          }`}
        >
          {/* Active Tool Canvas */}
          <div className="w-full min-w-0">{renderActiveTool()}</div>

          {/* Minimalist Studio Status Footer */}
          <footer
            className={`mt-10 pt-4 pb-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs transition ${
              isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-400 dark:text-zinc-400">
                CommonTool Studio • 100% Client-Side In-Memory Processing (Zero Server Uploads)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <a
                href="/how-to-use"
                onClick={(e) => navigateToStaticPage('how-to-use', e, activeToolMeta.id)}
                className="hover:underline text-indigo-400 font-medium"
              >
                How to Use {activeToolMeta.shortTitle}
              </a>
              <a
                href="/security"
                onClick={(e) => navigateToStaticPage('security', e)}
                className="hover:underline"
              >
                Security & Privacy
              </a>
              <a
                href="/donate"
                onClick={(e) => navigateToStaticPage('donate', e)}
                className="hover:underline text-rose-500 font-semibold"
              >
                Donate ❤️
              </a>
            </div>
          </footer>
        </main>
      ) : activeStaticPage ? (
        /* ----------------------------------------------------------------------- */
        /* 2. STATIC READING / GUIDE PAGES                                         */
        /* ----------------------------------------------------------------------- */
        <main className="max-w-5xl w-full mx-auto flex-1 px-3 sm:px-6 lg:px-8 py-6 space-y-6">
          <a
            href="/"
            onClick={(e) => navigateToCategory('all', e)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Tools
          </a>
          <InfoPages
            pageId={activeStaticPage}
            isDark={isDark}
            onNavigatePage={navigateToStaticPage}
            onNavigateTool={navigateToTool}
            initialGuideToolId={guideToolId}
          />
        </main>
      ) : (
        /* ----------------------------------------------------------------------- */
        /* 3. CATALOG & DISCOVERY DASHBOARD                                        */
        /* ----------------------------------------------------------------------- */
        <div className="max-w-7xl w-full mx-auto flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-w-0">
          {/* Desktop Left Sidebar for Catalog Browsing */}
          <aside className="hidden lg:block lg:col-span-3 space-y-5 min-w-0">
            <div className="space-y-1">
              <p
                className={`px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-500' : 'text-slate-500'
                }`}
              >
                Categories
              </p>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <a
                    key={cat.id}
                    href={cat.path}
                    onClick={(e) => navigateToCategory(cat.id, e)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span
                      className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isDark
                          ? 'text-zinc-500'
                          : 'text-slate-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="space-y-1">
              <p
                className={`px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-500' : 'text-slate-500'
                }`}
              >
                All 18 Tools
              </p>
              <div className="space-y-0.5 max-h-[300px] overflow-y-auto pr-1">
                {TOOLS_CATALOG.map((tool) => (
                  <a
                    key={tool.id}
                    href={tool.path}
                    onClick={(e) => navigateToTool(tool.id, e)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                      isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{tool.shortTitle}</span>
                  </a>
                ))}
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 space-y-2 ${
                isDark
                  ? 'bg-[#121215] border-zinc-800/90 text-zinc-400'
                  : 'bg-white border-slate-200/90 text-slate-600 shadow-xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  isDark ? 'text-zinc-200' : 'text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                100% On-Device Privacy
              </div>
              <p className="text-[11px] leading-relaxed">
                Every file is processed locally in your browser. Nothing is uploaded.
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Coming Soon: iOS & Android Apps</span>
              </div>
            </div>
          </aside>

          {/* Main Catalog Viewport */}
          <main className="lg:col-span-9 space-y-6 min-w-0">
            <InteractiveLanding
              isDark={isDark}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onNavigateTool={navigateToTool}
              onSelectCategory={navigateToCategory}
              onNavigatePage={navigateToStaticPage}
            />

            {/* Clean Crawlable Footer for Catalog Browsing */}
            <footer
              className={`mt-12 pt-8 border-t space-y-6 text-xs ${
                isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p
                    className={`font-bold uppercase tracking-wider text-[11px] ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Document & Media
                  </p>
                  <ul className="space-y-1.5">
                    {TOOLS_CATALOG.filter((t) => t.category === 'documents').map((t) => (
                      <li key={t.id}>
                        <a href={t.path} onClick={(e) => navigateToTool(t.id, e)} className="hover:underline">
                          {t.shortTitle}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p
                    className={`font-bold uppercase tracking-wider text-[11px] ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Business & Finance
                  </p>
                  <ul className="space-y-1.5">
                    {TOOLS_CATALOG.filter((t) => t.category === 'business').map((t) => (
                      <li key={t.id}>
                        <a href={t.path} onClick={(e) => navigateToTool(t.id, e)} className="hover:underline">
                          {t.shortTitle}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p
                    className={`font-bold uppercase tracking-wider text-[11px] ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Academic & Productivity
                  </p>
                  <ul className="space-y-1.5">
                    {TOOLS_CATALOG.filter((t) => t.category === 'academic' || t.category === 'productivity')
                      .slice(0, 6)
                      .map((t) => (
                        <li key={t.id}>
                          <a href={t.path} onClick={(e) => navigateToTool(t.id, e)} className="hover:underline">
                            {t.shortTitle}
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p
                    className={`font-bold uppercase tracking-wider text-[11px] ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Company, Legal & Support
                  </p>
                  <ul className="space-y-1.5">
                    {(Object.keys(STATIC_PAGES_META) as StaticPageId[]).map((pid) => (
                      <li key={pid}>
                        <a
                          href={STATIC_PAGES_META[pid].path}
                          onClick={(e) => navigateToStaticPage(pid, e)}
                          className="hover:underline"
                        >
                          {STATIC_PAGES_META[pid].label}
                        </a>
                      </li>
                    ))}
                    <li>
                      <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:underline">
                        XML Sitemap
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Contact & Coming Soon Mobile Apps Row */}
              <div
                className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      isDark ? 'text-zinc-200' : 'text-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                    Coming Soon: iOS & Android Apps
                  </span>
                  <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">|</span>
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <a href="mailto:contact@breathy.in" className="font-semibold text-indigo-500 hover:underline">
                      contact@breathy.in
                    </a>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Support:{' '}
                    <a href="mailto:support@breathy.in" className="font-semibold text-indigo-500 hover:underline">
                      support@breathy.in
                    </a>
                  </span>
                </div>

                <a
                  href="/donate"
                  onClick={(e) => navigateToStaticPage('donate', e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                >
                  <Heart className="w-3.5 h-3.5 fill-white" />
                  Support CommonTool
                </a>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                <p>© {new Date().getFullYear()} CommonTool. Free Client-Side Utility Suite.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="/how-to-use" onClick={(e) => navigateToStaticPage('how-to-use', e)} className="hover:underline font-medium">
                    How to Use
                  </a>
                  <a href="/donate" onClick={(e) => navigateToStaticPage('donate', e)} className="hover:underline text-rose-500 font-semibold">
                    Donate ❤️
                  </a>
                  <a href="/privacy-policy" onClick={(e) => navigateToStaticPage('privacy-policy', e)} className="hover:underline">
                    Privacy Policy
                  </a>
                  <a href="/terms-and-conditions" onClick={(e) => navigateToStaticPage('terms-and-conditions', e)} className="hover:underline">
                    Terms
                  </a>
                  <a href="/help-and-support" onClick={(e) => navigateToStaticPage('help-and-support', e)} className="hover:underline">
                    Support
                  </a>
                </div>
              </div>
            </footer>
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION                                                 */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile category navigation"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)] ${
          isDark ? 'bg-[#09090b]/95 border-zinc-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="grid grid-cols-5 h-14">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive =
              (activeToolId === null && activeStaticPage === null && selectedCategory === cat.id) ||
              (activeToolMeta && activeToolMeta.category === cat.id);
            return (
              <a
                key={cat.id}
                href={cat.path}
                onClick={(e) => navigateToCategory(cat.id, e)}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition touch-manipulation active:scale-95 select-none ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-[56px] text-center">{cat.shortLabel}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className={`relative z-10 w-72 max-w-[82vw] h-full overflow-y-auto p-4 space-y-5 border-r ${
              isDark ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <span className="text-sm font-bold">All 18 Tools & Guides</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4 shrink-0" />
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href="/how-to-use"
                onClick={(e) => navigateToStaticPage('how-to-use', e)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                How to Use
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleInstallPwaClick();
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Download className="w-4 h-4 shrink-0 text-indigo-500" />
                Install App
              </button>
            </div>

            <div className="space-y-1">
              {TOOLS_CATALOG.map((tool) => {
                const isCurrent = activeToolId === tool.id;
                return (
                  <a
                    key={tool.id}
                    href={tool.path}
                    onClick={(e) => navigateToTool(tool.id, e)}
                    className={`w-full text-left px-3 py-2.5 min-h-[40px] rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isDark
                        ? 'text-zinc-300 hover:bg-zinc-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tool.shortTitle}</span>
                  </a>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase text-slate-500">Guides, Company & Legal</p>
              {(Object.keys(STATIC_PAGES_META) as StaticPageId[]).map((pid) => (
                <a
                  key={pid}
                  href={STATIC_PAGES_META[pid].path}
                  onClick={(e) => navigateToStaticPage(pid, e)}
                  className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  {STATIC_PAGES_META[pid].label}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 text-[11px] space-y-1 px-3">
              <p className="font-semibold text-indigo-500">Coming Soon: iOS & Android Apps</p>
              <p className="text-slate-500">contact@breathy.in • support@breathy.in</p>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Modal */}
      {pwaHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-xl ${
              isDark ? 'bg-[#121215] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold">Install CommonTool App</h3>
              </div>
              <button onClick={() => setPwaHelpOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`text-xs space-y-2.5 leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-semibold">
                Native iOS & Android Apps are Coming Soon! You can also install the offline PWA right now:
              </div>
              <p>
                <strong>iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> icon in the browser bar and choose <strong>Add to Home Screen</strong>.
              </p>
              <p>
                <strong>Android (Chrome):</strong> Tap the three-dot browser menu and tap <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
              </p>
              <p>
                <strong>Desktop (Chrome / Edge / Safari):</strong> Click the install icon in the address bar (or File → Add to Dock).
              </p>
            </div>
            <button
              onClick={() => setPwaHelpOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        isDark={isDark}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTool={navigateToTool}
        onNavigateCategory={navigateToCategory}
        onNavigatePage={navigateToStaticPage}
      />

      <CloudSyncModal
        isOpen={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
        user={user}
      />
    </div>
  );
}
export default App;
