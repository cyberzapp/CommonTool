import React, { useState, useEffect, useRef, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
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
  RotateCw,
  Languages,
  Check,
  Sparkles,
  Camera,
  FileText,
  FileCode,
  FileJson,
  Hash,
  Mail,
  Phone,
  Link2,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
  ZoomIn,
} from 'lucide-react';

export interface OcrLanguage {
  code: string;
  name: string;
  nativeName: string;
}

const OCR_LANGUAGES: OcrLanguage[] = [
  { code: 'eng', name: 'English', nativeName: 'English' },
  { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'spa', name: 'Spanish', nativeName: 'Español' },
  { code: 'fra', name: 'French', nativeName: 'Français' },
  { code: 'deu', name: 'German', nativeName: 'Deutsch' },
  { code: 'ita', name: 'Italian', nativeName: 'Italiano' },
  { code: 'por', name: 'Portuguese', nativeName: 'Português' },
  { code: 'rus', name: 'Russian', nativeName: 'Русский' },
  { code: 'chi_sim', name: 'Chinese Simplified', nativeName: '简体中文' },
  { code: 'jpn', name: 'Japanese', nativeName: '日本語' },
  { code: 'ara', name: 'Arabic', nativeName: 'العربية' },
];

export type PreprocessFilter = 'none' | 'high-contrast' | 'invert' | 'grayscale' | 'binarize';

export const OcrScanner: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('scanned-document.png');

  // Vision Pipeline Settings
  const [filterMode, setFilterMode] = useState<PreprocessFilter>('high-contrast');
  const [rotationDegrees, setRotationDegrees] = useState<0 | 90 | 180 | 270>(0);
  const [brightness, setBrightness] = useState<number>(0); // -50 to +50
  const [contrastBoost, setContrastBoost] = useState<number>(15); // 0 to 50

  // OCR Execution State
  const [ocrText, setOcrText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [statusLabel, setStatusLabel] = useState<string>('Ready for document upload');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeExtractor, setActiveExtractor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Vision Preprocessing Engine on In-Memory Canvas
  const preprocessImage = async (
    srcUrl: string,
    filter: PreprocessFilter,
    rotation: 0 | 90 | 180 | 270,
    brightVal: number,
    contrastVal: number
  ): Promise<string> => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for preprocessing.'));
      img.src = srcUrl;
    });

    const canvas = document.createElement('canvas');
    const isSideways = rotation === 90 || rotation === 270;
    canvas.width = isSideways ? img.height : img.width;
    canvas.height = isSideways ? img.width : img.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return srcUrl;

    // Apply Rotation Transform
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // If no pixel filters needed and rotation is 0 and sliders are at default
    if (filter === 'none' && brightVal === 0 && contrastVal === 0) {
      return canvas.toDataURL('image/png');
    }

    // Apply Pixel Level Filters
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Brightness & Contrast
      if (brightVal !== 0) {
        r += brightVal;
        g += brightVal;
        b += brightVal;
      }
      if (contrastVal !== 0) {
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // Clamp RGB
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      // Luminance (Standard ITU-R BT.601)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (filter === 'grayscale') {
        d[i] = d[i + 1] = d[i + 2] = lum;
      } else if (filter === 'high-contrast') {
        const boosted = lum > 145 ? 255 : Math.max(0, lum * 0.55);
        d[i] = d[i + 1] = d[i + 2] = boosted;
      } else if (filter === 'binarize') {
        const binary = lum > 130 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = binary;
      } else if (filter === 'invert') {
        // Ideal for light text on dark screenshots / code editors
        d[i] = 255 - r;
        d[i + 1] = 255 - g;
        d[i + 2] = 255 - b;
      } else {
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  // Re-run live visual preprocessing preview whenever vision filters change
  useEffect(() => {
    if (!imageUrl) {
      setProcessedPreviewUrl(null);
      return;
    }
    let cancelled = false;
    preprocessImage(imageUrl, filterMode, rotationDegrees, brightness, contrastBoost)
      .then((res) => {
        if (!cancelled) setProcessedPreviewUrl(res);
      })
      .catch(() => {
        if (!cancelled) setProcessedPreviewUrl(imageUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, filterMode, rotationDegrees, brightness, contrastBoost]);

  // Execute Tesseract WebAssembly OCR
  const runOcr = async (targetDataUrl: string) => {
    setIsScanning(true);
    setProgress(5);
    setStatusLabel(`Loading ${selectedLanguage.toUpperCase()} OCR model...`);
    setActiveExtractor(null);

    try {
      // Always run on the preprocessed canvas image for optimal accuracy
      const processedUrl = await preprocessImage(
        targetDataUrl,
        filterMode,
        rotationDegrees,
        brightness,
        contrastBoost
      );
      setProcessedPreviewUrl(processedUrl);

      const result = await Tesseract.recognize(processedUrl, selectedLanguage, {
        logger: (m) => {
          if (m.status) {
            if (m.status === 'recognizing text') {
              setStatusLabel('Analyzing text blocks & glyphs...');
            } else {
              setStatusLabel(m.status);
            }
          }
          if (typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extracted = result.data.text.trim();
      setOcrText(extracted);
      setConfidence(Math.round(result.data.confidence));
      setStatusLabel('Recognition Complete');
      setProgress(100);
    } catch (err: unknown) {
      setStatusLabel(`OCR Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Local File Upload
  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageUrl(dataUrl);
      void runOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Support (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedLanguage, filterMode, rotationDegrees, brightness, contrastBoost]);

  // Rotate Image 90° Clockwise
  const rotateClockwise = () => {
    setRotationDegrees((prev) => {
      if (prev === 0) return 90;
      if (prev === 90) return 180;
      if (prev === 180) return 270;
      return 0;
    });
  };

  // Smart Post-Processing & Text Transforms
  const fixParagraphBreaks = () => {
    // Replaces isolated single newlines between words with a space while preserving double newlines
    const fixed = ocrText.replace(/([^\n])\n([^\n])/g, '$1 $2');
    setOcrText(fixed);
  };

  const convertCase = (mode: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (mode === 'upper') {
      setOcrText(ocrText.toUpperCase());
    } else if (mode === 'lower') {
      setOcrText(ocrText.toLowerCase());
    } else if (mode === 'title') {
      setOcrText(
        ocrText.replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        )
      );
    } else if (mode === 'sentence') {
      setOcrText(
        ocrText.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase())
      );
    }
  };

  // Pattern Extractors
  const extractPatterns = (type: 'email' | 'phone' | 'url' | 'amount') => {
    setActiveExtractor(type);
    let matches: string[] = [];
    if (type === 'email') {
      matches = ocrText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    } else if (type === 'phone') {
      matches =
        ocrText.match(
          /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
        ) || [];
    } else if (type === 'url') {
      matches = ocrText.match(/(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi) || [];
    } else if (type === 'amount') {
      matches =
        ocrText.match(/(?:[\$₹€£]|USD|INR|EUR|GBP)\s?[0-9,]+(?:\.[0-9]{2})?/gi) || [];
    }

    if (matches.length > 0) {
      const deduplicated = Array.from(new Set(matches.map((m) => m.trim())));
      setOcrText(deduplicated.join('\n'));
    } else {
      setStatusLabel(`No ${type} patterns found in extracted text.`);
    }
  };

  // Copy Extracted Text
  const copyExtracted = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Plain Text (.txt)
  const downloadTxt = () => {
    const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${imageFileName.replace(/\.[^/.]+$/, '')}-ocr.txt`,
      fileSize: blob.size,
      toolId: 'ocr-scanner',
      toolTitle: 'OCR & Vision Studio',
      customMetricLabel: 'Characters Extracted',
      customMetricValue: `${ocrText.length} chars`,
    });
  };

  // Export Markdown (.md)
  const downloadMarkdown = () => {
    const mdContent = `# OCR Extracted Text\n\n**Source:** ${imageFileName}\n**Language:** ${selectedLanguage}\n**Confidence:** ${
      confidence ? `${confidence}%` : 'N/A'
    }\n\n---\n\n${ocrText}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: `${imageFileName.replace(/\.[^/.]+$/, '')}-ocr.md`,
      fileSize: blob.size,
      toolId: 'ocr-scanner',
      toolTitle: 'OCR & Vision Studio',
      customMetricLabel: 'Characters Extracted',
      customMetricValue: `${ocrText.length} chars`,
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const chars = ocrText.length;
    const words = ocrText.trim() ? ocrText.trim().split(/\s+/).length : 0;
    const lines = ocrText ? ocrText.split('\n').length : 0;
    const readingTimeMins = Math.max(1, Math.round(words / 200));
    return { chars, words, lines, readingTimeMins };
  }, [ocrText]);

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ScanText className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">OCR & Vision Studio</h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  11 Languages • Neural Tesseract WebAssembly
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extract editable text from scanned documents, screenshots, and photos with zero cloud uploads.
              </p>
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle studio information"
              className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer touch-manipulation"
              title="About this studio"
            >
              <Info className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex sm:hidden items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer touch-manipulation"
              title="Snap photo with camera"
            >
              <Camera className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer touch-manipulation"
            >
              <Upload className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Upload Image</span>
            </button>

            {imageUrl && (
              <button
                type="button"
                onClick={() => runOcr(imageUrl)}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer touch-manipulation disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Re-Scan Text'}</span>
              </button>
            )}
          </div>
        </div>

        {showInfo && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <p>
              CommonTool OCR & Vision Studio performs optical character recognition 100% inside your browser using WebAssembly.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Zero Cloud Uploads:</strong> Your documents, receipts, contracts, and notes never leave your computer or phone.</li>
              <li><strong>Vision Filters:</strong> Use Color Inversion for dark mode screenshots, Adaptive Binarization for shadowed paper, and 90° rotation for camera scans.</li>
              <li><strong>Clipboard Paste:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-code text-[11px]">Cmd+V</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-code text-[11px]">Ctrl+V</kbd> anywhere on this page to immediately scan a copied screenshot!</li>
            </ul>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VISION PREPROCESSING & IMAGE CANVAS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Language Model
              </span>

              <select
                value={selectedLanguage}
                onChange={(e) => {
                  setSelectedLanguage(e.target.value);
                  if (imageUrl) void runOcr(imageUrl);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white cursor-pointer font-medium"
              >
                {OCR_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Vision Filters */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Pre-Processing Filter
                </span>
                <button
                  type="button"
                  onClick={rotateClockwise}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer touch-manipulation"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="w-3 h-3 shrink-0" />
                  <span>Rotate {rotationDegrees > 0 ? `${rotationDegrees}°` : ''}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'high-contrast', label: 'Enhanced' },
                    { id: 'binarize', label: 'Binarize' },
                    { id: 'invert', label: 'Invert (Dark)' },
                    { id: 'grayscale', label: 'Grayscale' },
                    { id: 'none', label: 'Raw Original' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterMode(f.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      filterMode === f.id
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for fine-tuning */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Contrast Boost</span>
                  <span>+{contrastBoost}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={contrastBoost}
                  onChange={(e) => setContrastBoost(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Brightness</span>
                  <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Interactive Image Viewport */}
          <div
            ref={dropZoneRef}
            onClick={() => {
              if (!imageUrl) fileInputRef.current?.click();
            }}
            className={`rounded-2xl border-2 border-dashed p-4 text-center min-h-[340px] flex flex-col items-center justify-center transition cursor-pointer overflow-hidden relative ${
              imageUrl
                ? 'border-slate-800 bg-slate-950'
                : 'border-slate-700 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/60'
            }`}
          >
            {processedPreviewUrl ? (
              <div className="space-y-3 w-full">
                <img
                  src={processedPreviewUrl}
                  alt="Vision Pipeline Preview"
                  className="max-h-[380px] w-auto mx-auto object-contain rounded-xl shadow-lg border border-slate-800"
                />
                <p className="text-[11px] text-slate-500 font-mono-code truncate max-w-xs mx-auto">
                  {imageFileName}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-w-sm px-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <ScanText className="w-7 h-7 shrink-0" />
                </div>
                <h3 className="text-sm font-bold text-white">Drop Document or Image Here</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supports PNG, JPG, WEBP, BMP & Screenshots. Or press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono-code text-[10px]">
                    Cmd+V
                  </kbd>{' '}
                  to paste from clipboard.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>Choose File</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: OCR RESULTS & TEXT STUDIO (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          {/* Progress & Confidence Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">{statusLabel}</span>
                {isScanning && (
                  <span className="text-[10px] font-mono-code text-emerald-400 font-bold">
                    {progress}%
                  </span>
                )}
              </div>
              {isScanning && (
                <div className="w-48 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            {confidence !== null && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Confidence:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    confidence > 80
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : confidence > 50
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {confidence}%
                </span>
              </div>
            )}
          </div>

          {/* Quick Pattern Extractors Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Extract:</span>
            <button
              type="button"
              onClick={() => extractPatterns('email')}
              disabled={!ocrText}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 transition ${
                activeExtractor === 'email'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span>Emails</span>
            </button>

            <button
              type="button"
              onClick={() => extractPatterns('phone')}
              disabled={!ocrText}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 transition ${
                activeExtractor === 'phone'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>Phones</span>
            </button>

            <button
              type="button"
              onClick={() => extractPatterns('url')}
              disabled={!ocrText}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 transition ${
                activeExtractor === 'url'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Link2 className="w-3 h-3 shrink-0" />
              <span>Links</span>
            </button>

            <button
              type="button"
              onClick={() => extractPatterns('amount')}
              disabled={!ocrText}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 transition ${
                activeExtractor === 'amount'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <DollarSign className="w-3 h-3 shrink-0" />
              <span>Amounts</span>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={fixParagraphBreaks}
                disabled={!ocrText}
                className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 disabled:opacity-40 cursor-pointer"
                title="Merge soft broken lines into continuous paragraphs"
              >
                Fix Line Wraps
              </button>

              <button
                type="button"
                onClick={() => convertCase('title')}
                disabled={!ocrText}
                className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Title Case
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <div className="space-y-2">
            <textarea
              rows={13}
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="Extracted document text will appear here automatically..."
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono-code text-xs sm:text-sm leading-relaxed resize-y focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Statistics & Export Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>{metrics.chars.toLocaleString()} chars</span>
              <span>•</span>
              <span>{metrics.words.toLocaleString()} words</span>
              <span>•</span>
              <span>{metrics.lines} lines</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 shrink-0 text-slate-500" />~{metrics.readingTimeMins} min read
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyExtracted}
                disabled={!ocrText}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={downloadTxt}
                disabled={!ocrText}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                <FileText className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Save .TXT</span>
              </button>

              <button
                type="button"
                onClick={downloadMarkdown}
                disabled={!ocrText}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40 shadow-sm"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Save .MD</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
