import React, { useState } from 'react';
import { diffWords, diffLines } from 'diff';
import {
  FileCheck2,
  GitCompare,
  CaseSensitive,
  Copy,
  CheckCircle2,
  Info,
} from 'lucide-react';

type WritingTab = 'counter' | 'diff' | 'case';

export const WritingAids: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WritingTab>('counter');
  const [showInfo, setShowInfo] = useState(false);

  // 1. Word Counter & Readability State
  const [text, setText] = useState(
    'CommonTool empowers students, researchers, and engineers with client-side utilities.\n\nBecause every file and text block is processed locally inside your browser via WebAssembly and modern JavaScript APIs, your sensitive drafts never touch an external server.'
  );

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const wordCount = words.length;
  const charCount = text.length;
  const charNoSpaces = text.replace(/\s+/g, '').length;
  const sentences = trimmed ? trimmed.split(/[.!?]+/).filter(Boolean).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(Boolean).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 225));
  const speakingTimeSec = Math.round((wordCount / 140) * 60);

  // 2. Diff Checker State
  const [leftText, setLeftText] = useState(
    'function calculateMargin(cost, revenue) {\n  const profit = revenue - cost;\n  return (profit / revenue) * 100;\n}'
  );
  const [rightText, setRightText] = useState(
    'function calculateMargin(cost: number, revenue: number): number {\n  if (revenue <= 0) return 0;\n  const profit = revenue - cost;\n  return Number(((profit / revenue) * 100).toFixed(2));\n}'
  );
  const [diffMode, setDiffMode] = useState<'words' | 'lines'>('words');
  const diffParts = diffMode === 'words' ? diffWords(leftText, rightText) : diffLines(leftText, rightText);

  // 3. Case Converter State
  const [caseInput, setCaseInput] = useState('Zero upload client side architecture for modern teams');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const tokenizeWords = (str: string): string[] =>
    str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_\-/]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const tokens = tokenizeWords(caseInput);

  const caseOutputs = [
    {
      label: 'camelCase',
      value: tokens
        .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
        .join(''),
    },
    {
      label: 'PascalCase',
      value: tokens.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(''),
    },
    {
      label: 'snake_case',
      value: tokens.map((w) => w.toLowerCase()).join('_'),
    },
    {
      label: 'kebab-case',
      value: tokens.map((w) => w.toLowerCase()).join('-'),
    },
    {
      label: 'CONSTANT_CASE',
      value: tokens.map((w) => w.toUpperCase()).join('_'),
    },
    {
      label: 'Title Case',
      value: tokens.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' '),
    },
    {
      label: 'Sentence case',
      value:
        tokens.length > 0
          ? tokens[0][0].toUpperCase() +
            tokens[0].slice(1).toLowerCase() +
            (tokens.length > 1 ? ' ' + tokens.slice(1).map((w) => w.toLowerCase()).join(' ') : '')
          : '',
    },
    {
      label: 'UPPERCASE',
      value: caseInput.toUpperCase(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="w-5 h-5 text-sky-400 shrink-0" />
          <h2 className="text-lg font-bold text-white">Writing & Research Aids</h2>
          <button
            onClick={() => setShowInfo((v) => !v)}
            aria-label="Toggle tool info"
            className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="About this tool"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Word & character counter with reading time estimation, side-by-side text diff-checker, and developer case converter.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'counter', label: 'Word Counter & Reading Time', icon: FileCheck2 },
          { id: 'diff', label: 'Diff-Checker (Text Compare)', icon: GitCompare },
          { id: 'case', label: 'Case Converter (camelCase, snake_case...)', icon: CaseSensitive },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as WritingTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. WORD COUNTER */}
      {activeTab === 'counter' && (
        <div className="space-y-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Words', value: wordCount },
              { label: 'Characters', value: charCount },
              { label: 'No Spaces', value: charNoSpaces },
              { label: 'Sentences', value: sentences },
              { label: 'Paragraphs', value: paragraphs },
              { label: 'Reading / Speaking', value: `~${readingTimeMin}m / ${speakingTimeSec}s` },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className="text-lg font-extrabold text-sky-300 mt-0.5">{stat.value}</p>
              </div>
            ))}
          </div>

          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your essay, article, or research abstract here..."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 leading-relaxed"
          />
        </div>
      )}

      {/* 2. DIFF CHECKER */}
      {activeTab === 'diff' && (
        <div className="space-y-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Compare Original vs Modified Text</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDiffMode('words')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  diffMode === 'words' ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Word-Level Diff
              </button>
              <button
                onClick={() => setDiffMode('lines')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  diffMode === 'lines' ? 'bg-sky-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Line-Level Diff
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Original Text (A)</label>
              <textarea
                rows={6}
                value={leftText}
                onChange={(e) => setLeftText(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Modified Text (B)</label>
              <textarea
                rows={6}
                value={rightText}
                onChange={(e) => setRightText(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono-code"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono-code text-xs whitespace-pre-wrap leading-relaxed">
            {diffParts.map((part, idx) => (
              <span
                key={idx}
                className={
                  part.added
                    ? 'bg-emerald-500/25 text-emerald-300 px-0.5 rounded'
                    : part.removed
                    ? 'bg-rose-500/25 text-rose-300 line-through px-0.5 rounded'
                    : 'text-slate-300'
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. CASE CONVERTER */}
      {activeTab === 'case' && (
        <div className="space-y-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Source Phrase or Identifier</label>
            <input
              type="text"
              value={caseInput}
              onChange={(e) => setCaseInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {caseOutputs.map((out) => (
              <div
                key={out.label}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-sky-400">{out.label}</p>
                  <p className="text-sm text-white font-mono-code truncate mt-0.5">{out.value}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(out.value);
                    setCopiedMode(out.label);
                    setTimeout(() => setCopiedMode(null), 1500);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 shrink-0 cursor-pointer"
                >
                  {copiedMode === out.label ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
