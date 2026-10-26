import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  Table as TableIcon,
  Upload,
  Download,
  Copy,
  CheckCircle2,
  Filter,
  Info,
  Eye,
  FileSpreadsheet,
  FileCode,
  FileText,
  Trash2,
  Sparkles,
  ArrowUpDown,
  Search,
  Database,
  BarChart3,
  Check,
  RefreshCw,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';

export type WorkbenchView = 'grid' | 'sql' | 'json' | 'markdown' | 'profiler';

const SAMPLE_DATASETS: Record<string, { label: string; csv: string }> = {
  sales: {
    label: 'Global Sales & Revenue',
    csv: `OrderID,Customer,Category,Units,Revenue,Region,Status
ORD-101,Acme Corp,Enterprise SaaS,12,4800,North America,Completed
ORD-102,Globex Inc,Cloud Storage,8,1600,Europe,Pending
ORD-103,Initech LLC,Security Audit,5,3250,North America,Completed
ORD-104,Soylent Co,Enterprise SaaS,15,6000,Asia-Pacific,Completed
ORD-102,Globex Inc,Cloud Storage,8,1600,Europe,Pending
ORD-105,Umbrella Ltd,AI Analytics,20,9400,Europe,Shipped
ORD-106,Wayne Tech,Cybersecurity,10,5000,North America,Completed
ORD-107,Hooli Inc,Cloud Infrastructure,14,7000,Europe,Pending`,
  },
  employees: {
    label: 'Team & Compensation',
    csv: `ID,FullName,Department,Role,Salary,Location,JoinedYear
EMP-01,Suman Das,Engineering,Lead Systems Architect,125000,India,2021
EMP-02,Elena Rostova,Design,Staff Product Designer,95000,Germany,2022
EMP-03,Marcus Vance,Security,Principal Security Engineer,130000,USA,2020
EMP-04,Aarav Patel,Product,Senior Product Manager,105000,India,2022
EMP-05,Sarah Jenkins,Marketing,Growth Marketing Lead,88000,UK,2023`,
  },
  inventory: {
    label: 'Warehouse & Inventory',
    csv: `SKU,ProductName,Category,StockLevel,ReorderPoint,UnitCost,Supplier
SKU-901,High-Torque Stepper Motor,Robotics,340,50,42.50,Apex Precision
SKU-902,ARM Cortex Developer Board,Embedded,120,30,85.00,Silicon Harbor
SKU-903,Low-Noise Power Converter,Power Electronics,450,100,18.25,VoltLine
SKU-904,Shielded Cable 2m,Interconnects,820,200,6.40,VoltLine`,
  },
};

export const DataWorkbench: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [rawInput, setRawInput] = useState(SAMPLE_DATASETS.sales.csv);
  const [tableName, setTableName] = useState('sales_orders');
  const [activeView, setActiveView] = useState<WorkbenchView>('grid');

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [banner, setBanner] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Raw Input to Array of Objects
  const parsedRows = useMemo<Record<string, string | number>[]>(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) return [];

    // JSON Input
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object') return [parsed];
      } catch {
        // Fall back to sheet parser
      }
    }

    // CSV / TSV / Delimited Input via SheetJS
    try {
      const wb = XLSX.read(trimmed, { type: 'string' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    } catch {
      return [];
    }
  }, [rawInput]);

  // Detected Columns
  const columns = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return Object.keys(parsedRows[0]);
  }, [parsedRows]);

  // Filtered & Sorted Rows for Grid
  const displayRows = useMemo(() => {
    let result = [...parsedRows];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn] ?? '';
        const valB = b[sortColumn] ?? '';
        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [parsedRows, searchQuery, sortColumn, sortDirection]);

  // Handle File Upload (.csv, .tsv, .xlsx, .json)
  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'json') {
        const text = await file.text();
        setRawInput(text);
        setBanner(`Loaded ${file.name} as JSON dataset.`);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setRawInput(csv);
        setBanner(`Parsed and loaded ${file.name} successfully.`);
      }
      setTableName(file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_'));
    } catch (err: unknown) {
      setBanner(`Error parsing file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Cleaning Operations
  const deduplicateRows = () => {
    const seen = new Set<string>();
    let dupesCount = 0;
    const unique = parsedRows.filter((row) => {
      const sig = JSON.stringify(row);
      if (seen.has(sig)) {
        dupesCount++;
        return false;
      }
      seen.add(sig);
      return true;
    });
    const ws = XLSX.utils.json_to_sheet(unique);
    setRawInput(XLSX.utils.sheet_to_csv(ws));
    setBanner(`Removed ${dupesCount} duplicate row(s).`);
  };

  const trimWhitespace = () => {
    const cleaned = parsedRows.map((row) => {
      const next: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(row)) {
        next[k.trim()] = typeof v === 'string' ? v.trim() : v;
      }
      return next;
    });
    const ws = XLSX.utils.json_to_sheet(cleaned);
    setRawInput(XLSX.utils.sheet_to_csv(ws));
    setBanner('Trimmed leading and trailing whitespace from all cells.');
  };

  const removeEmptyRows = () => {
    const filtered = parsedRows.filter((row) => {
      return Object.values(row).some((val) => val !== '' && val !== null && val !== undefined);
    });
    const removedCount = parsedRows.length - filtered.length;
    const ws = XLSX.utils.json_to_sheet(filtered);
    setRawInput(XLSX.utils.sheet_to_csv(ws));
    setBanner(`Removed ${removedCount} empty row(s).`);
  };

  const fillMissingValues = (defaultValue: string = 'N/A') => {
    const filled = parsedRows.map((row) => {
      const next: Record<string, string | number> = {};
      for (const col of columns) {
        const val = row[col];
        next[col] = val === '' || val === null || val === undefined ? defaultValue : val;
      }
      return next;
    });
    const ws = XLSX.utils.json_to_sheet(filled);
    setRawInput(XLSX.utils.sheet_to_csv(ws));
    setBanner(`Filled missing cells with "${defaultValue}".`);
  };

  // Sorting Toggle
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else setSortColumn(null);
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Formatter: SQL DDL + Inserts
  const sqlFormatted = useMemo(() => {
    if (parsedRows.length === 0 || columns.length === 0) return '';
    const safeTable = tableName.trim().replace(/[^a-zA-Z0-9_]/g, '_') || 'dataset';

    // Infer column types for CREATE TABLE
    const colDefs = columns.map((col) => {
      let isNumeric = true;
      let hasDecimal = false;
      let nonNullCount = 0;

      for (const r of parsedRows) {
        const v = r[col];
        if (v !== '' && v !== null && v !== undefined) {
          nonNullCount++;
          const num = Number(v);
          if (isNaN(num)) {
            isNumeric = false;
            break;
          }
          if (String(v).includes('.')) hasDecimal = true;
        }
      }

      const colName = `"${col}"`;
      if (nonNullCount === 0 || !isNumeric) return `  ${colName} TEXT`;
      return hasDecimal ? `  ${colName} NUMERIC(12, 2)` : `  ${colName} INTEGER`;
    });

    const createStmt = `CREATE TABLE IF NOT EXISTS ${safeTable} (\n${colDefs.join(',\n')}\n);\n`;
    const colList = columns.map((c) => `"${c}"`).join(', ');

    const inserts = parsedRows
      .map((row) => {
        const vals = columns
          .map((c) => {
            const v = row[c];
            if (v === '' || v === null || v === undefined) return 'NULL';
            return typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(', ');
        return `INSERT INTO ${safeTable} (${colList}) VALUES (${vals});`;
      })
      .join('\n');

    return `${createStmt}\n-- Data Inserts (${parsedRows.length} rows)\n${inserts}`;
  }, [parsedRows, columns, tableName]);

  // Formatter: JSON
  const jsonFormatted = useMemo(() => {
    return JSON.stringify(parsedRows, null, 2);
  }, [parsedRows]);

  // Formatter: Markdown Table
  const markdownFormatted = useMemo(() => {
    if (parsedRows.length === 0 || columns.length === 0) return '';
    const header = `| ${columns.join(' | ')} |`;
    const sep = `| ${columns.map(() => '---').join(' | ')} |`;
    const body = parsedRows
      .map((row) => `| ${columns.map((c) => String(row[c] ?? '')).join(' | ')} |`)
      .join('\n');
    return `${header}\n${sep}\n${body}`;
  }, [parsedRows, columns]);

  // Data Profiler Statistics
  const columnProfiling = useMemo(() => {
    if (parsedRows.length === 0 || columns.length === 0) return [];

    return columns.map((col) => {
      let numericCount = 0;
      let nullCount = 0;
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      const distinctSet = new Set<string>();

      parsedRows.forEach((row) => {
        const val = row[col];
        if (val === '' || val === null || val === undefined) {
          nullCount++;
        } else {
          distinctSet.add(String(val));
          const num = Number(val);
          if (!isNaN(num)) {
            numericCount++;
            sum += num;
            if (num < min) min = num;
            if (num > max) max = num;
          }
        }
      });

      const isNumeric = numericCount > 0 && numericCount >= parsedRows.length - nullCount;
      const avg = isNumeric && numericCount > 0 ? (sum / numericCount).toFixed(2) : null;

      return {
        column: col,
        type: isNumeric ? 'Numeric' : 'Text',
        distinctCount: distinctSet.size,
        nullCount,
        min: isNumeric && min !== Infinity ? min : null,
        max: isNumeric && max !== -Infinity ? max : null,
        avg,
        sum: isNumeric ? sum.toFixed(2) : null,
      };
    });
  }, [parsedRows, columns]);

  // Copy helper
  const copyOutput = (label: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFormat(label);
    setTimeout(() => setCopiedFormat(null), 1800);
  };

  // Export to Excel (.xlsx) with Success Page
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(parsedRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${tableName}.xlsx`,
      fileSize: blob.size,
      toolId: 'data-workbench',
      toolTitle: 'Data Workbench & ETL Studio',
      customMetricLabel: 'Rows Processed',
      customMetricValue: `${parsedRows.length} rows`,
    });
  };

  // Export to CSV with Success Page
  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(parsedRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${tableName}.csv`,
      fileSize: blob.size,
      toolId: 'data-workbench',
      toolTitle: 'Data Workbench & ETL Studio',
      customMetricLabel: 'Rows Processed',
      customMetricValue: `${parsedRows.length} rows`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TableIcon className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Data Workbench & ETL Studio</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  Excel ↔ CSV ↔ JSON ↔ SQL ↔ Markdown
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transform, clean, profile, and convert structured datasets locally with zero cloud uploads.
              </p>
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle studio info"
              className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer touch-manipulation"
              title="About this studio"
            >
              <Info className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.tsv,.xlsx,.xls,.json"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer touch-manipulation"
            >
              <Upload className="w-4 h-4 shrink-0 text-indigo-400" />
              <span>Import Dataset</span>
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={parsedRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer disabled:opacity-40 touch-manipulation"
            >
              <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={parsedRows.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md disabled:opacity-40 touch-manipulation active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Export Excel (.XLSX)</span>
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <p>
              CommonTool Data Workbench is a client-side tabular ETL environment for data analysts, developers, and operators.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Zero Cloud Uploads:</strong> Large Excel sheets, sensitive payroll records, and customer CSVs are processed 100% inside your browser memory.</li>
              <li><strong>Universal Formats:</strong> Seamlessly pivot between Excel (.xlsx), CSV, JSON, SQL DDL/INSERT statements, and Markdown documentation tables.</li>
              <li><strong>Smart Cleaning:</strong> Remove duplicates, trim whitespace, remove blank records, and inspect automated statistical profiles.</li>
            </ul>
          </div>
        )}
      </div>

      {banner && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {banner}
          </span>
          <button onClick={() => setBanner(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Dataset Selector & Cleaning Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Preset Datasets:</span>
          {Object.entries(SAMPLE_DATASETS).map(([key, data]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRawInput(data.csv);
                setTableName(key === 'sales' ? 'sales_orders' : key);
                setBanner(`Loaded "${data.label}" sample.`);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer transition"
            >
              {data.label}
            </button>
          ))}
        </div>

        {/* Cleaning Pipeline Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={deduplicateRows}
            disabled={parsedRows.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-40"
            title="Remove identical duplicate rows"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Deduplicate</span>
          </button>

          <button
            type="button"
            onClick={trimWhitespace}
            disabled={parsedRows.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-40"
            title="Trim whitespace from all fields"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Trim Spaces</span>
          </button>

          <button
            type="button"
            onClick={removeEmptyRows}
            disabled={parsedRows.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-40"
            title="Remove blank rows"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Drop Empty</span>
          </button>

          <button
            type="button"
            onClick={() => fillMissingValues('N/A')}
            disabled={parsedRows.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer disabled:opacity-40"
            title="Fill empty cells with N/A"
          >
            <span>Fill N/A</span>
          </button>
        </div>
      </div>

      {/* Main Studio View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'grid', label: 'Data Grid', icon: TableIcon },
              { id: 'sql', label: 'SQL Table & Inserts', icon: Database },
              { id: 'json', label: 'JSON Dataset', icon: FileCode },
              { id: 'markdown', label: 'Markdown Table', icon: FileText },
              { id: 'profiler', label: 'Data Profiler', icon: BarChart3 },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeView === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveView(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dataset Meta Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono-code font-bold text-slate-200">
            {parsedRows.length.toLocaleString()} rows
          </span>
          <span>•</span>
          <span className="font-mono-code font-bold text-slate-200">
            {columns.length} columns
          </span>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE DATA GRID */}
      {activeView === 'grid' && (
        <div className="space-y-4">
          {/* Search & Grid Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
              <input
                type="text"
                placeholder="Filter rows by keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">SQL Table Name:</label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono-code w-36"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto max-h-[540px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-bold text-slate-500 w-12 text-center">#</th>
                    {columns.map((col) => {
                      const isSorted = sortColumn === col;
                      return (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="py-3 px-4 font-bold text-slate-300 hover:text-white cursor-pointer select-none transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col}</span>
                            <ArrowUpDown
                              className={`w-3 h-3 shrink-0 ${
                                isSorted ? 'text-indigo-400' : 'text-slate-600'
                              }`}
                            />
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayRows.length > 0 ? (
                    displayRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 text-slate-500 font-mono-code text-[11px] text-center">
                          {idx + 1}
                        </td>
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="py-2.5 px-4 text-slate-200 whitespace-nowrap max-w-xs truncate"
                          >
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length + 1} className="py-12 text-center text-slate-500">
                        No rows found matching your search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SQL SCHEMA & INSERTS */}
      {activeView === 'sql' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Generated SQL DDL & INSERT Queries</h3>
              <p className="text-xs text-slate-400">
                Ready to paste into PostgreSQL, MySQL, SQLite, or BigQuery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyOutput('sql', sqlFormatted)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {copiedFormat === 'sql' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono-code text-xs max-h-[500px] overflow-auto leading-relaxed">
            {sqlFormatted}
          </pre>
        </div>
      )}

      {/* VIEW 3: JSON DATASET */}
      {activeView === 'json' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Formatted JSON Array</h3>
              <p className="text-xs text-slate-400">
                Type-safe API response payload or state fixtures.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyOutput('json', jsonFormatted)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {copiedFormat === 'json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono-code text-xs max-h-[500px] overflow-auto leading-relaxed">
            {jsonFormatted}
          </pre>
        </div>
      )}

      {/* VIEW 4: MARKDOWN TABLE */}
      {activeView === 'markdown' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">GitHub / Notion Markdown Table</h3>
              <p className="text-xs text-slate-400">
                Pipes-and-hyphens formatted table ready for documentation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyOutput('md', markdownFormatted)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              {copiedFormat === 'md' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono-code text-xs max-h-[500px] overflow-auto leading-relaxed">
            {markdownFormatted}
          </pre>
        </div>
      )}

      {/* VIEW 5: DATA PROFILER & SUMMARY */}
      {activeView === 'profiler' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Automated Column Statistics & Profiling</h3>
            <p className="text-xs text-slate-400">
              Inferred data types, unique cardinalities, null rates, and numeric aggregates.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr className="text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Column</th>
                  <th className="py-3 px-4">Inferred Type</th>
                  <th className="py-3 px-4">Distinct Values</th>
                  <th className="py-3 px-4">Nulls / Missing</th>
                  <th className="py-3 px-4">Min</th>
                  <th className="py-3 px-4">Max</th>
                  <th className="py-3 px-4">Mean (Avg)</th>
                  <th className="py-3 px-4">Sum Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {columnProfiling.map((stat) => (
                  <tr key={stat.column} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-bold text-white font-mono-code">
                      {stat.column}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          stat.type === 'Numeric'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        {stat.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.distinctCount}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.nullCount > 0 ? (
                        <span className="text-rose-400 font-bold">{stat.nullCount} nulls</span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.min !== null ? stat.min : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.max !== null ? stat.max : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.avg !== null ? stat.avg : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 font-mono-code">
                      {stat.sum !== null ? stat.sum : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
