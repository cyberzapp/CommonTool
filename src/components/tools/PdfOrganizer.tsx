import React, { useState } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import {
  Stamp,
  RotateCw,
  Hash,
  FileCog,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

type OrganizerTab = 'watermark' | 'pagenumbers' | 'rotate' | 'metadata';

export const PdfOrganizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrganizerTab>('watermark');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>('No PDF loaded');
  const [pageCount, setPageCount] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Watermark settings
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL — INTERNAL USE ONLY');
  const [watermarkSize, setWatermarkSize] = useState(32);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.22);

  // Page numbering & Bates stamping
  const [numberFormat, setNumberFormat] = useState<'page-of-total' | 'simple' | 'bates'>('page-of-total');
  const [batesPrefix, setBatesPrefix] = useState('EXHIBIT-');
  const [numberPosition, setNumberPosition] = useState<'bottom-right' | 'bottom-center' | 'top-right'>('bottom-right');

  // Rotate settings
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);

  // Metadata settings
  const [metaTitle, setMetaTitle] = useState('Q4 Executive Board Briefing');
  const [metaAuthor, setMetaAuthor] = useState('Operations & Legal Team');
  const [metaSubject, setMetaSubject] = useState('Corporate Strategy & Financial Compliance');
  const [metaKeywords, setMetaKeywords] = useState('confidential, board, finance, compliance');

  const downloadPdf = (bytes: Uint8Array, suffix: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdfName.replace(/\.pdf$/i, '')}-${suffix}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSamplePdf = async () => {
    setBusy(true);
    try {
      const doc = await PDFDocument.create();
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);

      for (let i = 1; i <= 3; i++) {
        const page = doc.addPage([612, 792]);
        page.drawText(`Executive Briefing Document — Section ${i}`, {
          x: 50,
          y: 720,
          size: 18,
          font: fontBold,
          color: rgb(0.1, 0.14, 0.24),
        });
        page.drawText(
          'Use this sample document to test Diagonal Watermarking, Bates Numbering, Page Rotation, and PDF Metadata editing.',
          {
            x: 50,
            y: 685,
            size: 10.5,
            font: fontReg,
            color: rgb(0.3, 0.35, 0.42),
          }
        );
      }

      const saved = await doc.save();
      const uint8 = new Uint8Array(saved);
      setPdfBytes(uint8);
      setPdfName('Briefing-Document.pdf');
      setPageCount(3);
      setStatus('Loaded 3-page sample PDF ready for watermarking, numbering, rotation, or metadata updates.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      const doc = await PDFDocument.load(uint8, { ignoreEncryption: true });
      setPdfBytes(uint8);
      setPdfName(file.name);
      setPageCount(doc.getPageCount());
      setMetaTitle(doc.getTitle() || file.name.replace(/\.pdf$/i, ''));
      setMetaAuthor(doc.getAuthor() || '');
      setMetaSubject(doc.getSubject() || '');
      setStatus(`Loaded "${file.name}" (${doc.getPageCount()} pages).`);
    } catch {
      setStatus('Could not read PDF file.');
    } finally {
      setBusy(false);
    }
  };

  const applyWatermark = async () => {
    if (!pdfBytes) {
      await loadSamplePdf();
      return;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      pages.forEach((p) => {
        const { width, height } = p.getSize();
        p.drawText(watermarkText, {
          x: width * 0.14,
          y: height * 0.35,
          size: watermarkSize,
          font,
          color: rgb(0.75, 0.15, 0.2),
          opacity: watermarkOpacity,
          rotate: degrees(35),
        });
      });
      const out = await doc.save();
      downloadPdf(new Uint8Array(out), 'watermarked');
      setStatus(`Stamped "${watermarkText}" across all ${pages.length} pages.`);
    } finally {
      setBusy(false);
    }
  };

  const applyPageNumbers = async () => {
    if (!pdfBytes) {
      await loadSamplePdf();
      return;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      const total = pages.length;

      pages.forEach((p, idx) => {
        const { width, height } = p.getSize();
        const num = idx + 1;
        const label =
          numberFormat === 'page-of-total'
            ? `Page ${num} of ${total}`
            : numberFormat === 'simple'
            ? `${num}`
            : `${batesPrefix}${String(num).padStart(4, '0')}`;

        const x =
          numberPosition === 'bottom-center'
            ? width / 2 - 28
            : width - 115;
        const y = numberPosition === 'top-right' ? height - 36 : 30;

        p.drawText(label, {
          x,
          y,
          size: 10,
          font,
          color: rgb(0.2, 0.24, 0.32),
        });
      });

      const out = await doc.save();
      downloadPdf(new Uint8Array(out), 'numbered');
      setStatus(`Added ${numberFormat === 'bates' ? 'Bates numbering' : 'page numbers'} to ${total} pages.`);
    } finally {
      setBusy(false);
    }
  };

  const applyRotation = async () => {
    if (!pdfBytes) {
      await loadSamplePdf();
      return;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.getPages().forEach((p) => {
        const current = p.getRotation().angle;
        p.setRotation(degrees((current + rotationAngle) % 360));
      });
      const out = await doc.save();
      downloadPdf(new Uint8Array(out), `rotated-${rotationAngle}deg`);
      setStatus(`Rotated all pages by ${rotationAngle}° and exported PDF.`);
    } finally {
      setBusy(false);
    }
  };

  const applyMetadata = async () => {
    if (!pdfBytes) {
      await loadSamplePdf();
      return;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      doc.setTitle(metaTitle);
      doc.setAuthor(metaAuthor);
      doc.setSubject(metaSubject);
      doc.setKeywords(metaKeywords.split(',').map((k) => k.trim()).filter(Boolean));
      doc.setProducer('CommonTool Client-Side PDF Engine');
      const out = await doc.save();
      downloadPdf(new Uint8Array(out), 'metadata-updated');
      setStatus('Updated embedded XMP/Document properties and downloaded PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Stamp className="w-6 h-6 text-indigo-400" />
            PDF Watermark, Bates Numbering & Metadata Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Stamp diagonal watermarks, add Page X of Y or legal Bates numbers, rotate pages, and edit PDF metadata locally.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadSamplePdf}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Load Sample PDF
          </button>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload PDF ({pageCount > 0 ? `${pageCount}p` : 'Select'})</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {status && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {status}
          </span>
          <button onClick={() => setStatus(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'watermark', label: 'Stamp Watermark', icon: Stamp },
          { id: 'pagenumbers', label: 'Page & Bates Numbers', icon: Hash },
          { id: 'rotate', label: 'Rotate Pages', icon: RotateCw },
          { id: 'metadata', label: 'Edit PDF Metadata', icon: FileCog },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as OrganizerTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'watermark' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Watermark Stamp Text</label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Font Size ({watermarkSize}pt)</label>
              <input
                type="range"
                min={18}
                max={64}
                value={watermarkSize}
                onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
              <input
                type="range"
                min={0.08}
                max={0.6}
                step={0.02}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <button
            onClick={applyWatermark}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Apply Diagonal Watermark & Download PDF
          </button>
        </div>
      )}

      {activeTab === 'pagenumbers' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Format Style</label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value as typeof numberFormat)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="page-of-total">Page 1 of N</option>
                <option value="simple">Simple Number (1, 2, 3...)</option>
                <option value="bates">Legal Bates Numbering (EXHIBIT-0001)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Page Position</label>
              <select
                value={numberPosition}
                onChange={(e) => setNumberPosition(e.target.value as typeof numberPosition)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-center">Bottom Center</option>
                <option value="top-right">Top Right Header</option>
              </select>
            </div>
            {numberFormat === 'bates' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bates Prefix</label>
                <input
                  type="text"
                  value={batesPrefix}
                  onChange={(e) => setBatesPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            )}
          </div>
          <button
            onClick={applyPageNumbers}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Stamp Page Numbers & Download PDF
          </button>
        </div>
      )}

      {activeTab === 'rotate' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            {([90, 180, 270] as const).map((deg) => (
              <button
                key={deg}
                onClick={() => setRotationAngle(deg)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${
                  rotationAngle === deg
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-300'
                }`}
              >
                Rotate +{deg}° Clockwise
              </button>
            ))}
          </div>
          <button
            onClick={applyRotation}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            Rotate All Pages & Download PDF
          </button>
        </div>
      )}

      {activeTab === 'metadata' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Document Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Author / Organization</label>
              <input
                type="text"
                value={metaAuthor}
                onChange={(e) => setMetaAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={metaSubject}
                onChange={(e) => setMetaSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Keywords (comma separated)</label>
              <input
                type="text"
                value={metaKeywords}
                onChange={(e) => setMetaKeywords(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
          <button
            onClick={applyMetadata}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Save Metadata & Download PDF
          </button>
        </div>
      )}
    </div>
  );
};
