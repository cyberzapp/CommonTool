import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import {
  ScanText,
  Upload,
  Copy,
  Download,
  CheckCircle2,
  Sliders,
  Info,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const OcrScanner: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(true);
  const [ocrText, setOcrText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [statusLabel, setStatusLabel] = useState<string>('Idle');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const preprocessImage = async (srcUrl: string, useContrast: boolean): Promise<string> => {
    if (!useContrast) return srcUrl;
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

  // Live visual preview of image preprocessing whenever image or contrast toggle changes
  useEffect(() => {
    if (!imageUrl) {
      setProcessedPreviewUrl(null);
      return;
    }
    let cancelled = false;
    preprocessImage(imageUrl, highContrast)
      .then((res) => {
        if (!cancelled) setProcessedPreviewUrl(res);
      })
      .catch(() => {
        if (!cancelled) setProcessedPreviewUrl(imageUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, highContrast]);

  const runOcrOnDataUrl = async (targetUrl: string, useContrast = highContrast) => {
    setIsScanning(true);
    setProgress(5);
    setStatusLabel('Initializing Tesseract WebAssembly OCR...');
    try {
      const processedUrl = await preprocessImage(targetUrl, useContrast);
      setProcessedPreviewUrl(processedUrl);
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
      runOcrOnDataUrl(dataUrl, highContrast);
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
    <div className="space-y-5">
      {/* Compact Header with (i) Info Toggle */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ScanText className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">OCR / Image-to-Text Scanner</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool information"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer">
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

        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Extract text from scanned documents, receipts, screenshots, and notes 100% locally via Tesseract WebAssembly. Preview image binarization and edit extracted text before downloading.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Live Image Preprocessing Preview & Controls */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
              />
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              High-Contrast Adaptive Binarization
            </label>

            {imageUrl && (
              <button
                onClick={() => runOcrOnDataUrl(imageUrl, highContrast)}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-emerald-300 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                Re-Scan with Current Filter
              </button>
            )}
          </div>

          {processedPreviewUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  <Eye className="w-3.5 h-3.5" />
                  Live Preprocessed Scanner Preview ({highContrast ? 'High-Contrast Binarized' : 'Original Color'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <img
                  src={processedPreviewUrl}
                  alt="Live Preprocessed OCR Preview"
                  className="max-h-72 mx-auto rounded object-contain"
                />
              </div>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-xl p-12 text-center space-y-2 cursor-pointer transition">
              <ScanText className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">Click to upload an image, receipt, or screenshot</p>
              <p className="text-xs text-slate-500">Supports PNG, JPG, WEBP — processed locally in your browser</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
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

        {/* Right: Live Editable Extracted Text Output Preview before Download */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Live Extracted Text Preview (Editable)</h3>
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-xs font-bold text-slate-950 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download .TXT
              </button>
            </div>
          </div>

          <textarea
            rows={11}
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Upload an image on the left to preview and edit extracted text before downloading..."
            className="w-full flex-1 rounded-xl bg-slate-950 border border-slate-800 p-4 text-sm text-slate-100 font-mono-code"
          />
        </div>
      </div>
    </div>
  );
};
