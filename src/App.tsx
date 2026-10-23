import React, { useState, useEffect, useCallback } from 'react';
import {
  TOOLS_CATALOG,
  type ToolCategoryId,
  type ToolId,
} from './types/tools';
import { auth, onAuthStateChanged, type User } from './lib/firebase';
import { updatePageSeo } from './lib/seo';
import { CloudSyncModal } from './components/CloudSyncModal';
import { InteractiveLanding } from './components/InteractiveLanding';
import { ToolSeoSection } from './components/ToolSeoSection';
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

  // Check static pages (/donate, /about, /security, /privacy-policy, /terms-and-conditions, /faq, /help-and-support)
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
  const [currentPathname, setCurrentPathname] = useState<string>(initialRoute.pathname);

  const [searchQuery, setSearchQuery] = useState('');
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

  const navigateToStaticPage = useCallback((page: StaticPageId, e?: React.MouseEvent) => {
    if (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
    }
    const targetPath = STATIC_PAGES_META[page].path;
    window.history.pushState({}, '', targetPath);
    setActiveToolId(null);
    setActiveStaticPage(page);
    setCurrentPathname(targetPath);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      className={`min-h-screen flex flex-col pb-20 lg:pb-8 transition-colors duration-150 ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Sticky Top Navbar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-colors ${
          isDark
            ? 'bg-[#09090b]/90 border-zinc-800/80'
            : 'bg-white/90 border-slate-200/90'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open all tools menu"
                className={`lg:hidden p-2 rounded-lg border transition cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Menu className="w-4 h-4" />
              </button>

              <a
                href="/"
                onClick={(e) => navigateToCategory('all', e)}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-base font-bold tracking-tight">CommonTool</span>
              </a>

              {/* Top Nav Links for Desktop */}
              <nav className="hidden xl:flex items-center gap-1 ml-4">
                {(['about', 'security', 'faq', 'help-and-support'] as StaticPageId[]).map((pid) => (
                  <a
                    key={pid}
                    href={STATIC_PAGES_META[pid].path}
                    onClick={(e) => navigateToStaticPage(pid, e)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
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

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden md:block relative w-56 lg:w-64">
                <Search
                  className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (activeToolId || activeStaticPage) navigateToCategory('all');
                  }}
                  placeholder="Search 18 tools (PDF, OCR, EMI...)"
                  className={`w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs transition ${
                    isDark
                      ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              <a
                href="/donate"
                onClick={(e) => navigateToStaticPage('donate', e)}
                title="Support CommonTool via Razorpay"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Donate</span>
              </a>

              <button
                onClick={handleInstallPwaClick}
                title="Install CommonTool App"
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Install App</span>
              </button>

              <button
                onClick={toggleTheme}
                aria-label="Toggle Light or Dark theme"
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setCloudModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 ${user ? 'text-emerald-500' : 'text-indigo-500'}`} />
                <span className="hidden sm:inline">{user ? 'Synced' : 'Cloud Sync'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar & Horizontal Category Links */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="relative w-full">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeToolId || activeStaticPage) navigateToCategory('all');
                }}
                placeholder="Search 18 tools (PDF, OCR, Invoice, EMI...)"
                className={`w-full pl-8 pr-8 py-1.5 rounded-lg border text-xs transition ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!activeToolId && !activeStaticPage && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <a
                      key={cat.id}
                      href={cat.path}
                      onClick={(e) => navigateToCategory(cat.id, e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : isDark
                          ? 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {cat.label} ({cat.count})
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl w-full mx-auto flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
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
              const isSelected =
                selectedCategory === cat.id && activeToolId === null && activeStaticPage === null;
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
            <div className="space-y-0.5">
              {TOOLS_CATALOG.map((tool) => {
                const isCurrent = activeToolId === tool.id;
                return (
                  <a
                    key={tool.id}
                    href={tool.path}
                    onClick={(e) => navigateToTool(tool.id, e)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition ${
                      isCurrent
                        ? 'bg-indigo-600 text-white font-semibold'
                        : isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{tool.shortTitle}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 space-y-2.5 ${
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
              Every file is processed locally in your browser via WebAssembly & HTML5 Canvas. Nothing is uploaded.
            </p>
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-500">
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Coming Soon: iOS & Android Apps</span>
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 space-y-2.5 ${
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
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              Support Free Software
            </div>
            <p className="text-[11px] leading-relaxed">
              Help us maintain all 18 utilities free without ads or paywalls.
            </p>
            <a
              href="/donate"
              onClick={(e) => navigateToStaticPage('donate', e)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              Donate via Razorpay
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {activeStaticPage ? (
            <div className="space-y-4">
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
              />
            </div>
          ) : activeToolId && activeToolMeta ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                    All Tools
                  </a>
                  <a
                    href={`/category/${activeToolMeta.category}`}
                    onClick={(e) => navigateToCategory(activeToolMeta.category, e)}
                    className={`hidden sm:inline-block text-xs font-medium hover:underline ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                  >
                    {activeToolMeta.categoryLabel}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyShareUrl}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Share this tool"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Share Tool</span>
                      </>
                    )}
                  </button>

                  <select
                    aria-label="Quick switch tool"
                    value={activeToolId}
                    onChange={(e) => navigateToTool(e.target.value as ToolId)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-200'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    {TOOLS_CATALOG.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.shortTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {renderActiveTool()}

              <ToolSeoSection
                tool={activeToolMeta}
                isDark={isDark}
                onNavigateTool={navigateToTool}
              />
            </div>
          ) : (
            <InteractiveLanding
              isDark={isDark}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onNavigateTool={navigateToTool}
              onSelectCategory={navigateToCategory}
              onNavigatePage={navigateToStaticPage}
            />
          )}

          {/* Comprehensive Crawlable Footer with Legal, Security, Support & Tool Links */}
          <footer
            className={`mt-14 pt-10 border-t space-y-8 text-xs ${
              isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-2.5">
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

              <div className="space-y-2.5">
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

              <div className="space-y-2.5">
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

              <div className="space-y-2.5">
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
              className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${
                    isDark ? 'text-zinc-200' : 'text-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  Coming Soon: Native iOS & Android Apps
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  Contact:{' '}
                  <a href="mailto:contact@breathy.in" className="font-semibold text-indigo-500 hover:underline">
                    contact@breathy.in
                  </a>
                </span>
                <span className="inline-flex items-center gap-1.5">
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

            <div className="pt-6 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px]">
              <p>© {new Date().getFullYear()} CommonTool. Free Client-Side Utility Suite — All Rights Reserved.</p>
              <div className="flex flex-wrap gap-4">
                <a href="/donate" onClick={(e) => navigateToStaticPage('donate', e)} className="hover:underline text-rose-500 font-semibold">
                  Donate ❤️
                </a>
                <a href="/privacy-policy" onClick={(e) => navigateToStaticPage('privacy-policy', e)} className="hover:underline">
                  Privacy Policy
                </a>
                <a href="/terms-and-conditions" onClick={(e) => navigateToStaticPage('terms-and-conditions', e)} className="hover:underline">
                  Terms & Conditions
                </a>
                <a href="/security" onClick={(e) => navigateToStaticPage('security', e)} className="hover:underline">
                  Security Architecture
                </a>
                <a href="/help-and-support" onClick={(e) => navigateToStaticPage('help-and-support', e)} className="hover:underline">
                  Help & Support
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Fixed Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile category navigation"
        className={`lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)] ${
          isDark
            ? 'bg-[#09090b]/95 border-zinc-800'
            : 'bg-white/95 border-slate-200'
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
                className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : isDark
                    ? 'text-zinc-500'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.shortLabel}</span>
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
              <span className="text-sm font-bold">All 18 Tools & Pages</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
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
              <p className="px-3 text-[10px] font-bold uppercase text-slate-500">Company & Legal</p>
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

      <CloudSyncModal
        isOpen={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
        user={user}
      />
    </div>
  );
}
export default App;
