import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  Upload,
  Download,
  Copy,
  CheckCircle2,
  Filter,
  Info,
  Eye,
} from 'lucide-react';

const SAMPLE_CSV = `OrderID,Customer,Category,Units,Revenue,Region
ORD-101,Acme Corp,Enterprise SaaS,12,4800,North America
ORD-102,Globex Inc,Cloud Storage,8,1600,Europe
ORD-103,Initech LLC,Security Audit,5,3250,North America
ORD-104,Soylent Co,Enterprise SaaS,15,6000,Asia-Pacific
ORD-102,Globex Inc,Cloud Storage,8,1600,Europe
ORD-105,Umbrella Ltd,AI Analytics,20,9400,Europe`;

export const DataWorkbench: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [rawInput, setRawInput] = useState(SAMPLE_CSV);
  const [tableName, setTableName] = useState('sales_orders');
  const [previewMode, setPreviewMode] = useState<'grid' | 'json' | 'sql' | 'markdown'>('grid');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const parsedRows = useMemo<Record<string, string | number>[]>(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }
    const wb = XLSX.read(trimmed, { type: 'string' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
  }, [rawInput]);

  const columns = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return Object.keys(parsedRows[0]);
  }, [parsedRows]);

  const deduplicateRows = () => {
    const seen = new Set<string>();
    const unique = parsedRows.filter((row) => {
      const sig = JSON.stringify(row);
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
    const ws = XLSX.utils.json_to_sheet(unique);
    setRawInput(XLSX.utils.sheet_to_csv(ws));
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    setRawInput(XLSX.utils.sheet_to_csv(ws));
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(parsedRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Dataset');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toSqlInsert = () => {
    if (parsedRows.length === 0 || columns.length === 0) return '';
    const colList = columns.map((c) => `"${c}"`).join(', ');
    return parsedRows
      .map((row) => {
        const vals = columns
          .map((c) => {
            const v = row[c];
            return typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');
        return `INSERT INTO ${tableName} (${colList}) VALUES (${vals});`;
      })
      .join('\n');
  };

  const toMarkdownTable = () => {
    if (parsedRows.length === 0 || columns.length === 0) return '';
    const header = `| ${columns.join(' | ')} |`;
    const sep = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = parsedRows
      .map((row) => `| ${columns.map((c) => String(row[c] ?? '')).join(' | ')} |`)
      .join('\n');
    return `${header}\n${sep}\n${body}`;
  };

  const jsonFormatted = useMemo(() => JSON.stringify(parsedRows, null, 2), [parsedRows]);
  const sqlFormatted = useMemo(() => toSqlInsert(), [parsedRows, columns, tableName]);
  const mdFormatted = useMemo(() => toMarkdownTable(), [parsedRows, columns]);

  const copyOutput = (label: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(label);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Table className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">CSV, Excel, JSON & SQL Data Workbench</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={deduplicateRows}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Deduplicate Rows
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV / XLSX</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download .XLSX
            </button>
          </div>
        </div>

        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Convert datasets between CSV, Excel (.xlsx), JSON, SQL INSERT statements, and Markdown tables with live output preview and 1-click deduplication.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-slate-400">
              Source CSV or JSON ({parsedRows.length} rows)
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="SQL table name"
              className="w-36 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono-code"
            />
          </div>
          <textarea
            rows={13}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-200 font-mono-code leading-relaxed"
          />
        </div>

        {/* Live Multi-Format Preview before Copy / Download */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold uppercase text-slate-300">Live Output Preview</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'grid', label: 'Table Grid' },
                  { id: 'json', label: 'JSON' },
                  { id: 'sql', label: 'SQL INSERT' },
                  { id: 'markdown', label: 'Markdown' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPreviewMode(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    previewMode === tab.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {previewMode === 'grid' && (
            <div className="overflow-x-auto max-h-72 rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    {columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 font-semibold text-slate-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {parsedRows.slice(0, 25).map((row, rIdx) => (
                    <tr key={rIdx} className="bg-slate-900/40">
                      {columns.map((col) => (
                        <td key={col} className="py-2 px-3 text-slate-300 font-mono-code whitespace-nowrap">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {previewMode === 'json' && (
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono-code max-h-72 overflow-auto">
              {jsonFormatted}
            </pre>
          )}

          {previewMode === 'sql' && (
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono-code max-h-72 overflow-auto">
              {sqlFormatted}
            </pre>
          )}

          {previewMode === 'markdown' && (
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono-code max-h-72 overflow-auto">
              {mdFormatted}
            </pre>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={() => copyOutput('json', jsonFormatted)}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedFormat === 'json' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Copy JSON
            </button>
            <button
              onClick={() => copyOutput('sql', sqlFormatted)}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedFormat === 'sql' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Copy SQL
            </button>
            <button
              onClick={() => copyOutput('md', mdFormatted)}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedFormat === 'md' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Markdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
