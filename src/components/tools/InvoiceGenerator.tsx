import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  Receipt,
  Plus,
  Trash2,
  Download,
  Save,
  FolderOpen,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface SavedInvoice {
  id: string;
  docType: 'INVOICE' | 'RECEIPT';
  docNumber: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  currencySymbol: string;
  fromName: string;
  fromDetails: string;
  toName: string;
  toDetails: string;
  items: LineItem[];
  taxRate: number;
  discountAmount: number;
  notes: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'INR', symbol: 'Rs.', label: 'INR (₹ / Rs.)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];

const STORAGE_KEY = 'commontool_saved_invoices';

export const InvoiceGenerator: React.FC = () => {
  const [docType, setDocType] = useState<'INVOICE' | 'RECEIPT'>('INVOICE');
  const [docNumber, setDocNumber] = useState('INV-2026-104');
  const [issueDate, setIssueDate] = useState('2026-10-23');
  const [dueDate, setDueDate] = useState('2026-11-22');
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  const [fromName, setFromName] = useState('Apex Digital Studio LLC');
  const [fromDetails, setFromDetails] = useState('742 Evergreen Terrace, Suite 200\nSan Francisco, CA 94107\nbilling@apexstudio.io');
  const [toName, setToName] = useState('Horizon Ventures Inc.');
  const [toDetails, setToDetails] = useState('1200 Market Street, Floor 8\nNew York, NY 10001\naccounts@horizonventures.com');

  const [items, setItems] = useState<LineItem[]>([
    { id: '1', description: 'Full-Stack Web Application Architecture & UI System', quantity: 1, unitPrice: 3200 },
    { id: '2', description: 'Client-Side WebAssembly PDF & Media Pipeline', quantity: 24, unitPrice: 95 },
    { id: '3', description: 'Security Audit & Cloud Sync Provisioning', quantity: 1, unitPrice: 850 },
  ]);

  const [taxRate, setTaxRate] = useState<number>(8.5);
  const [discountAmount, setDiscountAmount] = useState<number>(200);
  const [notes, setNotes] = useState('Payment accepted via ACH, Wire Transfer, or Stripe. Thank you for your business!');
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const loadSaved = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setSavedInvoices(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    loadSaved();
    window.addEventListener('commontool-cloud-pulled', loadSaved);
    return () => window.removeEventListener('commontool-cloud-pulled', loadSaved);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxTotal = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxTotal;

  const formatMoney = (val: number) => `${currency.symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: 'New Service / Deliverable', quantity: 1, unitPrice: 150 },
    ]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const saveInvoiceTemplate = () => {
    const entry: SavedInvoice = {
      id: crypto.randomUUID(),
      docType,
      docNumber,
      issueDate,
      dueDate,
      currencyCode: currency.code,
      currencySymbol: currency.symbol,
      fromName,
      fromDetails,
      toName,
      toDetails,
      items,
      taxRate,
      discountAmount,
      notes,
    };
    const next = [entry, ...savedInvoices.slice(0, 14)];
    setSavedInvoices(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setBanner(`Saved ${docType} #${docNumber} to workspace templates!`);
  };

  const loadSavedInvoice = (inv: SavedInvoice) => {
    setDocType(inv.docType);
    setDocNumber(inv.docNumber);
    setIssueDate(inv.issueDate);
    setDueDate(inv.dueDate);
    const foundCurr = CURRENCIES.find((c) => c.code === inv.currencyCode) || CURRENCIES[0];
    setCurrency(foundCurr);
    setFromName(inv.fromName);
    setFromDetails(inv.fromDetails);
    setToName(inv.toName);
    setToDetails(inv.toDetails);
    setItems(inv.items);
    setTaxRate(inv.taxRate);
    setDiscountAmount(inv.discountAmount);
    setNotes(inv.notes);
    setBanner(`Loaded saved ${inv.docType} #${inv.docNumber}`);
  };

  // Export clean, unbranded PDF using jsPDF
  const exportUnbrandedPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header band (clean, zero watermark/branding)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 95, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(docType, 45, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`#${docNumber}`, 45, 70);

    doc.setFontSize(10);
    doc.text(`Issue Date: ${issueDate}`, pageW - 45, 45, { align: 'right' });
    doc.text(
      docType === 'INVOICE' ? `Due Date: ${dueDate}` : `Status: PAID IN FULL`,
      pageW - 45,
      63,
      { align: 'right' }
    );

    // From / Bill To
    let y = 130;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FROM', 45, y);
    doc.text(docType === 'INVOICE' ? 'BILL TO' : 'RECEIVED FROM', 310, y);

    y += 16;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(fromName, 45, y);
    doc.text(toName, 310, y);

    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const fromLines = doc.splitTextToSize(fromDetails, 230);
    const toLines = doc.splitTextToSize(toDetails, 230);
    doc.text(fromLines, 45, y);
    doc.text(toLines, 310, y);

    y += Math.max(fromLines.length, toLines.length) * 14 + 28;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(45, y - 14, pageW - 90, 24, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('DESCRIPTION', 55, y + 2);
    doc.text('QTY', 350, y + 2, { align: 'right' });
    doc.text('UNIT PRICE', 445, y + 2, { align: 'right' });
    doc.text('AMOUNT', pageW - 55, y + 2, { align: 'right' });

    y += 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const descLines = doc.splitTextToSize(item.description, 260);
      doc.setTextColor(15, 23, 42);
      doc.text(descLines, 55, y);
      doc.text(String(item.quantity), 350, y, { align: 'right' });
      doc.text(formatMoney(item.unitPrice), 445, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatMoney(lineTotal), pageW - 55, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      const rowHeight = Math.max(1, descLines.length) * 15 + 8;
      doc.setDrawColor(226, 232, 240);
      doc.line(45, y + rowHeight - 10, pageW - 45, y + rowHeight - 10);
      y += rowHeight;
    });

    y += 16;
    const summaryX = 360;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', summaryX, y);
    doc.text(formatMoney(subtotal), pageW - 55, y, { align: 'right' });

    if (discountAmount > 0) {
      y += 18;
      doc.text('Discount:', summaryX, y);
      doc.text(`-${formatMoney(discountAmount)}`, pageW - 55, y, { align: 'right' });
    }

    y += 18;
    doc.text(`Tax (${taxRate}%):`, summaryX, y);
    doc.text(formatMoney(taxTotal), pageW - 55, y, { align: 'right' });

    y += 24;
    doc.setFillColor(15, 23, 42);
    doc.rect(summaryX - 10, y - 15, pageW - summaryX - 35, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(docType === 'INVOICE' ? 'TOTAL DUE:' : 'TOTAL PAID:', summaryX, y + 3);
    doc.text(formatMoney(grandTotal), pageW - 55, y + 3, { align: 'right' });

    if (notes.trim()) {
      y += 55;
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('NOTES & PAYMENT TERMS', 45, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9.5);
      doc.text(doc.splitTextToSize(notes, pageW - 90), 45, y);
    }

    const outBlob = doc.output('blob');
    const url = URL.createObjectURL(outBlob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${docType}-${docNumber}.pdf`,
      fileSize: outBlob.size,
      toolId: 'invoice-generator',
      toolTitle: 'Unbranded Invoice & Receipt Generator',
      customMetricLabel: 'Document Total',
      customMetricValue: formatMoney(grandTotal),
    });
    setBanner(`Exported clean, unbranded ${docType}-${docNumber}.pdf!`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-indigo-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Invoice & Receipt Generator</h2>
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
              onClick={saveInvoiceTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              Save Template
            </button>
            <button
              onClick={exportUnbrandedPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Unbranded PDF
            </button>
          </div>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Create clean, unbranded client invoices and payment receipts with custom currencies, taxes, live A4 paper preview, and instant PDF export.
          </p>
        )}
      </div>

      {banner && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {banner}
          </span>
          <button onClick={() => setBanner(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Editor Controls (7 cols) */}
        <div className="xl:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Document Mode</label>
              <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                {(['INVOICE', 'RECEIPT'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDocType(mode)}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      docType === mode ? 'bg-indigo-500 text-white' : 'text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Number</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Currency</label>
              <select
                value={currency.code}
                onChange={(e) =>
                  setCurrency(CURRENCIES.find((c) => c.code === e.target.value) || CURRENCIES[0])
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase text-slate-400">From (Your Business)</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-medium"
              />
              <textarea
                rows={3}
                value={fromDetails}
                onChange={(e) => setFromDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase text-slate-400">Bill To (Client)</label>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-medium"
              />
              <textarea
                rows={3}
                value={toDetails}
                onChange={(e) => setToDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-slate-400">Line Items</label>
              <button
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Line Item
              </button>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center p-2.5 sm:p-0 rounded-xl sm:rounded-none bg-slate-950/50 sm:bg-transparent border border-slate-800 sm:border-0"
              >
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Description"
                  className="col-span-12 sm:col-span-6 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Qty"
                  className="col-span-4 sm:col-span-2 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white text-right"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                  className="col-span-6 sm:col-span-3 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white text-right"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="col-span-2 sm:col-span-1 flex justify-center py-2 text-slate-500 hover:text-rose-400 cursor-pointer"
                  aria-label="Remove line item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Tax, Discount, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Discount ({currency.symbol})</label>
              <input
                type="number"
                step="1"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Payment Terms / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
            />
          </div>

          {savedInvoices.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                Saved Invoices & Templates ({savedInvoices.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {savedInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => loadSavedInvoice(inv)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 cursor-pointer"
                  >
                    {inv.docType} #{inv.docNumber} ({inv.toName})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Live Unbranded Paper Preview (5 cols) */}
        <div className="xl:col-span-5">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
              <div>
                <span className="text-2xl font-extrabold tracking-tight">{docType}</span>
                <p className="text-xs text-slate-300 mt-0.5">#{docNumber}</p>
              </div>
              <div className="text-right text-xs text-slate-300 space-y-1">
                <p>Issued: {issueDate}</p>
                <p>{docType === 'INVOICE' ? `Due: ${dueDate}` : 'Status: PAID'}</p>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{fromName}</p>
                  <p className="whitespace-pre-line text-slate-600 mt-1">{fromDetails}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {docType === 'INVOICE' ? 'Bill To' : 'Received From'}
                  </p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{toName}</p>
                  <p className="whitespace-pre-line text-slate-600 mt-1">{toDetails}</p>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                    <th className="py-2 px-2.5 text-left">Description</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Rate</th>
                    <th className="py-2 px-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-2.5 text-slate-800 font-medium">{item.description}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{formatMoney(item.unitPrice)}</td>
                      <td className="py-2.5 px-2.5 text-right font-semibold text-slate-900">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-60 space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{formatMoney(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({taxRate}%):</span>
                    <span>{formatMoney(taxTotal)}</span>
                  </div>
                  <div className="flex justify-between bg-slate-900 text-white font-bold text-sm px-3 py-2 rounded-lg mt-2">
                    <span>{docType === 'INVOICE' ? 'Total Due:' : 'Total Paid:'}</span>
                    <span>{formatMoney(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {notes && (
                <div className="pt-3 border-t border-slate-200 text-slate-500">
                  <p className="font-bold text-[10px] uppercase text-slate-400 mb-1">Notes & Terms</p>
                  <p>{notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
