import React, { useState } from 'react';
import {
  TOOLS_CATALOG,
  CATEGORIES_CATALOG,
  type ToolId,
  type ToolCategoryId,
} from '../types/tools';
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Calculator,
  QrCode,
  Sigma,
  ShieldCheck,
  Layers,
  Scissors,
  PenTool,
  ScanText,
  Receipt,
  RefreshCw,
  Stamp,
  Table,
  Terminal,
  Lock,
  Zap,
  Globe,
  Smartphone,
  Heart,
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

export const InteractiveLanding: React.FC<InteractiveLandingProps> = ({
  isDark,
  selectedCategory,
  searchQuery,
  onNavigateTool,
  onSelectCategory,
  onNavigatePage,
}) => {
  // Interactive Widget 1: Live Profit & Margin Calculator
  const [demoCost, setDemoCost] = useState(48);
  const [demoPrice, setDemoPrice] = useState(95);
  const demoProfit = demoPrice - demoCost;
  const demoMargin = demoPrice > 0 ? ((demoProfit / demoPrice) * 100).toFixed(1) : '0.0';
  const demoMarkup = demoCost > 0 ? ((demoProfit / demoCost) * 100).toFixed(1) : '0.0';

  // Interactive Widget 2: Live Brand QR & Color Swatch Previewer
  const [demoBrandColor, setDemoBrandColor] = useState('#4f46e5');
  const BRAND_PRESETS = ['#4f46e5', '#0f172a', '#059669', '#e11d48', '#d97706'];

  // Interactive Widget 3: Live Text & Developer Case Transformer
  const [demoPhrase, setDemoPhrase] = useState('Smart Document & Business Suite');
  const camelPreview = demoPhrase
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : (w[0]?.toUpperCase() || '') + w.slice(1).toLowerCase()))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '');
  const snakePreview = demoPhrase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

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
      tool.description.toLowerCase().includes(q) ||
      tool.keywords.some((k) => k.toLowerCase().includes(q)) ||
      tool.badges.some((b) => b.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Clean, Authoritative Hero Banner */}
      <section
        className={`rounded-2xl border p-6 sm:p-8 space-y-5 ${
          isDark
            ? 'bg-[#121215] border-zinc-800/90'
            : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isDark
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {activeCategoryMeta ? activeCategoryMeta.label : '100% Free • Private On-Device Processing'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
              Coming Soon: Native iOS & Android Apps
            </span>
          </div>
          <span
            className={`text-xs font-medium ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            No Sign-Up Required • Zero Watermarks
          </span>
        </div>

        <div className="max-w-3xl space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {activeCategoryMeta
              ? activeCategoryMeta.headline
              : 'All-in-One Free Online Toolkit for Documents, Business & Academics'}
          </h1>
          <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            {activeCategoryMeta
              ? activeCategoryMeta.subtitle
              : 'Merge, watermark, and e-sign PDFs, convert images and audio, extract text with OCR, generate unbranded invoices, calculate loan EMIs, and solve equations — processed privately in your browser.'}
          </p>
        </div>

        {/* Popular Direct Tool Launch Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { id: 'pdf-multitool' as ToolId, label: 'PDF Merge & Sign', icon: FileText },
            { id: 'pdf-organizer' as ToolId, label: 'PDF Watermark & Bates', icon: Stamp },
            { id: 'ocr-scanner' as ToolId, label: 'OCR Image to Text', icon: ScanText },
            { id: 'invoice-generator' as ToolId, label: 'Invoice Generator', icon: Receipt },
            { id: 'loan-emi-planner' as ToolId, label: 'Loan EMI Calculator', icon: Calculator },
            { id: 'data-workbench' as ToolId, label: 'CSV / Excel / SQL', icon: Table },
            { id: 'branding-utilities' as ToolId, label: 'QR Code Studio', icon: QrCode },
            { id: 'math-solver' as ToolId, label: 'Math Grapher', icon: Sigma },
          ].map((quick) => {
            const Icon = quick.icon;
            return (
              <a
                key={quick.id}
                href={`/tools/${quick.id}`}
                onClick={(e) => onNavigateTool(quick.id, e)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-indigo-500" />
                <span>{quick.label}</span>
              </a>
            );
          })}
        </div>
      </section>

      {/* INTERACTIVE QUICK-START WORKBENCHES */}
      {!searchQuery && selectedCategory === 'all' && (
        <section aria-label="Interactive quick tools" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Interactive Quick Launchers
            </h2>
            <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              Test live or open full tool
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Widget 1: Document & PDF Quick Actions */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                  Document & Media Actions
                </span>
                <h3 className="text-sm font-bold">PDF, Image & OCR Quick Start</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Select a document task to open the corresponding workspace:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { label: 'Merge PDFs', icon: Layers, target: 'pdf-multitool' as ToolId },
                  { label: 'Split PDF', icon: Scissors, target: 'pdf-multitool' as ToolId },
                  { label: 'E-Sign PDF', icon: PenTool, target: 'pdf-multitool' as ToolId },
                  { label: 'Watermark PDF', icon: Stamp, target: 'pdf-organizer' as ToolId },
                  { label: 'HEIC → JPG', icon: RefreshCw, target: 'media-converter' as ToolId },
                  { label: 'OCR Scanner', icon: ScanText, target: 'ocr-scanner' as ToolId },
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <a
                      key={act.label}
                      href={`/tools/${act.target}`}
                      onClick={(e) => onNavigateTool(act.target, e)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1.5 group ${
                        isDark
                          ? 'bg-zinc-900/70 border-zinc-800 hover:border-indigo-500/50'
                          : 'bg-slate-50 border-slate-200/80 hover:border-indigo-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-rose-500 group-hover:scale-110 transition" />
                      <span className="text-xs font-semibold flex items-center justify-between">
                        {act.label}
                        <ArrowRight className="w-3 h-3 opacity-50 group-hover:translate-x-0.5 transition" />
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Widget 2: Live Profit Margin & Invoice Estimator */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Business & Finance
                </span>
                <h3 className="text-sm font-bold">Live Profit Margin & Markup Calculator</h3>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 dark:text-zinc-400">Unit Cost</span>
                      <span className="font-mono-code font-bold">${demoCost}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      value={demoCost}
                      onChange={(e) => setDemoCost(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 dark:text-zinc-400">Selling Price</span>
                      <span className="font-mono-code font-bold">${demoPrice}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={300}
                      value={demoPrice}
                      onChange={(e) => setDemoPrice(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-3 gap-2 p-2.5 rounded-xl border text-center ${
                    isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">Gross Profit</p>
                    <p className="text-xs font-bold font-mono-code text-emerald-600 dark:text-emerald-400">
                      ${demoProfit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">Margin</p>
                    <p className="text-xs font-bold font-mono-code">{demoMargin}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">Markup</p>
                    <p className="text-xs font-bold font-mono-code">{demoMarkup}%</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/tools/financial-calculators"
                  onClick={(e) => onNavigateTool('financial-calculators', e)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  <span>Open Financial Suite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/tools/invoice-generator"
                  onClick={(e) => onNavigateTool('invoice-generator', e)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  }`}
                >
                  Create Invoice PDF
                </a>
              </div>
            </div>

            {/* Widget 3: Brand QR & Color Studio */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Branding & Design
                </span>
                <h3 className="text-sm font-bold">Custom Vector QR & Palette Studio</h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Select brand color to preview QR:</p>
                  <div className="flex items-center gap-2">
                    {BRAND_PRESETS.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setDemoBrandColor(hex)}
                        aria-label={`Select color ${hex}`}
                        className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                          demoBrandColor === hex ? 'scale-115 border-indigo-500' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <a
                  href="/tools/branding-utilities"
                  onClick={(e) => onNavigateTool('branding-utilities', e)}
                  title="Open in QR & Branding Studio"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:scale-105 transition"
                >
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="7" height="7" rx="1" stroke={demoBrandColor} strokeWidth="2" />
                    <rect x="4.5" y="4.5" width="2" height="2" fill={demoBrandColor} />
                    <rect x="15" y="2" width="7" height="7" rx="1" stroke={demoBrandColor} strokeWidth="2" />
                    <rect x="17.5" y="4.5" width="2" height="2" fill={demoBrandColor} />
                    <rect x="2" y="15" width="7" height="7" rx="1" stroke={demoBrandColor} strokeWidth="2" />
                    <rect x="4.5" y="17.5" width="2" height="2" fill={demoBrandColor} />
                    <rect x="11" y="11" width="3" height="3" fill={demoBrandColor} />
                    <rect x="15" y="15" width="3" height="3" fill={demoBrandColor} />
                    <rect x="19" y="18" width="3" height="4" fill={demoBrandColor} />
                    <rect x="14" y="19" width="3" height="3" fill={demoBrandColor} />
                  </svg>
                </a>
              </div>

              <a
                href="/tools/branding-utilities"
                onClick={(e) => onNavigateTool('branding-utilities', e)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                <span>Customize SVG/PNG QR Code & Palettes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Widget 4: Live Case Converter & Developer Tools */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Writing, Data & Developer
                </span>
                <h3 className="text-sm font-bold">Instant Case Converter & Dev Tools</h3>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={demoPhrase}
                  onChange={(e) => setDemoPhrase(e.target.value)}
                  placeholder="Type text to convert case..."
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code">
                  <div
                    className={`p-2 rounded-lg border truncate ${
                      isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <span className="text-slate-400 block text-[9px]">camelCase</span>
                    {camelPreview}
                  </div>
                  <div
                    className={`p-2 rounded-lg border truncate ${
                      isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <span className="text-slate-400 block text-[9px]">snake_case</span>
                    {snakePreview}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/tools/writing-aids"
                  onClick={(e) => onNavigateTool('writing-aids', e)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  <span>Writing & Diff Tools</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/tools/dev-diagnostics"
                  onClick={(e) => onNavigateTool('dev-diagnostics', e)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  JWT & Regex
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Complete 18-Tool Directory */}
      <section aria-label="Tools Directory" className="space-y-4">
        <div
          className={`border-b pb-3 flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-zinc-800/80' : 'border-slate-200'
          }`}
        >
          <h2 className="text-base font-bold tracking-tight">
            {activeCategoryMeta
              ? `${activeCategoryMeta.label} (${filteredTools.length})`
              : `All Free Online Tools (${filteredTools.length})`}
          </h2>
          {selectedCategory !== 'all' && (
            <a
              href="/"
              onClick={(e) => onSelectCategory('all', e)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all 18 tools →
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredTools.map((tool) => (
            <a
              key={tool.id}
              href={tool.path}
              onClick={(e) => onNavigateTool(tool.id, e)}
              className={`group rounded-xl border p-5 transition flex flex-col justify-between space-y-3.5 active:scale-[0.99] ${
                isDark
                  ? 'bg-[#121215] border-zinc-800/90 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200/90 hover:border-indigo-400 shadow-xs'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      isDark ? 'text-indigo-400' : 'text-indigo-600'
                    }`}
                  >
                    {tool.categoryLabel}
                  </span>
                  <ArrowUpRight
                    className={`w-4 h-4 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                      isDark
                        ? 'text-zinc-500 group-hover:text-white'
                        : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  />
                </div>
                <h3 className="text-sm font-bold tracking-tight">{tool.title}</h3>
                <p
                  className={`text-xs leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}
                >
                  {tool.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {tool.badges.map((badge) => (
                  <span
                    key={badge}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        : 'bg-slate-50 border-slate-200/90 text-slate-700'
                    }`}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* SEO Value & Trust Pillars Section + Donate & Mobile Apps Callout */}
      <section
        aria-label="Why professionals choose CommonTool"
        className={`rounded-2xl border p-6 sm:p-8 space-y-6 ${
          isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight">
            Why Teams, Students & Businesses Trust CommonTool
          </h2>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            Built on modern browser standards for maximum privacy, speed, and reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/70'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Lock className="w-4 h-4 text-emerald-500" />
              100% On-Device Privacy
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Your confidential contracts, invoices, tax receipts, and photos are processed directly inside your browser. No files are ever uploaded to external servers.
            </p>
          </div>
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/70'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Zap className="w-4 h-4 text-amber-500" />
              Instant Zero-Latency Speed
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              No waiting in upload or download queues. Merge PDFs, convert spreadsheets, or extract text with OCR in milliseconds using local WebAssembly.
            </p>
          </div>
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200/70'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <Globe className="w-4 h-4 text-indigo-500" />
              Free & Unbranded Forever
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Export professional, watermark-free PDFs, invoices, legal agreements, and vector QR codes without paywalls or mandatory registration.
            </p>
          </div>
        </div>

        {/* Heartfelt Donate & Coming Soon Mobile Apps Banner */}
        <div
          className={`p-5 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
            isDark
              ? 'bg-zinc-900/70 border-zinc-800'
              : 'bg-slate-50 border-slate-200/90'
          }`}
        >
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                Keep CommonTool 100% Free
              </span>
              <span className="text-[11px] font-semibold text-indigo-500">
                • Coming Soon: Native iOS & Android Apps
              </span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              We maintain all 18 utilities free of charge without ads or watermarks. Support our mission and upcoming iOS & Android mobile apps with a voluntary contribution via Razorpay.
            </p>
          </div>

          {onNavigatePage && (
            <a
              href="/donate"
              onClick={(e) => onNavigatePage('donate', e)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              Donate & Support Us
            </a>
          )}
        </div>
      </section>
    </div>
  );
};
