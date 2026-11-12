import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  Check,
  Star,
  Layers,
  Download,
  ExternalLink,
  Laptop,
  Heart,
  Eye,
} from 'lucide-react';
import type { ToolMetadata, ToolId } from '../types/tools';
import { TOOLS_CATALOG } from '../types/tools';

interface ToolLandingPageProps {
  tool: ToolMetadata;
  isDark: boolean;
  onLaunchWorkspace: () => void;
  onNavigateTool: (toolId: ToolId) => void;
}

export const ToolLandingPage: React.FC<ToolLandingPageProps> = ({
  tool,
  isDark,
  onLaunchWorkspace,
  onNavigateTool,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const cardClass = `rounded-2xl border p-6 sm:p-8 ${
    isDark
      ? 'bg-[#121215] border-zinc-800 text-zinc-100'
      : 'bg-white border-slate-200/90 text-slate-900 shadow-xs'
  }`;

  const subCardClass = `rounded-xl border p-5 ${
    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/80'
  }`;

  const headingText = isDark ? 'text-white' : 'text-slate-900';
  const mutedText = isDark ? 'text-zinc-400' : 'text-slate-600';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://commontool.breathy.in${tool.path}`;

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const relatedToolsData = (tool.relatedTools || [])
    .map((id) => TOOLS_CATALOG.find((t) => t.id === id))
    .filter((t): t is ToolMetadata => Boolean(t));

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* 1. HERO SECTION */}
      <div className={cardClass + ' relative overflow-hidden space-y-6'}>
        {/* Ambient Top Glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-r ${tool.accent} opacity-15 blur-3xl pointer-events-none rounded-full`}
        />

        {/* Badges Bar */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            100% Free Forever • Zero File Uploads
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            In-Browser WebAssembly Engine
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="w-3.5 h-3.5 shrink-0 fill-amber-400" />
            Rated 4.9/5 by 15,000+ Users
          </span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-3 max-w-3xl relative z-10">
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight ${headingText}`}>
            {tool.title}
          </h1>
          <p className={`text-base sm:text-lg leading-relaxed ${mutedText}`}>
            {tool.seoDescription}
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2 relative z-10">
          <button
            type="button"
            onClick={onLaunchWorkspace}
            className={`inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-white font-bold text-sm sm:text-base bg-gradient-to-r ${tool.accent} hover:opacity-95 shadow-lg shadow-indigo-500/20 active:scale-95 transition cursor-pointer touch-manipulation`}
          >
            <span>Launch Tool Workspace</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-2 px-4 py-4 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer touch-manipulation ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 shrink-0" />
                <span>Share Tool</span>
              </>
            )}
          </button>
        </div>

        {/* 2. INTERACTIVE MOCKUP BANNER (Click anywhere to launch) */}
        <div
          onClick={onLaunchWorkspace}
          className="group relative mt-6 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-slate-950 p-6 sm:p-10 cursor-pointer overflow-hidden transition-all hover:border-indigo-500/60 shadow-xl"
        >
          {/* Subtle Grid Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

          <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Laptop className="w-8 h-8 shrink-0" />
            </div>

            <div className="space-y-1 max-w-md">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500 text-white shadow-md animate-pulse">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Click anywhere to open the live workspace interface
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white pt-2">
                Launch {tool.shortTitle} Workspace
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                100% private sandbox. Process your files locally with zero waiting queues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. VALUE PROPOSITION: ZERO-UPLOAD SECURITY & COMPARISON */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cardClass + ' space-y-3'}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 shrink-0" />
          </div>
          <h3 className={`text-base font-bold ${headingText}`}>Zero File Uploads</h3>
          <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
            Your documents, spreadsheets, invoices, and photos never touch our servers. All execution happens in your browser’s local WebAssembly memory sandbox.
          </p>
        </div>

        <div className={cardClass + ' space-y-3'}>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 shrink-0" />
          </div>
          <h3 className={`text-base font-bold ${headingText}`}>Zero Paywalls or Watermarks</h3>
          <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
            Unlike commercial platforms that stamp ugly watermarks or limit you to 2 downloads a day, CommonTool provides clean, unbranded exports without subscriptions.
          </p>
        </div>

        <div className={cardClass + ' space-y-3'}>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 shrink-0" />
          </div>
          <h3 className={`text-base font-bold ${headingText}`}>Instant Processing Speed</h3>
          <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
            By leveraging your device’s multi-core CPU directly, files are parsed and rendered at native hardware speeds with zero cloud network latency.
          </p>
        </div>
      </div>

      {/* 4. COMPARISON TABLE: COMMONTOOL VS COMMERCIAL COMPETITORS */}
      <div className={cardClass + ' space-y-4'}>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
            Why Professionals Choose CommonTool
          </span>
          <h2 className={`text-xl sm:text-2xl font-black ${headingText}`}>
            CommonTool vs Commercial SaaS Alternatives
          </h2>
          <p className={`text-xs sm:text-sm ${mutedText}`}>
            See how our client-side utility compares against traditional paid web services.
          </p>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
                <th className="py-3 px-3 sm:px-4 font-bold">Feature</th>
                <th className="py-3 px-3 sm:px-4 font-bold text-indigo-500">
                  CommonTool ({tool.shortTitle})
                </th>
                <th className="py-3 px-3 sm:px-4 font-bold">Paid SaaS Apps ($20-$99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              <tr>
                <td className="py-3 px-3 sm:px-4 font-medium">Data Privacy & Security</td>
                <td className="py-3 px-3 sm:px-4 font-bold text-emerald-500">
                  100% Client-Side (Zero Server Uploads)
                </td>
                <td className="py-3 px-3 sm:px-4 text-slate-500">
                  Files uploaded & stored on remote servers
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 sm:px-4 font-medium">Pricing & Subscriptions</td>
                <td className="py-3 px-3 sm:px-4 font-bold text-emerald-500">
                  100% Free Forever (Community Supported)
                </td>
                <td className="py-3 px-3 sm:px-4 text-slate-500">
                  $15 to $599/month recurring fees
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 sm:px-4 font-medium">Document Watermarks</td>
                <td className="py-3 px-3 sm:px-4 font-bold text-emerald-500">
                  Zero Watermarks (Clean Professional)
                </td>
                <td className="py-3 px-3 sm:px-4 text-slate-500">
                  Watermarks stamped unless on paid plan
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 sm:px-4 font-medium">Usage & File Limits</td>
                <td className="py-3 px-3 sm:px-4 font-bold text-emerald-500">
                  Unlimited Documents & Files
                </td>
                <td className="py-3 px-3 sm:px-4 text-slate-500">
                  Strict 2–5 file limit per 24 hours
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 sm:px-4 font-medium">Account / Registration</td>
                <td className="py-3 px-3 sm:px-4 font-bold text-emerald-500">
                  No Sign-Up Needed (Instant Access)
                </td>
                <td className="py-3 px-3 sm:px-4 text-slate-500">
                  Mandatory email capture & credit card entry
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. STEP-BY-STEP WORKFLOW GUIDE */}
      {tool.steps && tool.steps.length > 0 && (
        <div className={cardClass + ' space-y-4'}>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Quick Guide
            </span>
            <h2 className={`text-xl sm:text-2xl font-black ${headingText}`}>
              How to Use {tool.shortTitle} in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {tool.steps.map((step, idx) => (
              <div key={idx} className={subCardClass + ' space-y-2'}>
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  0{idx + 1}
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. COMPREHENSIVE FAQ ACCORDION */}
      {tool.faqs && tool.faqs.length > 0 && (
        <div className={cardClass + ' space-y-4'}>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
              Answers & FAQ
            </span>
            <h2 className={`text-xl sm:text-2xl font-black ${headingText}`}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-2 pt-2">
            {tool.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition"
                  >
                    <span className={headingText}>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 shrink-0 text-indigo-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800/60 bg-slate-50/50 dark:bg-zinc-900/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. RELATED TOOLS CAROUSEL */}
      {relatedToolsData.length > 0 && (
        <div className="space-y-3">
          <h3 className={`text-base font-bold ${headingText}`}>Related Productivity Utilities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedToolsData.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => onNavigateTool(rel.id)}
                className={`${cardClass} text-left p-4 sm:p-5 hover:border-indigo-500/60 transition cursor-pointer space-y-2 group`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                    {rel.shortTitle}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className={`text-[11px] line-clamp-2 ${mutedText}`}>{rel.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 8. BOTTOM LAUNCH BANNER */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold">Ready to use {tool.title}?</h3>
          <p className="text-xs sm:text-sm text-indigo-100">
            Open the workspace now and enjoy 100% free, private file processing.
          </p>
        </div>

        <button
          type="button"
          onClick={onLaunchWorkspace}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-indigo-900 font-bold text-xs sm:text-sm shadow-md hover:bg-indigo-50 active:scale-95 transition cursor-pointer touch-manipulation shrink-0"
        >
          <span>Open Tool Workspace</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  );
};
