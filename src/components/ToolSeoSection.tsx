import React from 'react';
import { TOOLS_CATALOG, type ToolId, type ToolMetadata } from '../types/tools';
import {
  HelpCircle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

interface ToolSeoSectionProps {
  tool: ToolMetadata;
  isDark: boolean;
  onNavigateTool: (id: ToolId, e?: React.MouseEvent) => void;
}

export const ToolSeoSection: React.FC<ToolSeoSectionProps> = ({
  tool,
  isDark,
  onNavigateTool,
}) => {
  const related = tool.relatedTools
    .map((id) => TOOLS_CATALOG.find((t) => t.id === id))
    .filter((t): t is ToolMetadata => Boolean(t));

  return (
    <section
      aria-label={`About ${tool.title}`}
      className={`mt-10 pt-8 border-t space-y-8 ${
        isDark ? 'border-zinc-800/80' : 'border-slate-200'
      }`}
    >
      {/* 3-Step Guide & FAQ Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          className={`lg:col-span-7 rounded-2xl border p-5 sm:p-6 space-y-4 ${
            isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold tracking-tight">
              How to Use {tool.title}
            </h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              100% Private & Local
            </span>
          </div>

          <ol className="space-y-3">
            {tool.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className={isDark ? 'text-zinc-300' : 'text-slate-600'}>{step}</span>
              </li>
            ))}
          </ol>

          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            {tool.keywords.map((kw) => (
              <span
                key={kw}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium ${
                  isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* FAQ Block */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-5 sm:p-6 space-y-4 ${
            isDark ? 'bg-[#121215] border-zinc-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}
        >
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {tool.faqs.map((faq, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border space-y-1 ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <p className="text-xs font-bold">{faq.question}</p>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related Tools Internal Linking Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Related Tools You Might Need
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {related.map((rel) => (
            <a
              key={rel.id}
              href={rel.path}
              onClick={(e) => onNavigateTool(rel.id, e)}
              className={`group rounded-xl border p-4 transition flex flex-col justify-between space-y-2 ${
                isDark
                  ? 'bg-[#121215] border-zinc-800 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{rel.shortTitle}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <p className={`text-[11px] line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {rel.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
