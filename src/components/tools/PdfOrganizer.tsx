import React, { useState, useEffect, useRef } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Stamp,
  RotateCw,
  Hash,
  FileCog,
  Upload,
  Download,
  Eye,
  Info,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type OrganizerTab = 'watermark' | 'pagenumbers' | 'rotate' | 'metadata';

export const PdfOrganizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<OrganizerTab>('watermark');
  const [showInfo, setShowInfo] = useState(false);

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(1);
  const [previewPageNum, setPreviewPageNum] = useState<number>(1);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);

  const [previewOutBytes, setPreviewOutBytes] = useState<Uint8Array | null>(null);
  const [previewOutSuffix, setPreviewOutSuffix] = useState<string>('modified');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Watermark settings
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkSize, setWatermarkSize] = useState(32);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkColor, setWatermarkColor] = useState<'red' | 'slate' | 'indigo'>('red');

  // Page numbering & Bates stamping
  const [numberFormat, setNumberFormat] = useState<'page-of-total' | 'simple' | 'bates'>('page-of-total');
  const [batesPrefix, setBatesPrefix] = useState('EXHIBIT-');
  const [numberPosition, setNumberPosition] = useState<'bottom-right' | 'bottom-center' | 'top-right'>('bottom-right');

  // Rotate settings
  const [rotationAngle, setRotationAngle] = useState<0 | 90 | 180 | 270>(90);

  // Metadata settings
  const [metaTitle, setMetaTitle] = useState('');
  const [metaAuthor, setMetaAuthor] = useState('');
  const [metaSubject, setMetaSubject] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');

  const renderTaskRef = useRef<number>(0);

  // Render the selected page of the uploaded PDF into an image for the Live Visual Preview
  useEffect(() => {
    if (!pdfBytes) {
      setPageImageUrl(null);
      return;
    }
    const taskId = ++renderTaskRef.current;
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
        const pdf = await loadingTask.promise;
        if (taskId !== renderTaskRef.current) return;
        const safePage = Math.min(Math.max(1, previewPageNum), pdf.numPages);
        const page = await pdf.getPage(safePage);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (taskId === renderTaskRef.current) {
            setPageImageUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch {
        // ignore render error
      }
    })();
  }, [pdfBytes, previewPageNum]);

  // Clear stale generated output whenever settings change so user previews fresh changes
  useEffect(() => {
    setPreviewOutBytes(null);
  }, [
    activeTab,
    watermarkText,
    watermarkSize,
    watermarkOpacity,
    watermarkColor,
    numberFormat,
    batesPrefix,
    numberPosition,
    rotationAngle,
    metaTitle,
    metaAuthor,
    metaSubject,
    metaKeywords,
  ]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setPreviewOutBytes(null);
    try {
      const buf = await file.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      const doc = await PDFDocument.load(uint8, { ignoreEncryption: true });
      setPdfBytes(uint8);
      setPdfName(file.name);
      setPageCount(doc.getPageCount());
      setPreviewPageNum(1);
      setMetaTitle(doc.getTitle() || file.name.replace(/\.pdf$/i, ''));
      setMetaAuthor(doc.getAuthor() || '');
      setMetaSubject(doc.getSubject() || '');
      setStatus(`Loaded "${file.name}" (${doc.getPageCount()} pages). Adjust settings to preview live.`);
    } catch {
      setStatus('Could not read PDF file. Please select a valid PDF.');
    } finally {
      setBusy(false);
    }
  };

  const buildModifiedPdf = async (): Promise<{ bytes: Uint8Array; suffix: string } | null> => {
    if (!pdfBytes) {
      setStatus('Please upload a PDF file first.');
      return null;
    }
    setBusy(true);
    try {
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      const total = pages.length;

      if (activeTab === 'watermark') {
        const colorRgb =
          watermarkColor === 'red'
            ? rgb(0.82, 0.12, 0.2)
            : watermarkColor === 'indigo'
            ? rgb(0.31, 0.27, 0.9)
            : rgb(0.28, 0.33, 0.41);

        pages.forEach((p) => {
          const { width, height } = p.getSize();
          p.drawText(watermarkText || 'WATERMARK', {
            x: width * 0.16,
            y: height * 0.38,
            size: watermarkSize,
            font,
            color: colorRgb,
            opacity: watermarkOpacity,
            rotate: degrees(35),
          });
        });
        const out = await doc.save();
        return { bytes: new Uint8Array(out), suffix: 'watermarked' };
      }

      if (activeTab === 'pagenumbers') {
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
              ? width / 2 - 30
              : width - 115;
          const y = numberPosition === 'top-right' ? height - 32 : 28;

          p.drawText(label, {
            x,
            y,
            size: 10,
            font,
            color: rgb(0.18, 0.22, 0.3),
          });
        });
        const out = await doc.save();
        return { bytes: new Uint8Array(out), suffix: 'numbered' };
      }

      if (activeTab === 'rotate') {
        pages.forEach((p) => {
          const current = p.getRotation().angle;
          p.setRotation(degrees((current + rotationAngle) % 360));
        });
        const out = await doc.save();
        return { bytes: new Uint8Array(out), suffix: `rotated-${rotationAngle}deg` };
      }

      // metadata
      doc.setTitle(metaTitle);
      doc.setAuthor(metaAuthor);
      doc.setSubject(metaSubject);
      doc.setKeywords(
        metaKeywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      );
      doc.setProducer('CommonTool Client-Side PDF Engine');
      const out = await doc.save();
      return { bytes: new Uint8Array(out), suffix: 'metadata-updated' };
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewChanges = async () => {
    const res = await buildModifiedPdf();
    if (!res) return;
    setPreviewOutBytes(res.bytes);
    setPreviewOutSuffix(res.suffix);
    setStatus('Changes applied and previewed! Review the live preview and click "Download Final PDF".');
  };

  const handleDownloadFinal = async () => {
    let bytesToSave = previewOutBytes;
    let suffixToSave = previewOutSuffix;
    if (!bytesToSave) {
      const res = await buildModifiedPdf();
      if (!res) return;
      bytesToSave = res.bytes;
      suffixToSave = res.suffix;
      setPreviewOutBytes(res.bytes);
      setPreviewOutSuffix(res.suffix);
    }
    const blob = new Blob([bytesToSave], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${(pdfName || 'document').replace(/\.pdf$/i, '')}-${suffixToSave}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  };

  const liveNumberLabel =
    numberFormat === 'page-of-total'
      ? `Page ${previewPageNum} of ${pageCount}`
      : numberFormat === 'simple'
      ? `${previewPageNum}`
      : `${batesPrefix}${String(previewPageNum).padStart(4, '0')}`;

  const watermarkHex =
    watermarkColor === 'red' ? '#dc2626' : watermarkColor === 'indigo' ? '#4f46e5' : '#475569';

  return (
    <div className="space-y-4">
      {/* Compact Header with (i) Info Toggle & Upload */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Stamp className="w-5 h-5 text-indigo-500 shrink-0" />
          <h2 className="text-base font-bold text-white">PDF Watermark, Bates & Organizer</h2>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            title="About this tool"
            className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer touch-manipulation"
          >
            <Info className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer touch-manipulation">
          <Upload className="w-4 h-4 shrink-0" />
          <span>{pdfName ? 'Change PDF' : 'Upload PDF'}</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </label>
      </div>

      {showInfo && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          Stamp diagonal watermarks, add legal Bates numbers or Page X of Y footers, rotate pages, or edit PDF metadata. All changes are shown in the Live Page Preview before you download.
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-4">
        {[
          { id: 'watermark' as OrganizerTab, label: 'Watermark', icon: Stamp },
          { id: 'pagenumbers' as OrganizerTab, label: 'Page / Bates #', icon: Hash },
          { id: 'rotate' as OrganizerTab, label: 'Rotate Pages', icon: RotateCw },
          { id: 'metadata' as OrganizerTab, label: 'Metadata', icon: FileCog },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 whitespace-nowrap touch-manipulation active:scale-95 ${
                active
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Split Workspace: Left = Controls, Right = Live Visual Page Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Controls */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {activeTab === 'watermark' && (
              <>
                <h3 className="text-sm font-bold text-white">Watermark Settings</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Watermark Text</label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Font Size ({watermarkSize}pt)
                    </label>
                    <input
                      type="range"
                      min={16}
                      max={56}
                      value={watermarkSize}
                      onChange={(e) => setWatermarkSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Opacity ({Math.round(watermarkOpacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={0.08}
                      max={0.7}
                      step={0.02}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stamp Color</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'red' as const, label: 'Crimson Red' },
                      { id: 'indigo' as const, label: 'Indigo Blue' },
                      { id: 'slate' as const, label: 'Slate Gray' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setWatermarkColor(c.id)}
                        className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                          watermarkColor === c.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'pagenumbers' && (
              <>
                <h3 className="text-sm font-bold text-white">Page Numbers & Bates Stamping</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Numbering Style</label>
                  <select
                    value={numberFormat}
                    onChange={(e) =>
                      setNumberFormat(e.target.value as 'page-of-total' | 'simple' | 'bates')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="page-of-total">Page 1 of N</option>
                    <option value="simple">Simple Page Number (1, 2, 3...)</option>
                    <option value="bates">Legal Bates Numbering (EXHIBIT-0001)</option>
                  </select>
                </div>
                {numberFormat === 'bates' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bates Prefix</label>
                    <input
                      type="text"
                      value={batesPrefix}
                      onChange={(e) => setBatesPrefix(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-code"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stamp Position</label>
                  <select
                    value={numberPosition}
                    onChange={(e) =>
                      setNumberPosition(
                        e.target.value as 'bottom-right' | 'bottom-center' | 'top-right'
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'rotate' && (
              <>
                <h3 className="text-sm font-bold text-white">Page Orientation</h3>
                <p className="text-xs text-slate-400">
                  Select a rotation angle below and inspect the live page preview on the right:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([0, 90, 180, 270] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotationAngle(deg)}
                      className={`py-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        rotationAngle === deg
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'metadata' && (
              <>
                <h3 className="text-sm font-bold text-white">PDF Document Properties</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="Document Title"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Author</label>
                    <input
                      type="text"
                      value={metaAuthor}
                      onChange={(e) => setMetaAuthor(e.target.value)}
                      placeholder="Author / Organization"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={metaSubject}
                      onChange={(e) => setMetaSubject(e.target.value)}
                      placeholder="Document Subject"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Keywords</label>
                    <input
                      type="text"
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      placeholder="comma, separated, tags"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons: Preview First, Then Download */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            {status && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{status}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePreviewChanges}
                disabled={busy || !pdfBytes}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Apply & Verify Preview
              </button>

              <button
                type="button"
                onClick={handleDownloadFinal}
                disabled={busy || !pdfBytes}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Final PDF
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Visual Page Preview */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Live Visual Page Preview
            </span>
            {pdfBytes && pageCount > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewPageNum((p) => Math.max(1, p - 1))}
                  disabled={previewPageNum <= 1}
                  className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-code text-[11px]">
                  Page {previewPageNum} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPageNum((p) => Math.min(pageCount, p + 1))}
                  disabled={previewPageNum >= pageCount}
                  className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Live A4 Sheet Container showing real-time Watermark / Bates / Rotation / Metadata */}
          <div className="flex-1 min-h-[340px] rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
            <div
              className="relative bg-white text-slate-900 rounded shadow-lg border border-slate-300 w-[240px] h-[310px] overflow-hidden transition-transform duration-200 select-none"
              style={{
                transform: activeTab === 'rotate' ? `rotate(${rotationAngle}deg)` : 'none',
              }}
            >
              {pageImageUrl ? (
                <img
                  src={pageImageUrl}
                  alt="PDF Page Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-5 space-y-3 text-left">
                  <div className="h-3 w-3/4 bg-slate-200 rounded" />
                  <div className="h-2 w-1/2 bg-slate-100 rounded" />
                  <div className="pt-3 space-y-2">
                    <div className="h-2 w-full bg-slate-100 rounded" />
                    <div className="h-2 w-5/6 bg-slate-100 rounded" />
                    <div className="h-2 w-4/6 bg-slate-100 rounded" />
                  </div>
                  <p className="text-[10px] text-slate-400 pt-8 text-center">
                    {pdfName || 'Upload a PDF above to preview your actual document page here'}
                  </p>
                </div>
              )}

              {/* Live Watermark Overlay */}
              {activeTab === 'watermark' && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    opacity: watermarkOpacity,
                    transform: 'rotate(-35deg)',
                  }}
                >
                  <span
                    className="font-extrabold tracking-wider text-center px-2"
                    style={{
                      color: watermarkHex,
                      fontSize: `${Math.max(10, Math.round(watermarkSize * 0.45))}px`,
                    }}
                  >
                    {watermarkText || 'WATERMARK'}
                  </span>
                </div>
              )}

              {/* Live Page Number / Bates Overlay */}
              {activeTab === 'pagenumbers' && (
                <div
                  className={`absolute px-2.5 py-1 text-[10px] font-bold font-mono-code text-slate-800 bg-white/80 rounded pointer-events-none ${
                    numberPosition === 'top-right'
                      ? 'top-2 right-2'
                      : numberPosition === 'bottom-center'
                      ? 'bottom-2 left-1/2 -translate-x-1/2'
                      : 'bottom-2 right-2'
                  }`}
                >
                  {liveNumberLabel}
                </div>
              )}

              {/* Live Metadata Card Overlay */}
              {activeTab === 'metadata' && (
                <div className="absolute inset-x-3 bottom-3 p-2.5 rounded-lg bg-slate-900/90 text-white text-[10px] space-y-0.5">
                  <p className="font-bold truncate">Title: {metaTitle || '(Untitled)'}</p>
                  <p className="text-slate-300 truncate">Author: {metaAuthor || '(None)'}</p>
                  <p className="text-slate-400 truncate">Subject: {metaSubject || '(None)'}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {pdfBytes
              ? `Previewing "${pdfName}" (${(pdfBytes.byteLength / 1024).toFixed(1)} KB)`
              : 'Live interactive preview — upload any PDF to preview changes on your actual document.'}
          </p>
        </div>
      </div>
    </div>
  );
};
