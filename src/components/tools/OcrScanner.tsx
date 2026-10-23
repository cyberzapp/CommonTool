import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import {
  ScanText,
  Upload,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export const OcrScanner: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(true);
  const [ocrText, setOcrText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [statusLabel, setStatusLabel] = useState<string>('Idle');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Create a crisp synthetic receipt or scanned memo canvas and run OCR on it
  const generateSampleDocument = (kind: 'receipt' | 'memo') => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 460;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    if (kind === 'receipt') {
      ctx.font = 'bold 28px monospace';
      ctx.fillText('COMMONTOOL COFFEE ROASTERS', 50, 65);
      ctx.font = '20px monospace';
      ctx.fillText('Order #4092  -  Date: 2026-10-23', 50, 110);
      ctx.fillText('--------------------------------------', 50, 145);
      ctx.fillText('1x Double Espresso           $4.50', 50, 185);
      ctx.fillText('2x Artisanal Croissant       $9.00', 50, 225);
      ctx.fillText('1x Oat Milk Latte            $5.75', 50, 265);
      ctx.fillText('--------------------------------------', 50, 305);
      ctx.font = 'bold 24px monospace';
      ctx.fillText('TOTAL PAID:                 $19.25', 50, 350);
      ctx.font = '18px monospace';
      ctx.fillText('Thank you for choosing zero-upload OCR!', 50, 405);
    } else {
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText('RESEARCH FIELD NOTE #18', 50, 70);
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText('Subject: Client-Side WebAssembly Performance', 50, 125);
      ctx.fillText('Observation 1: Zero server latency on document scans.', 50, 185);
      ctx.fillText('Observation 2: Full user privacy for sensitive records.', 50, 235);
      ctx.fillText('Action Item: Export extracted text directly to Markdown.', 50, 285);
      ctx.fillText('Signed: Dr. Elena Vance, Lead Architect', 50, 355);
    }

    const url = canvas.toDataURL('image/png');
    setImageUrl(url);
    runOcrOnDataUrl(url);
  };

  const preprocessImage = async (srcUrl: string): Promise<string> => {
    if (!highContrast) return srcUrl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('Image load error'));
      img.src = srcUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const boosted = lum > 155 ? 255 : Math.max(0, lum * 0.65);
      d[i] = d[i + 1] = d[i + 2] = boosted;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const runOcrOnDataUrl = async (targetUrl: string) => {
    setIsScanning(true);
    setProgress(5);
    setStatusLabel('Initializing Tesseract WebAssembly OCR...');
    try {
      const processedUrl = await preprocessImage(targetUrl);
      const result = await Tesseract.recognize(processedUrl, 'eng', {
        logger: (m) => {
          if (m.status) setStatusLabel(m.status);
          if (typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setOcrText(result.data.text.trim());
      setConfidence(Math.round(result.data.confidence));
      setStatusLabel('Extraction Complete');
      setProgress(100);
    } catch (err: unknown) {
      setStatusLabel(`OCR Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageUrl(dataUrl);
      runOcrOnDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const copyExtracted = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = () => {
    const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CommonTool-OCR-Extracted.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ScanText className="w-6 h-6 text-emerald-400" />
            OCR / Image-to-Text Scanner
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Extract text from scanned documents, receipts, screenshots, and notes 100% locally via WebAssembly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => generateSampleDocument('receipt')}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Scan Sample Receipt
          </button>
          <button
            onClick={() => generateSampleDocument('memo')}
            disabled={isScanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Scan Sample Field Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image Source & Controls */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
              />
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Auto Contrast & Adaptive Binarization
            </label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image / Screenshot</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          {imageUrl ? (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <img src={imageUrl} alt="OCR Document" className="max-h-64 mx-auto rounded object-contain" />
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-12 text-center space-y-2">
              <ScanText className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">Drop or upload an image, or click "Scan Sample Receipt"</p>
            </div>
          )}

          {/* Progress Bar */}
          {(isScanning || progress > 0) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-300 font-medium capitalize">{statusLabel}</span>
                <span className="text-slate-400">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Extracted Text Output */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Extracted Text</h3>
              {confidence !== null && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  {confidence}% Confidence
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyExtracted}
                disabled={!ocrText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-200 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadTxt}
                disabled={!ocrText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-xs font-bold text-slate-950 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export .TXT
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Extracted text will appear here automatically..."
            className="w-full flex-1 rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 font-mono-code"
          />
        </div>
      </div>
    </div>
  );
};
