import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Info,
} from 'lucide-react';

type CitationStyle = 'APA' | 'MLA' | 'IEEE' | 'Chicago';
type SourceKind = 'journal' | 'book' | 'website' | 'conference';

interface SavedReference {
  id: string;
  style: CitationStyle;
  formatted: string;
  inText: string;
}

const STORAGE_KEY = 'commontool_saved_citations';

export const CitationFormatter: React.FC = () => {
  const [style, setStyle] = useState<CitationStyle>('APA');
  const [sourceKind, setSourceKind] = useState<SourceKind>('journal');
  const [authorFirst, setAuthorFirst] = useState('Elena');
  const [authorLast, setAuthorLast] = useState('Vance');
  const [year, setYear] = useState('2026');
  const [title, setTitle] = useState('Zero-Upload WebAssembly Architectures for Privacy-Preserving Document Computation');
  const [containerTitle, setContainerTitle] = useState('Journal of Modern Web Systems');
  const [volume, setVolume] = useState('14');
  const [issue, setIssue] = useState('3');
  const [pages, setPages] = useState('112-128');
  const [doiOrUrl, setDoiOrUrl] = useState('https://doi.org/10.1145/3589123.2026');
  const [savedList, setSavedList] = useState<SavedReference[]>([]);
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedList(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const firstInitial = authorFirst.trim() ? `${authorFirst.trim()[0].toUpperCase()}.` : '';

  const formatReference = (): { full: string; inText: string } => {
    if (style === 'APA') {
      const full = `${authorLast}, ${firstInitial} (${year}). ${title}. ${containerTitle}${
        volume ? `, ${volume}` : ''
      }${issue ? `(${issue})` : ''}${pages ? `, ${pages}` : ''}.${doiOrUrl ? ` ${doiOrUrl}` : ''}`;
      return { full, inText: `(${authorLast}, ${year})` };
    }
    if (style === 'MLA') {
      const full = `${authorLast}, ${authorFirst}. "${title}." ${containerTitle}${
        volume ? `, vol. ${volume}` : ''
      }${issue ? `, no. ${issue}` : ''}, ${year}${pages ? `, pp. ${pages}` : ''}.${
        doiOrUrl ? ` ${doiOrUrl}.` : ''
      }`;
      return { full, inText: `(${authorLast} ${pages.split('-')[0] || year})` };
    }
    if (style === 'IEEE') {
      const full = `[1] ${firstInitial} ${authorLast}, "${title}," ${containerTitle}${
        volume ? `, vol. ${volume}` : ''
      }${issue ? `, no. ${issue}` : ''}${pages ? `, pp. ${pages}` : ''}, ${year}.${
        doiOrUrl ? ` [Online]. Available: ${doiOrUrl}` : ''
      }`;
      return { full, inText: `[1]` };
    }
    // Chicago 17th
    const full = `${authorLast}, ${authorFirst}. "${title}." ${containerTitle} ${volume}${
      issue ? `, no. ${issue}` : ''
    } (${year}): ${pages}.${doiOrUrl ? ` ${doiOrUrl}.` : ''}`;
    return { full, inText: `(${authorLast} ${year}, ${pages.split('-')[0] || ''})` };
  };

  const { full, inText } = formatReference();

  const addToBibliography = () => {
    const next: SavedReference[] = [
      { id: crypto.randomUUID(), style, formatted: full, inText },
      ...savedList,
    ];
    setSavedList(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const exportBibliographyTxt = () => {
    const content = savedList.map((r) => r.formatted).join('\n\n');
    const blob = new Blob([content || full], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CommonTool-Bibliography-${style}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-violet-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Citation & Bibliography Formatter</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['APA', 'MLA', 'IEEE', 'Chicago'] as CitationStyle[]).map((st) => (
              <button
                key={st}
                onClick={() => setStyle(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  style === st
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Generate accurate academic citations and in-text references in APA 7th, MLA 9th, IEEE, and Chicago 17th styles with live bibliography preview.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['journal', 'book', 'website', 'conference'] as SourceKind[]).map((sk) => (
              <button
                key={sk}
                onClick={() => setSourceKind(sk)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  sourceKind === sk ? 'bg-violet-500/25 text-violet-300 border border-violet-500/40' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {sk}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Author First Name</label>
              <input
                type="text"
                value={authorFirst}
                onChange={(e) => setAuthorFirst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Author Last Name</label>
              <input
                type="text"
                value={authorLast}
                onChange={(e) => setAuthorLast(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Publication Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Article / Book / Page Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Journal / Publisher / Website Name</label>
              <input
                type="text"
                value={containerTitle}
                onChange={(e) => setContainerTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">DOI or URL</label>
              <input
                type="text"
                value={doiOrUrl}
                onChange={(e) => setDoiOrUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Volume</label>
              <input
                type="text"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Issue</label>
              <input
                type="text"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pages</label>
              <input
                type="text"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
          </div>
        </div>

        {/* Live Formatted Output & Saved Bibliography */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-violet-400">{style} Bibliography Entry</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(full);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-200 cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={addToBibliography}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500 text-xs font-bold text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save to List
                </button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 leading-relaxed font-serif">
              {full}
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <span className="text-slate-400">In-Text Citation:</span>
              <code className="text-violet-300 font-mono-code font-semibold">{inText}</code>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Compiled Bibliography ({savedList.length})
              </span>
              {savedList.length > 0 && (
                <button
                  onClick={exportBibliographyTxt}
                  className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .TXT
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-56 overflow-auto">
              {savedList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px] mr-2">
                      {item.style}
                    </span>
                    <span className="text-slate-300">{item.formatted}</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = savedList.filter((x) => x.id !== item.id);
                      setSavedList(next);
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    }}
                    className="text-slate-500 hover:text-rose-400 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
