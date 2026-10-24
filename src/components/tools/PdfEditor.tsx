import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileEdit,
  Upload,
  Download,
  Type,
  Bold,
  Italic,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Plus,
  Minus,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  PenTool,
  Info,
  CheckCircle2,
  AlertTriangle,
  Move,
  Sparkles,
  Stamp,
  Droplet,
  Undo2,
  Redo2,
  Replace,
  Search,
  Check,
  X,
  SlidersHorizontal,
  Lock,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  FileCheck,
  PanelLeft,
  RotateCw,
  Maximize2,
  Minimize2,
  ArrowLeft,
  FileText,
  ChevronUp,
  ChevronDown,
  Layers,
  Copy,
} from 'lucide-react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfFontFamily =
  | 'sans'
  | 'serif'
  | 'mono'
  | 'calibri'
  | 'arial'
  | 'helvetica'
  | 'times'
  | 'georgia'
  | 'garamond'
  | 'roboto'
  | 'verdana'
  | 'courier';

export interface EditablePdfTextItem {
  id: string;
  pageIndex: number; // 0-based
  // Original geometry in PDF points (origin: top-left of viewport at scale=1)
  origX: number;
  origBaselineY: number;
  origTopY: number;
  origWidth: number;
  origHeight: number;
  origText: string;
  origFontSize: number;
  // Current editable state
  x: number;
  baselineY: number;
  topY: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontName: string;
  exactFontName: string; // e.g. "Calibri", "Arial", "Times New Roman"
  fontFamily: PdfFontFamily;
  bold: boolean;
  italic: boolean;
  textColor: string; // hex e.g. #0f172a
  bgColor: string; // hex e.g. #ffffff sampled from page background
  isNew: boolean; // true if added by user, false if extracted from existing PDF
  isDeleted: boolean; // true if user erased this original text block
}

export interface PdfAnnotationShape {
  id: string;
  pageIndex: number;
  kind: 'whiteout' | 'highlight' | 'image' | 'signature' | 'stamp';
  x: number; // PDF points from left
  y: number; // PDF points from top
  width: number;
  height: number;
  color: string;
  opacity: number;
  rotation?: number; // In degrees (0-360)
  imageDataUrl?: string;
}

export interface PdfWatermarkSettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  rotation: number;
  opacity: number;
  color: string;
  applyTo: 'all' | 'current';
}

interface PageDimensions {
  width: number;
  height: number;
}

type EditorToolMode = 'edit-text' | 'add-text' | 'whiteout' | 'highlight' | 'signature';

interface HistorySnapshot {
  textItems: EditablePdfTextItem[];
  shapes: PdfAnnotationShape[];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16) || 0;
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function generateStampDataUrl(text: string, color: string, subtext?: string): string {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 120;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, c.width, c.height);

  // Outer bold border
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(8, 8, c.width - 16, c.height - 16, 12);
  } else {
    ctx.rect(8, 8, c.width - 16, c.height - 16);
  }
  ctx.stroke();

  // Inner border
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(14, 14, c.width - 28, c.height - 28, 8);
  } else {
    ctx.rect(14, 14, c.width - 28, c.height - 28);
  }
  ctx.stroke();

  // Primary Stamp Text
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(text.toUpperCase(), c.width / 2, subtext ? 50 : 60);

  // Subtext / Date
  if (subtext) {
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(subtext.toUpperCase(), c.width / 2, 86);
  }

  return c.toDataURL('image/png');
}

function detectFontMetadata(
  fontName: string,
  fontFamilyHint: string
): { cleanName: string; family: PdfFontFamily; bold: boolean; italic: boolean } {
  // Strip 6-letter subset prefix like "ABCDEF+" or "BAAAAA+"
  let name = (fontName || '').replace(/^[A-Z]{6}\+/, '').trim();
  const hint = (fontFamilyHint || '').trim();
  const combined = `${name} ${hint}`.toLowerCase();

  const bold =
    combined.includes('bold') ||
    combined.includes('black') ||
    combined.includes('heavy') ||
    combined.includes('semibold') ||
    combined.includes('demi') ||
    combined.includes('-bd') ||
    combined.includes(',bold') ||
    combined.includes('700') ||
    combined.includes('800') ||
    combined.includes('900');

  const italic =
    combined.includes('italic') ||
    combined.includes('oblique') ||
    combined.includes('-it') ||
    combined.includes(',italic');

  let cleanName = name
    .replace(/PSMT$/i, '')
    .replace(/-?BoldMT$/i, '')
    .replace(/-?ItalicMT$/i, '')
    .replace(/-?BoldItalicMT$/i, '')
    .replace(/-?Bold$/i, '')
    .replace(/-?Italic$/i, '')
    .replace(/-?Regular$/i, '')
    .replace(/-?Roman$/i, '')
    .replace(/-?Medium$/i, '')
    .replace(/MT$/i, '')
    .trim();

  // If cleanName is empty, use hint
  if (!cleanName && hint) {
    cleanName = hint;
  }

  let family: PdfFontFamily = 'sans';

  if (combined.includes('calibri') || combined.includes('carlito')) {
    cleanName = cleanName || 'Calibri';
    family = 'calibri';
  } else if (combined.includes('times') || combined.includes('timesnewroman')) {
    cleanName = cleanName || 'Times New Roman';
    family = 'times';
  } else if (combined.includes('georgia')) {
    cleanName = cleanName || 'Georgia';
    family = 'georgia';
  } else if (combined.includes('garamond')) {
    cleanName = cleanName || 'Garamond';
    family = 'garamond';
  } else if (
    combined.includes('cambria') ||
    combined.includes('palatino') ||
    combined.includes('baskerville') ||
    (combined.includes('serif') && !combined.includes('sans'))
  ) {
    cleanName = cleanName || 'Times New Roman';
    family = 'times';
  } else if (combined.includes('arial') || combined.includes('arimo')) {
    cleanName = cleanName || 'Arial';
    family = 'arial';
  } else if (combined.includes('helvetica')) {
    cleanName = cleanName || 'Helvetica';
    family = 'helvetica';
  } else if (combined.includes('roboto')) {
    cleanName = cleanName || 'Roboto';
    family = 'roboto';
  } else if (combined.includes('open sans') || combined.includes('opensans')) {
    cleanName = cleanName || 'Open Sans';
    family = 'sans';
  } else if (combined.includes('verdana')) {
    cleanName = cleanName || 'Verdana';
    family = 'verdana';
  } else if (combined.includes('trebuchet')) {
    cleanName = cleanName || 'Trebuchet MS';
    family = 'sans';
  } else if (combined.includes('courier')) {
    cleanName = cleanName || 'Courier New';
    family = 'courier';
  } else if (
    combined.includes('consolas') ||
    combined.includes('menlo') ||
    combined.includes('mono')
  ) {
    cleanName = cleanName || 'Consolas';
    family = 'mono';
  } else if (combined.includes('jio') || combined.includes('jiotype')) {
    cleanName = 'JioType';
    family = 'sans';
  } else if (combined.includes('segoe')) {
    cleanName = 'Segoe UI';
    family = 'sans';
  } else if (combined.includes('inter')) {
    cleanName = 'Inter';
    family = 'sans';
  } else if (combined.includes('poppins')) {
    cleanName = 'Poppins';
    family = 'sans';
  } else if (combined.includes('montserrat')) {
    cleanName = 'Montserrat';
    family = 'sans';
  } else if (combined.includes('lato')) {
    cleanName = 'Lato';
    family = 'sans';
  } else {
    // Preserve the detected font name from the PDF!
    cleanName = cleanName || 'Arial';
    family = combined.includes('serif') ? 'serif' : combined.includes('mono') ? 'mono' : 'sans';
  }

  return { cleanName, family, bold, italic };
}

/**
 * Samples the rendered PDF canvas around and inside a text bounding box to detect:
 * 1. The exact background paper/cell color (`bgColor`)
 * 2. The exact foreground glyph color (`textColor`)
 */
function sampleColorsFromCanvas(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): { bgColor: string; textColor: string } {
  try {
    const pad = 3;
    const sx = Math.max(0, Math.floor(rx - pad));
    const sy = Math.max(0, Math.floor(ry - pad));
    const sw = Math.min(canvasWidth - sx, Math.ceil(rw + pad * 2));
    const sh = Math.min(canvasHeight - sy, Math.ceil(rh + pad * 2));

    if (sw <= 2 || sh <= 2) {
      return { bgColor: '#ffffff', textColor: '#0f172a' };
    }

    const imgData = ctx.getImageData(sx, sy, sw, sh).data;

    // 1. Sample perimeter pixels to determine background color
    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    let bgCount = 0;

    for (let x = 0; x < sw; x += 2) {
      // Top edge & bottom edge
      const topIdx = x * 4;
      const botIdx = ((sh - 1) * sw + x) * 4;
      bgR += imgData[topIdx] + imgData[botIdx];
      bgG += imgData[topIdx + 1] + imgData[botIdx + 1];
      bgB += imgData[topIdx + 2] + imgData[botIdx + 2];
      bgCount += 2;
    }

    const avgBgR = bgCount > 0 ? bgR / bgCount : 255;
    const avgBgG = bgCount > 0 ? bgG / bgCount : 255;
    const avgBgB = bgCount > 0 ? bgB / bgCount : 255;
    const bgColor = rgbToHex(avgBgR, avgBgG, avgBgB);

    // 2. Find the highest-contrast interior pixels (the ink color of the text glyphs)
    let maxDist = -1;
    let inkR = 15;
    let inkG = 23;
    let inkB = 42;

    for (let y = 2; y < sh - 2; y += 2) {
      for (let x = 2; x < sw - 2; x += 2) {
        const idx = (y * sw + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const dist =
          Math.abs(r - avgBgR) * 0.3 +
          Math.abs(g - avgBgG) * 0.59 +
          Math.abs(b - avgBgB) * 0.11;
        if (dist > maxDist) {
          maxDist = dist;
          inkR = r;
          inkG = g;
          inkB = b;
        }
      }
    }

    const textColor = maxDist > 25 ? rgbToHex(inkR, inkG, inkB) : '#0f172a';
    return { bgColor, textColor };
  } catch {
    return { bgColor: '#ffffff', textColor: '#0f172a' };
  }
}

function sanitizeForStandardFont(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u20B9]/g, 'Rs.') // Indian Rupee
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2014\u2013]/g, '-') // Em/En dash
    .replace(/[\u2022\u25CF]/g, '*') // Bullet
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[\u2713\u2714]/g, '[x]') // Checkmarks
    .replace(/[\u00A0]/g, ' ') // Non-breaking space
    .replace(/[^\x00-\x7F\xA0-\xFF]/g, ' '); // Clean out any exotic unencodable characters
}

export interface PdfEditorProps {
  embedded?: boolean;
  initialPdfBytes?: Uint8Array | null;
  initialFileName?: string;
  onPdfSaved?: (bytes: Uint8Array, filename: string) => void;
  onSwitchPdfTab?: (tab: 'merge' | 'split' | 'compress' | 'rotate' | 'convert' | 'sign') => void;
}

export const PdfEditor: React.FC<PdfEditorProps> = ({
  embedded = false,
  initialPdfBytes = null,
  initialFileName = '',
  onPdfSaved,
  onSwitchPdfTab,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-based
  const [pageDims, setPageDims] = useState<PageDimensions>({ width: 595, height: 842 });
  const [zoom, setZoom] = useState<number>(1.15);

  // Full-Screen Studio & Tools Menu State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [pdfToolsMenuOpen, setPdfToolsMenuOpen] = useState(false);

  const [toolMode, setToolMode] = useState<EditorToolMode>('edit-text');
  const [textItems, setTextItems] = useState<EditablePdfTextItem[]>([]);
  const [extractedPages, setExtractedPages] = useState<Record<number, boolean>>({});
  const [shapes, setShapes] = useState<PdfAnnotationShape[]>([]);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Dragging & Resizing State
  const [draggingId, setDraggingId] = useState<{
    kind: 'text' | 'shape';
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [resizingHandle, setResizingHandle] = useState<{
    id: string;
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w';
    startX: number;
    startY: number;
    startWidth: number;
    startFontSize: number;
    startXPos: number;
  } | null>(null);

  // Shape Resize & Rotate State (Images, Stamps, Signatures, Highlights, Whiteout)
  const [resizingShapeHandle, setResizingShapeHandle] = useState<{
    id: string;
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    startX: number;
    startY: number;
    startShapeX: number;
    startShapeY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const [rotatingShape, setRotatingShape] = useState<{
    id: string;
    centerX: number;
    centerY: number;
    initialRotation: number;
  } | null>(null);

  const lastLoadedBytesRef = useRef<Uint8Array | null>(null);
  const activeRenderTaskRef = useRef<any>(null);

  // Search & Replace ("Replace Text" Mode)
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [replaceScope, setReplaceScope] = useState<'current' | 'all'>('current');
  const [matchCase, setMatchCase] = useState(false);

  // Signature & Stamps & Watermark
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [typedSignature, setTypedSignature] = useState('Alex Morgan');
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  const [stampModalOpen, setStampModalOpen] = useState(false);
  const [customStampText, setCustomStampText] = useState('APPROVED');
  const [customStampColor, setCustomStampColor] = useState('#10b981');

  const [watermarkModalOpen, setWatermarkModalOpen] = useState(false);
  const [watermarkSettings, setWatermarkSettings] = useState<PdfWatermarkSettings>({
    enabled: false,
    text: 'CONFIDENTIAL',
    fontSize: 52,
    rotation: -45,
    opacity: 0.22,
    color: '#64748b',
    applyTo: 'all',
  });

  // Document Security & Re-Encryption State
  const [isOriginalEncrypted, setIsOriginalEncrypted] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSecurityMode, setExportSecurityMode] = useState<'reencrypt' | 'password' | 'none'>('none');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [allowCopyingText, setAllowCopyingText] = useState(false);

  // Left Sidebar & Page Thumbnails State
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);

  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Lock body scroll when in Full-Screen Studio mode
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullScreen]);

  // Close tools dropdown menu on external click
  useEffect(() => {
    const handleGlobalClick = () => setPdfToolsMenuOpen(false);
    if (pdfToolsMenuOpen) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [pdfToolsMenuOpen]);

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  const selectedText = textItems.find((t) => t.id === selectedTextId) || null;
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;

  // Record a state change in history for Undo / Redo
  const pushHistory = useCallback(
    (newTextItems: EditablePdfTextItem[], newShapes: PdfAnnotationShape[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push({
          textItems: JSON.parse(JSON.stringify(newTextItems)),
          shapes: JSON.parse(JSON.stringify(newShapes)),
        });
        if (next.length > 35) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 34));
    },
    [historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const snapshot = history[targetIndex];
      if (snapshot) {
        setTextItems(JSON.parse(JSON.stringify(snapshot.textItems)));
        setShapes(JSON.parse(JSON.stringify(snapshot.shapes)));
        setHistoryIndex(targetIndex);
        setSelectedTextId(null);
        setSelectedShapeId(null);
      }
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const snapshot = history[targetIndex];
      if (snapshot) {
        setTextItems(JSON.parse(JSON.stringify(snapshot.textItems)));
        setShapes(JSON.parse(JSON.stringify(snapshot.shapes)));
        setHistoryIndex(targetIndex);
        setSelectedTextId(null);
        setSelectedShapeId(null);
      }
    }
  }, [history, historyIndex]);

  // Global Keyboard shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+F, Escape, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input unless it's Ctrl+Z / Ctrl+Y
      const isInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setReplaceModalOpen(true);
      } else if (e.key === 'Escape') {
        setSelectedTextId(null);
        setSelectedShapeId(null);
        setReplaceModalOpen(false);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        if (selectedTextId) {
          const item = textItems.find((t) => t.id === selectedTextId);
          if (item) {
            let next: EditablePdfTextItem[];
            if (item.isNew) {
              next = textItems.filter((t) => t.id !== item.id);
            } else {
              next = textItems.map((t) =>
                t.id === item.id ? { ...t, isDeleted: true, text: '' } : t
              );
            }
            setTextItems(next);
            pushHistory(next, shapes);
            setSelectedTextId(null);
          }
        } else if (selectedShapeId) {
          const nextShapes = shapes.filter((s) => s.id !== selectedShapeId);
          setShapes(nextShapes);
          pushHistory(textItems, nextShapes);
          setSelectedShapeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedTextId, selectedShapeId, textItems, shapes, pushHistory]);

  const cssFontStack = (family: PdfFontFamily, exactFontName?: string) => {
    const cleanExact = exactFontName && exactFontName !== 'sans-serif' ? `"${exactFontName}", ` : '';
    const cleanExactNoSpace =
      exactFontName && exactFontName.includes(' ')
        ? `"${exactFontName.replace(/\s+/g, '')}", `
        : '';
    const prefix = `${cleanExact}${cleanExactNoSpace}`;

    switch (family) {
      case 'calibri':
        return `${prefix}Calibri, "Carlito", "Segoe UI", Arial, sans-serif`;
      case 'arial':
        return `${prefix}Arial, "Helvetica Neue", Helvetica, sans-serif`;
      case 'helvetica':
        return `${prefix}"Helvetica Neue", Helvetica, Arial, sans-serif`;
      case 'times':
        return `${prefix}"Times New Roman", Times, "Liberation Serif", Georgia, serif`;
      case 'georgia':
        return `${prefix}Georgia, "Times New Roman", Times, serif`;
      case 'garamond':
        return `${prefix}Garamond, "EB Garamond", Georgia, serif`;
      case 'serif':
        return `${prefix}Georgia, "Times New Roman", Times, Cambria, serif`;
      case 'roboto':
        return `${prefix}Roboto, "Open Sans", Arial, sans-serif`;
      case 'verdana':
        return `${prefix}Verdana, Geneva, Tahoma, Arial, sans-serif`;
      case 'courier':
        return `${prefix}"Courier New", Courier, "Liberation Mono", monospace`;
      case 'mono':
        return `${prefix}Consolas, Menlo, Monaco, "Courier New", monospace`;
      case 'sans':
      default:
        return `${prefix}"JioType", "Jio Type", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif`;
    }
  };

  // Load a new PDF file into the editor
  const loadPdfBuffer = async (bytes: Uint8Array, name: string) => {
    try {
      setIsRendering(true);
      setStatusBanner(null);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = doc.getPageCount();
      const cloned = bytes.slice(0); // Clone bytes into state to prevent detachment
      lastLoadedBytesRef.current = cloned;
      setPdfBytes(cloned);
      setFileName(name);
      setPageCount(total);
      setCurrentPage(1);
      setTextItems([]);
      setShapes([]);
      setExtractedPages({});
      setSelectedTextId(null);
      setSelectedShapeId(null);
      setHistory([]);
      setHistoryIndex(-1);

      // Fit zoom nicely on mobile vs desktop
      if (window.innerWidth < 640) {
        setZoom(0.58);
      } else if (window.innerWidth < 1024) {
        setZoom(0.85);
      } else {
        setZoom(1.15);
      }

      // Detect if the original document was encrypted / secured (e.g. Jio bill, bank statement)
      let originalSecured = false;
      try {
        const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
        const pdf = await loadingTask.promise;
        const meta = await pdf.getMetadata().catch(() => null);
        const perms = await pdf.getPermissions().catch(() => null);
        const infoRecord = meta?.info as Record<string, unknown> | undefined;
        if (Boolean(infoRecord?.EncryptFilterName) || perms !== null) {
          originalSecured = true;
        }
      } catch {
        const sample = new TextDecoder('latin1').decode(bytes.slice(0, 50000));
        if (sample.includes('/Encrypt')) {
          originalSecured = true;
        }
      }
      setIsOriginalEncrypted(originalSecured);
      setExportSecurityMode(originalSecured ? 'reencrypt' : 'none');

      // Automatically maximize into focused Full-Screen Studio as requested
      setIsFullScreen(true);

      // Asynchronously generate visual page thumbnails for the left navigator
      generateThumbnails(cloned, total);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: `Could not open PDF: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsRendering(false);
    }
  };

  // Generate lightweight page thumbnails in the background for instant navigation
  const generateThumbnails = useCallback(async (bytes: Uint8Array, total: number) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
      const pdf = await loadingTask.promise;
      const count = Math.min(total, 40);
      const thumbs: Record<number, string> = {};

      for (let p = 1; p <= count; p++) {
        try {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 0.2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbs[p] = canvas.toDataURL('image/jpeg', 0.82);
          }
        } catch {
          // ignore single page failure
        }
      }
      setThumbnails(thumbs);
    } catch {
      // ignore
    }
  }, []);

  // Update a single thumbnail in background when a page is rotated
  const updateSinglePageThumbnail = async (bytes: Uint8Array, pageNum: number) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice(0) });
      const pdf = await loadingTask.promise;
      if (pageNum < 1 || pageNum > pdf.numPages) return;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.82);
        setThumbnails((prev) => ({ ...prev, [pageNum]: thumbUrl }));
      }
    } catch {
      // ignore single thumbnail failure
    }
  };

  // Rotate a specific page by 90 degrees directly from the thumbnail rail or toolbar
  const handleRotatePage = async (targetPageNum: number) => {
    if (!pdfBytes) return;
    try {
      setIsRendering(true);
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0), { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const targetIndex = targetPageNum - 1;
      if (targetIndex >= 0 && targetIndex < pages.length) {
        const page = pages[targetIndex];
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + 90) % 360));
        const updatedBytes = await pdfDoc.save();
        const newBytes = new Uint8Array(updatedBytes);

        lastLoadedBytesRef.current = newBytes;
        onPdfSaved?.(newBytes, fileName || 'Document.pdf');
        setPdfBytes(newBytes);

        // Invalidate text extraction on this page so it re-extracts with the new orientation
        setExtractedPages((prev) => {
          const next = { ...prev };
          delete next[targetIndex];
          return next;
        });

        // Remove old text items for this page
        setTextItems((prev) => prev.filter((item) => item.pageIndex !== targetIndex));

        // Rotate shapes on this page so they align with the rotated orientation
        setShapes((prev) =>
          prev.map((s) => {
            if (s.pageIndex !== targetIndex) return s;
            const newX = pageDims.height - (s.y + s.height);
            const newY = s.x;
            return {
              ...s,
              x: Math.max(0, newX),
              y: Math.max(0, newY),
              width: s.height,
              height: s.width,
              rotation: ((s.rotation || 0) + 90) % 360,
            };
          })
        );

        setCurrentPage(targetPageNum);
        await updateSinglePageThumbnail(newBytes, targetPageNum);

        setStatusBanner({
          type: 'success',
          message: `Rotated Page ${targetPageNum} by 90°!`,
        });
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: `Failed to rotate page: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsRendering(false);
    }
  };

  // Delete a specific page from the document directly from thumbnail rail or toolbar
  const handleDeletePage = async (targetPageNum: number) => {
    if (!pdfBytes || pageCount <= 1) return;
    if (!window.confirm(`Are you sure you want to delete Page ${targetPageNum}? This action cannot be undone.`)) return;
    try {
      setIsRendering(true);
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0), { ignoreEncryption: true });
      const targetIndex = targetPageNum - 1;
      pdfDoc.removePage(targetIndex);
      const updatedBytes = await pdfDoc.save();
      const newBytes = new Uint8Array(updatedBytes);
      const newTotal = pageCount - 1;

      lastLoadedBytesRef.current = newBytes;
      onPdfSaved?.(newBytes, fileName || 'Document.pdf');

      // Shift text items: remove target page items, and decrement higher pageIndices
      setTextItems((prev) =>
        prev
          .filter((item) => item.pageIndex !== targetIndex)
          .map((item) => {
            if (item.pageIndex > targetIndex) {
              return { ...item, pageIndex: item.pageIndex - 1 };
            }
            return item;
          })
      );

      // Shift shapes: remove target page shapes, and decrement higher pageIndices
      setShapes((prev) =>
        prev
          .filter((s) => s.pageIndex !== targetIndex)
          .map((s) => {
            if (s.pageIndex > targetIndex) {
              return { ...s, pageIndex: s.pageIndex - 1 };
            }
            return s;
          })
      );

      // Shift extractedPages record
      setExtractedPages((prev) => {
        const next: Record<number, boolean> = {};
        for (const [key, val] of Object.entries(prev)) {
          const idx = Number(key);
          if (idx < targetIndex) {
            next[idx] = val;
          } else if (idx > targetIndex) {
            next[idx - 1] = val;
          }
        }
        return next;
      });

      setPdfBytes(newBytes);
      setPageCount(newTotal);

      const nextTargetPage = Math.min(
        currentPage > targetPageNum ? currentPage - 1 : currentPage,
        newTotal
      );
      setCurrentPage(Math.max(1, nextTargetPage));

      generateThumbnails(newBytes, newTotal);

      setStatusBanner({
        type: 'success',
        message: `Deleted Page ${targetPageNum} successfully!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: `Failed to delete page: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsRendering(false);
    }
  };

  // Sync initial PDF bytes from parent if provided (e.g. from PdfMultiTool)
  useEffect(() => {
    if (
      initialPdfBytes &&
      initialPdfBytes.length > 0 &&
      initialPdfBytes !== lastLoadedBytesRef.current
    ) {
      lastLoadedBytesRef.current = initialPdfBytes;
      loadPdfBuffer(initialPdfBytes, initialFileName || 'Document.pdf');
    }
  }, [initialPdfBytes, initialFileName]);

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    await loadPdfBuffer(new Uint8Array(buf), file.name);
  };

  // Helper to extract text runs and items from a pdf page with optional canvas color sampling
  const extractItemsFromPage = async (
    page: any,
    pageIdx: number,
    baseViewport: any,
    ctx?: CanvasRenderingContext2D,
    canvasW?: number,
    canvasH?: number,
    renderScale = 2.0
  ): Promise<EditablePdfTextItem[]> => {
    const textContent = await page.getTextContent();
    const styles = textContent.styles as Record<string, { fontFamily?: string }>;

    interface RawRun {
      str: string;
      x: number;
      baselineY: number;
      topY: number;
      width: number;
      height: number;
      fontSize: number;
      fontName: string;
      exactFontName: string;
      family: PdfFontFamily;
      bold: boolean;
      italic: boolean;
    }

    const rawRuns: RawRun[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str || !item.str.trim()) continue;
      const tx = pdfjsLib.Util.transform(baseViewport.transform, item.transform);
      const fontSize = Math.round(Math.hypot(tx[2], tx[3]) * 100) / 100;
      if (fontSize < 3 || fontSize > 160) continue;

      const x = tx[4];
      const baselineY = tx[5];
      const width = Math.max(fontSize * 0.4, item.width);
      const height = fontSize * 1.12;
      const topY = baselineY - fontSize * 0.84;

      const styleObj = styles[item.fontName] || {};
      let fontHint = styleObj.fontFamily || '';
      let resolvedFontName = item.fontName || '';
      try {
        if ((page as any).commonObjs && (page as any).commonObjs.has(item.fontName)) {
          const fObj = (page as any).commonObjs.get(item.fontName);
          if (fObj) {
            resolvedFontName = fObj.name || fObj.fallbackName || fObj.loadedName || resolvedFontName;
          }
        }
      } catch {
        // ignore
      }

      const { cleanName, family, bold, italic } = detectFontMetadata(
        resolvedFontName,
        fontHint
      );

      rawRuns.push({
        str: item.str,
        x,
        baselineY,
        topY,
        width,
        height,
        fontSize,
        fontName: resolvedFontName,
        exactFontName: cleanName,
        family,
        bold,
        italic,
      });
    }

    // Sort top-to-bottom, then left-to-right
    rawRuns.sort((a, b) => {
      if (Math.abs(a.baselineY - b.baselineY) > 2.5) {
        return a.baselineY - b.baselineY;
      }
      return a.x - b.x;
    });

    // Smartly merge adjacent words on the same line that share the same font & size
    const mergedRuns: RawRun[] = [];
    for (const run of rawRuns) {
      const prev = mergedRuns[mergedRuns.length - 1];
      if (
        prev &&
        Math.abs(prev.baselineY - run.baselineY) <= 2.2 &&
        Math.abs(prev.fontSize - run.fontSize) <= 0.8 &&
        prev.family === run.family &&
        prev.bold === run.bold &&
        prev.italic === run.italic
      ) {
        const gap = run.x - (prev.x + prev.width);
        if (gap >= -3 && gap <= prev.fontSize * 0.9) {
          const needsSpace =
            gap > prev.fontSize * 0.16 &&
            !prev.str.endsWith(' ') &&
            !run.str.startsWith(' ');
          prev.str = `${prev.str}${needsSpace ? ' ' : ''}${run.str}`;
          prev.width = Math.max(prev.width, run.x + run.width - prev.x);
          continue;
        }
      }
      mergedRuns.push({ ...run });
    }

    // Convert merged runs into EditablePdfTextItem
    return mergedRuns.map((r, idx) => {
      let bgColor = '#ffffff';
      let textColor = '#0f172a';

      if (ctx && canvasW && canvasH) {
        const sampled = sampleColorsFromCanvas(
          ctx,
          canvasW,
          canvasH,
          r.x * renderScale,
          r.topY * renderScale,
          r.width * renderScale,
          r.height * renderScale
        );
        bgColor = sampled.bgColor;
        textColor = sampled.textColor;
      }

      return {
        id: `p${pageIdx}-t${idx}-${Math.random().toString(36).slice(2, 7)}`,
        pageIndex: pageIdx,
        origX: r.x,
        origBaselineY: r.baselineY,
        origTopY: r.topY,
        origWidth: r.width,
        origHeight: r.height,
        origText: r.str,
        origFontSize: r.fontSize,
        x: r.x,
        baselineY: r.baselineY,
        topY: r.topY,
        width: Math.max(r.width + 6, r.fontSize * 1.5),
        height: r.height,
        text: r.str,
        fontSize: r.fontSize,
        fontName: r.fontName,
        exactFontName: r.exactFontName,
        fontFamily: r.family,
        bold: r.bold,
        italic: r.italic,
        textColor,
        bgColor,
        isNew: false,
        isDeleted: false,
      };
    });
  };

  // Extract text items across all pages in document for global Search & Replace
  const ensureAllPagesExtracted = async (): Promise<EditablePdfTextItem[]> => {
    if (!pdfBytes) return textItems;
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      let allItems = [...textItems];
      const newlyExtracted = { ...extractedPages };

      for (let p = 1; p <= pdf.numPages; p++) {
        const pageIdx = p - 1;
        if (newlyExtracted[pageIdx]) continue;

        const page = await pdf.getPage(p);
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Offscreen canvas for accurate color sampling
        const renderScale = 1.5;
        const renderViewport = page.getViewport({ scale: renderScale });
        const offCanvas = document.createElement('canvas');
        offCanvas.width = renderViewport.width;
        offCanvas.height = renderViewport.height;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          try {
            await page.render({ canvasContext: offCtx, viewport: renderViewport }).promise;
          } catch {
            // ignore
          }
        }

        const pageItems = await extractItemsFromPage(
          page,
          pageIdx,
          baseViewport,
          offCtx || undefined,
          offCanvas.width,
          offCanvas.height,
          renderScale
        );

        allItems = [...allItems.filter((it) => it.pageIndex !== pageIdx), ...pageItems];
        newlyExtracted[pageIdx] = true;
      }

      setExtractedPages(newlyExtracted);
      setTextItems(allItems);
      return allItems;
    } catch (err) {
      console.warn('Failed to extract all pages:', err);
      return textItems;
    }
  };

  // Render current page bitmap & extract exact text items with constant font size, font family, and sampled colors
  const renderPageAndExtractText = useCallback(async () => {
    if (!pdfBytes || !bgCanvasRef.current) return;
    setIsRendering(true);

    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        // ignore
      }
      activeRenderTaskRef.current = null;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      const safePageNum = Math.min(Math.max(1, currentPage), pdf.numPages);
      const pageIdx = safePageNum - 1;
      const page = await pdf.getPage(safePageNum);

      const baseViewport = page.getViewport({ scale: 1.0 });
      setPageDims({ width: baseViewport.width, height: baseViewport.height });
      if (pdf.numPages && pdf.numPages !== pageCount) {
        setPageCount(pdf.numPages);
      }

      // Render high-DPI canvas at 2x scale
      const renderScale = 2.0;
      const renderViewport = page.getViewport({ scale: renderScale });
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      const ctx = canvas.getContext('2d')!;

      const renderTask = page.render({ canvasContext: ctx, viewport: renderViewport });
      activeRenderTaskRef.current = renderTask;

      try {
        await renderTask.promise;
      } catch (renderErr: any) {
        if (renderErr?.name === 'RenderingCancelledException') {
          return;
        }
      } finally {
        activeRenderTaskRef.current = null;
      }

      // Extract text items once per page
      if (!extractedPages[pageIdx]) {
        const pageItems = await extractItemsFromPage(
          page,
          pageIdx,
          baseViewport,
          ctx,
          canvas.width,
          canvas.height,
          renderScale
        );

        setTextItems((prev) => {
          const next = [
            ...prev.filter((item) => item.pageIndex !== pageIdx),
            ...pageItems,
          ];
          if (historyIndex === -1) {
            setHistory([{ textItems: next, shapes: [] }]);
            setHistoryIndex(0);
          }
          return next;
        });
        setExtractedPages((prev) => ({ ...prev, [pageIdx]: true }));
      }
    } catch (err) {
      console.warn('Page render or extraction issue:', err);
    } finally {
      setIsRendering(false);
    }
  }, [pdfBytes, currentPage, extractedPages, historyIndex, pageCount]);

  useEffect(() => {
    renderPageAndExtractText();
  }, [renderPageAndExtractText]);

  // Pre-extract all pages when Find & Replace is opened in "All Pages" mode
  useEffect(() => {
    if (replaceModalOpen && replaceScope === 'all') {
      ensureAllPagesExtracted();
    }
  }, [replaceModalOpen, replaceScope]);

  // Update a specific text item's property and optionally commit to history
  const updateTextItem = (
    id: string,
    patch: Partial<EditablePdfTextItem>,
    recordHistory = false
  ) => {
    setTextItems((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.fontSize !== undefined) {
          updated.height = patch.fontSize * 1.15;
          updated.baselineY = updated.topY + patch.fontSize * 0.84;
        }
        if (patch.topY !== undefined) {
          updated.baselineY = patch.topY + updated.fontSize * 0.84;
        }
        return updated;
      });
      if (recordHistory) {
        pushHistory(next, shapes);
      }
      return next;
    });
  };

  // Update a specific shape's property and optionally commit to history
  const updateShape = (
    id: string,
    patch: Partial<PdfAnnotationShape>,
    recordHistory = false
  ) => {
    setShapes((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      if (recordHistory) {
        pushHistory(textItems, next);
      }
      return next;
    });
  };

  // Handle clicking on the page surface when in 'add-text', 'whiteout', or 'highlight' mode
  const handlePageSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && e.target !== bgCanvasRef.current) return;
    if (!pageContainerRef.current) return;

    const rect = pageContainerRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;
    const pageIdx = currentPage - 1;

    if (toolMode === 'add-text') {
      const defaultSize = 12;
      const newId = `new-text-${Date.now()}`;
      const newItem: EditablePdfTextItem = {
        id: newId,
        pageIndex: pageIdx,
        origX: clickX,
        origBaselineY: clickY + defaultSize * 0.84,
        origTopY: clickY,
        origWidth: 160,
        origHeight: defaultSize * 1.15,
        origText: '',
        origFontSize: defaultSize,
        x: clickX,
        baselineY: clickY + defaultSize * 0.84,
        topY: clickY,
        width: 180,
        height: defaultSize * 1.15,
        text: 'Type new text...',
        fontSize: defaultSize,
        fontName: 'Arial',
        exactFontName: 'Arial',
        fontFamily: 'arial',
        bold: false,
        italic: false,
        textColor: '#0f172a',
        bgColor: 'transparent',
        isNew: true,
        isDeleted: false,
      };
      const nextItems = [...textItems, newItem];
      setTextItems(nextItems);
      pushHistory(nextItems, shapes);
      setSelectedTextId(newId);
      setSelectedShapeId(null);
      setToolMode('edit-text');
    } else if (toolMode === 'whiteout') {
      const id = `shape-${Date.now()}`;
      const newShape: PdfAnnotationShape = {
        id,
        pageIndex: pageIdx,
        kind: 'whiteout',
        x: Math.max(0, clickX - 60),
        y: Math.max(0, clickY - 12),
        width: 140,
        height: 26,
        color: '#ffffff',
        opacity: 1,
        rotation: 0,
      };
      const nextShapes = [...shapes, newShape];
      setShapes(nextShapes);
      pushHistory(textItems, nextShapes);
      setSelectedShapeId(id);
      setSelectedTextId(null);
    } else if (toolMode === 'highlight') {
      const id = `shape-${Date.now()}`;
      const newShape: PdfAnnotationShape = {
        id,
        pageIndex: pageIdx,
        kind: 'highlight',
        x: Math.max(0, clickX - 60),
        y: Math.max(0, clickY - 10),
        width: 150,
        height: 20,
        color: '#fde047',
        opacity: 0.42,
        rotation: 0,
      };
      const nextShapes = [...shapes, newShape];
      setShapes(nextShapes);
      pushHistory(textItems, nextShapes);
      setSelectedShapeId(id);
      setSelectedTextId(null);
    } else {
      setSelectedTextId(null);
      setSelectedShapeId(null);
    }
  };

  // 8-point resize handle descriptors for shapes (corners + edges)
  const shapeResizeHandles: Array<{
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';
    className: string;
    title: string;
  }> = [
    { handle: 'nw', className: '-top-1.5 -left-1.5 cursor-nwse-resize', title: 'Resize Top-Left' },
    { handle: 'n', className: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize', title: 'Resize Top' },
    { handle: 'ne', className: '-top-1.5 -right-1.5 cursor-nesw-resize', title: 'Resize Top-Right' },
    { handle: 'e', className: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize', title: 'Resize Right' },
    { handle: 'se', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize', title: 'Resize Bottom-Right' },
    { handle: 's', className: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize', title: 'Resize Bottom' },
    { handle: 'sw', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize', title: 'Resize Bottom-Left' },
    { handle: 'w', className: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize', title: 'Resize Left' },
  ];

  const handleShapeResizeStart = (
    e: React.MouseEvent,
    shape: PdfAnnotationShape,
    handle: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    if (!pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    setResizingShapeHandle({
      id: shape.id,
      handle,
      startX: (e.clientX - rect.left) / zoom,
      startY: (e.clientY - rect.top) / zoom,
      startShapeX: shape.x,
      startShapeY: shape.y,
      startWidth: shape.width,
      startHeight: shape.height,
    });
  };

  const handleShapeRotateStart = (e: React.MouseEvent, shape: PdfAnnotationShape) => {
    e.stopPropagation();
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    setRotatingShape({
      id: shape.id,
      centerX,
      centerY,
      initialRotation: shape.rotation || 0,
    });
  };

  // Drag & Resize mouse move handlers
  const handleMouseMoveOnPage = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const curX = (e.clientX - rect.left) / zoom;
    const curY = (e.clientY - rect.top) / zoom;

    // Handle shape rotation
    if (rotatingShape) {
      const deltaX = curX - rotatingShape.centerX;
      const deltaY = curY - rotatingShape.centerY;
      let rad = Math.atan2(deltaY, deltaX);
      let deg = (rad * 180) / Math.PI;
      // Offset by +90 because handle is at top
      let angle = Math.round(deg + 90);
      if (angle < 0) angle += 360;
      angle = angle % 360;

      // Snap within 5 degrees of cardinal angles (0, 90, 180, 270)
      for (const snap of [0, 90, 180, 270, 360]) {
        if (Math.abs(angle - snap) < 6) {
          angle = snap % 360;
          break;
        }
      }

      setShapes((prev) =>
        prev.map((s) => (s.id === rotatingShape.id ? { ...s, rotation: angle } : s))
      );
      return;
    }

    // Handle shape 8-point resize
    if (resizingShapeHandle) {
      const deltaX = curX - resizingShapeHandle.startX;
      const deltaY = curY - resizingShapeHandle.startY;
      const { id, handle, startShapeX, startShapeY, startWidth, startHeight } = resizingShapeHandle;

      let nextX = startShapeX;
      let nextY = startShapeY;
      let nextW = startWidth;
      let nextH = startHeight;

      if (handle === 'e') {
        nextW = Math.max(16, startWidth + deltaX);
      } else if (handle === 'w') {
        nextW = Math.max(16, startWidth - deltaX);
        nextX = startShapeX + (startWidth - nextW);
      } else if (handle === 's') {
        nextH = Math.max(12, startHeight + deltaY);
      } else if (handle === 'n') {
        nextH = Math.max(12, startHeight - deltaY);
        nextY = startShapeY + (startHeight - nextH);
      } else if (handle === 'se') {
        nextW = Math.max(16, startWidth + deltaX);
        nextH = Math.max(12, startHeight + deltaY);
      } else if (handle === 'sw') {
        nextW = Math.max(16, startWidth - deltaX);
        nextH = Math.max(12, startHeight + deltaY);
        nextX = startShapeX + (startWidth - nextW);
      } else if (handle === 'ne') {
        nextW = Math.max(16, startWidth + deltaX);
        nextH = Math.max(12, startHeight - deltaY);
        nextY = startShapeY + (startHeight - nextH);
      } else if (handle === 'nw') {
        nextW = Math.max(16, startWidth - deltaX);
        nextH = Math.max(12, startHeight - deltaY);
        nextX = startShapeX + (startWidth - nextW);
        nextY = startShapeY + (startHeight - nextH);
      }

      setShapes((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, x: nextX, y: nextY, width: nextW, height: nextH } : s
        )
      );
      return;
    }

    // Handle 8-point resizing of text block
    if (resizingHandle) {
      const deltaX = curX - resizingHandle.startX;
      const targetItem = textItems.find((t) => t.id === resizingHandle.id);
      if (!targetItem) return;

      if (resizingHandle.handle === 'e') {
        const nextW = Math.max(20, resizingHandle.startWidth + deltaX);
        updateTextItem(resizingHandle.id, { width: nextW });
      } else if (resizingHandle.handle === 'w') {
        const nextW = Math.max(20, resizingHandle.startWidth - deltaX);
        const nextX = resizingHandle.startXPos + deltaX;
        updateTextItem(resizingHandle.id, { width: nextW, x: nextX });
      } else if (resizingHandle.handle === 'se' || resizingHandle.handle === 'ne') {
        const scale = Math.max(0.4, (resizingHandle.startWidth + deltaX) / resizingHandle.startWidth);
        const nextFontSize = Math.max(6, Math.min(96, Math.round(resizingHandle.startFontSize * scale * 2) / 2));
        const nextW = Math.max(24, resizingHandle.startWidth * scale);
        updateTextItem(resizingHandle.id, { fontSize: nextFontSize, width: nextW });
      } else if (resizingHandle.handle === 'sw' || resizingHandle.handle === 'nw') {
        const scale = Math.max(0.4, (resizingHandle.startWidth - deltaX) / resizingHandle.startWidth);
        const nextFontSize = Math.max(6, Math.min(96, Math.round(resizingHandle.startFontSize * scale * 2) / 2));
        const nextW = Math.max(24, resizingHandle.startWidth * scale);
        const nextX = resizingHandle.startXPos + deltaX;
        updateTextItem(resizingHandle.id, { fontSize: nextFontSize, width: nextW, x: nextX });
      }
      return;
    }

    // Handle moving text block or shape
    if (draggingId) {
      const nextX = Math.max(0, curX - draggingId.offsetX);
      const nextY = Math.max(0, curY - draggingId.offsetY);

      if (draggingId.kind === 'text') {
        updateTextItem(draggingId.id, { x: nextX, topY: nextY });
      } else {
        setShapes((prev) =>
          prev.map((s) => (s.id === draggingId.id ? { ...s, x: nextX, y: nextY } : s))
        );
      }
    }
  };

  const handleMouseUpOnPage = () => {
    if (draggingId || resizingHandle || resizingShapeHandle || rotatingShape) {
      pushHistory(textItems, shapes);
      setDraggingId(null);
      setResizingHandle(null);
      setResizingShapeHandle(null);
      setRotatingShape(null);
    }
  };

  // Replace Text ("Find & Replace") Logic
  const matchingItems = textItems.filter((t) => {
    if (!findQuery.trim()) return false;
    if (replaceScope === 'current' && t.pageIndex !== currentPage - 1) return false;
    if (t.isDeleted) return false;
    return matchCase
      ? t.text.includes(findQuery)
      : t.text.toLowerCase().includes(findQuery.toLowerCase());
  });

  const handleReplaceAll = async () => {
    if (!findQuery.trim()) return;

    let sourceItems = textItems;
    if (replaceScope === 'all') {
      sourceItems = await ensureAllPagesExtracted();
    }

    let count = 0;
    const nextItems = sourceItems.map((item) => {
      if (replaceScope === 'current' && item.pageIndex !== currentPage - 1) return item;
      if (item.isDeleted) return item;

      const hasMatch = matchCase
        ? item.text.includes(findQuery)
        : item.text.toLowerCase().includes(findQuery.toLowerCase());

      if (!hasMatch) return item;

      count++;
      let newStr = '';
      if (matchCase) {
        newStr = item.text.split(findQuery).join(replaceQuery);
      } else {
        const regex = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        newStr = item.text.replace(regex, replaceQuery);
      }

      return {
        ...item,
        text: newStr,
        width: Math.max(item.origWidth, newStr.length * item.fontSize * 0.58),
      };
    });

    setTextItems(nextItems);
    pushHistory(nextItems, shapes);
    setReplaceModalOpen(false);
    setStatusBanner({
      type: 'success',
      message: `Replaced ${count} occurrence${count === 1 ? '' : 's'} across ${
        replaceScope === 'all' ? `all ${pageCount} pages` : `Page ${currentPage}`
      }!`,
    });
  };

  // Upload image to place on page
  const handleInsertImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `img-${Date.now()}`;
      const newShape: PdfAnnotationShape = {
        id,
        pageIndex: currentPage - 1,
        kind: 'image',
        x: pageDims.width * 0.25,
        y: pageDims.height * 0.25,
        width: 160,
        height: 90,
        color: '#ffffff',
        opacity: 1,
        rotation: 0,
        imageDataUrl: reader.result as string,
      };
      const nextShapes = [...shapes, newShape];
      setShapes(nextShapes);
      pushHistory(textItems, nextShapes);
      setSelectedShapeId(id);
      setSelectedTextId(null);
    };
    reader.readAsDataURL(file);
  };

  // Add signature to current page
  const placeSignatureOnPage = (mode: 'drawn' | 'typed') => {
    let dataUrl = '';
    if (mode === 'drawn' && sigCanvasRef.current) {
      dataUrl = sigCanvasRef.current.toDataURL('image/png');
    } else {
      const c = document.createElement('canvas');
      c.width = 420;
      c.height = 130;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic bold 44px Georgia, serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature || 'Authorized Signatory', 18, 65);
      dataUrl = c.toDataURL('image/png');
    }

    const id = `sig-${Date.now()}`;
    const newShape: PdfAnnotationShape = {
      id,
      pageIndex: currentPage - 1,
      kind: 'signature',
      x: pageDims.width * 0.35,
      y: pageDims.height * 0.72,
      width: 165,
      height: 52,
      color: '#0f172a',
      opacity: 1,
      rotation: 0,
      imageDataUrl: dataUrl,
    };
    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    pushHistory(textItems, nextShapes);
    setSelectedShapeId(id);
    setSignatureModalOpen(false);
  };

  const handleAddStamp = (stampText: string, stampColor: string, subtext?: string) => {
    const dataUrl = generateStampDataUrl(stampText, stampColor, subtext);
    if (!dataUrl) return;
    const newShape: PdfAnnotationShape = {
      id: `shape-stamp-${Date.now()}`,
      pageIndex: currentPage - 1,
      kind: 'stamp',
      x: Math.max(30, pageDims.width / 2 - 70),
      y: Math.max(30, pageDims.height / 2 - 30),
      width: 140,
      height: 60,
      color: stampColor,
      opacity: 0.95,
      rotation: 0,
      imageDataUrl: dataUrl,
    };
    const nextShapes = [...shapes, newShape];
    setShapes(nextShapes);
    pushHistory(textItems, nextShapes);
    setSelectedShapeId(newShape.id);
    setSelectedTextId(null);
    setStampModalOpen(false);
    setStatusBanner({ type: 'success', message: `Added "${stampText}" stamp to Page ${currentPage}` });
  };

  // Generate a realistic editable sample PDF
  const loadDemoEditablePdf = async () => {
    const doc = await PDFDocument.create();
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const times = await doc.embedFont(StandardFonts.TimesRoman);
    const courier = await doc.embedFont(StandardFonts.Courier);

    const page = doc.addPage([595, 842]);
    const { width, height } = page.getSize();

    // Header banner
    page.drawRectangle({
      x: 45,
      y: height - 110,
      width: width - 90,
      height: 65,
      color: rgb(0.95, 0.96, 0.98),
    });

    page.drawText('COMMERCIAL SERVICE AGREEMENT & INVOICE', {
      x: 60,
      y: height - 72,
      size: 16,
      font: helvBold,
      color: rgb(0.08, 0.12, 0.22),
    });

    page.drawText('Document Ref: CT-2026-9841   |   Date: October 23, 2026', {
      x: 60,
      y: height - 94,
      size: 10.5,
      font: courier,
      color: rgb(0.3, 0.35, 0.45),
    });

    page.drawText('Prepared For: Horizon Enterprise Holdings LLC', {
      x: 45,
      y: height - 150,
      size: 12,
      font: helvBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText('1200 Market Street, Suite 800, San Francisco, CA 94107', {
      x: 45,
      y: height - 170,
      size: 11,
      font: helv,
      color: rgb(0.25, 0.3, 0.38),
    });

    page.drawText('1. Executive Summary & Scope of Work', {
      x: 45,
      y: height - 215,
      size: 13,
      font: helvBold,
      color: rgb(0.12, 0.24, 0.55),
    });

    page.drawText(
      'Click on any line of text in this PDF to edit it directly in-place.',
      {
        x: 45,
        y: height - 240,
        size: 11.5,
        font: times,
        color: rgb(0.1, 0.1, 0.15),
      }
    );

    page.drawText(
      'Notice how the font family, constant font size, and alignment are preserved!',
      {
        x: 45,
        y: height - 260,
        size: 11.5,
        font: times,
        color: rgb(0.1, 0.1, 0.15),
      }
    );

    page.drawText('2. Deliverable Schedule & Fee Breakdown', {
      x: 45,
      y: height - 305,
      size: 13,
      font: helvBold,
      color: rgb(0.12, 0.24, 0.55),
    });

    const rows = [
      ['Phase 1: Core Platform Architecture & Security Audit', '$4,500.00'],
      ['Phase 2: Zero-Upload WebAssembly PDF Engine Deployment', '$6,200.00'],
      ['Phase 3: Enterprise SLA & Cloud Sync Provisioning', '$1,800.00'],
      ['TOTAL CONTRACT VALUE (USD)', '$12,500.00'],
    ];

    let ry = height - 335;
    rows.forEach((r, idx) => {
      const isTotal = idx === rows.length - 1;
      page.drawText(r[0], {
        x: 55,
        y: ry,
        size: 11,
        font: isTotal ? helvBold : helv,
        color: rgb(0.1, 0.14, 0.2),
      });
      page.drawText(r[1], {
        x: 440,
        y: ry,
        size: 11,
        font: isTotal ? helvBold : courier,
        color: isTotal ? rgb(0.05, 0.45, 0.25) : rgb(0.1, 0.14, 0.2),
      });
      ry -= 26;
    });

    page.drawText('Authorized Signatory: Elena Vance, Chief Architect', {
      x: 45,
      y: height - 485,
      size: 11,
      font: helv,
      color: rgb(0.2, 0.25, 0.32),
    });

    const bytes = await doc.save();
    await loadPdfBuffer(bytes, 'Sample-Editable-Agreement.pdf');
  };

  // Export the final edited PDF using High-DPI Canvas Compositing with optional authentic re-encryption
  const exportEditedPdf = async (options?: {
    mode?: 'reencrypt' | 'password' | 'none';
    password?: string;
    allowCopying?: boolean;
  }) => {
    if (!pdfBytes) return;
    setIsExporting(true);
    setStatusBanner(null);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      // Create a fresh, pristine, unencrypted PDF document that opens in every viewer
      const outPdfDoc = await PDFDocument.create();

      // High-DPI render scale for crisp print & display quality (2.0 = ~150-200 DPI)
      const exportScale = 2.0;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageIdx = pageNum - 1;
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });
        const renderViewport = page.getViewport({ scale: exportScale });

        // High-DPI offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        const ctx = canvas.getContext('2d')!;

        // 1. Render the full, decrypted original PDF page plate (all vectors, images, logos, and unedited text)
        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

        // 2. Apply in-place text edits, deletions, and additions for this page
        const pageItems = textItems.filter((t) => t.pageIndex === pageIdx);
        for (const item of pageItems) {
          const wasModified =
            item.isDeleted ||
            item.isNew ||
            item.text !== item.origText ||
            Math.abs(item.x - item.origX) > 0.5 ||
            Math.abs(item.topY - item.origTopY) > 0.5 ||
            Math.abs(item.fontSize - item.origFontSize) > 0.2;

          if (!wasModified) continue;

          // Step 2A: Seamlessly cover original text with sampled background color
          if (!item.isNew) {
            ctx.fillStyle = item.bgColor === 'transparent' ? '#ffffff' : item.bgColor;
            const rx = (item.origX - 1.5) * exportScale;
            const ry = (item.origBaselineY - item.origFontSize * 0.88) * exportScale;
            const rw = (item.origWidth + 4) * exportScale;
            const rh = item.origFontSize * 1.18 * exportScale;
            ctx.fillRect(rx, ry, rw, rh);
          }

          // Step 2B: Draw new crisp text with exact font and styling
          if (!item.isDeleted && item.text.trim().length > 0) {
            if (
              item.bgColor &&
              item.bgColor !== 'transparent' &&
              (item.isNew ||
                Math.abs(item.x - item.origX) > 1 ||
                Math.abs(item.topY - item.origTopY) > 1)
            ) {
              ctx.fillStyle = item.bgColor;
              ctx.fillRect(
                (item.x - 2) * exportScale,
                (item.topY - 1) * exportScale,
                (item.width + 4) * exportScale,
                (item.height + 2) * exportScale
              );
            }

            const fontStack = cssFontStack(item.fontFamily, item.exactFontName);
            const fontWeight = item.bold ? '700' : '400';
            const fontStyle = item.italic ? 'italic' : 'normal';
            ctx.font = `${fontStyle} ${fontWeight} ${item.fontSize * exportScale}px ${fontStack}`;
            ctx.fillStyle = item.textColor;
            ctx.textBaseline = 'alphabetic';

            const lines = item.text.split('\n');
            let curBaseline = item.baselineY * exportScale;
            for (const line of lines) {
              if (line.trim().length > 0) {
                ctx.fillText(line, item.x * exportScale, curBaseline);
              }
              curBaseline += item.fontSize * 1.18 * exportScale;
            }
          }
        }

        // 3. Draw shapes (whiteouts, highlights, images, stamps, and signatures)
        const pageShapes = shapes.filter((s) => s.pageIndex === pageIdx);
        for (const shape of pageShapes) {
          const sx = shape.x * exportScale;
          const sy = shape.y * exportScale;
          const sw = shape.width * exportScale;
          const sh = shape.height * exportScale;
          const centerX = sx + sw / 2;
          const centerY = sy + sh / 2;

          ctx.save();
          ctx.globalAlpha = shape.opacity;
          ctx.translate(centerX, centerY);
          if (shape.rotation) {
            ctx.rotate((shape.rotation * Math.PI) / 180);
          }

          if (shape.kind === 'whiteout' || shape.kind === 'highlight') {
            ctx.fillStyle = shape.color;
            ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
          } else if (
            (shape.kind === 'image' || shape.kind === 'signature' || shape.kind === 'stamp') &&
            shape.imageDataUrl
          ) {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = shape.imageDataUrl!;
            });
          }
          ctx.restore();
        }

        // 4. Draw Watermark if enabled
        if (
          watermarkSettings.enabled &&
          watermarkSettings.text.trim() &&
          (watermarkSettings.applyTo === 'all' ||
            (watermarkSettings.applyTo === 'current' && pageNum === currentPage))
        ) {
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((watermarkSettings.rotation * Math.PI) / 180);
          ctx.fillStyle = watermarkSettings.color;
          ctx.globalAlpha = watermarkSettings.opacity;
          ctx.font = `800 ${watermarkSettings.fontSize * exportScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(watermarkSettings.text.toUpperCase(), 0, 0);
          ctx.restore();
        }

        // 5. Convert canvas to high-quality JPEG and embed in output PDF
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.94);
        const embeddedImg = await outPdfDoc.embedJpg(jpegDataUrl);
        const newPage = outPdfDoc.addPage([baseViewport.width, baseViewport.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: baseViewport.width,
          height: baseViewport.height,
        });
      }

      // Save uncompressed, standard PDF
      let outBytes = await outPdfDoc.save({ useObjectStreams: false });

      // Apply PDF Encryption / Security if selected
      const secMode = options?.mode ?? exportSecurityMode;
      const pwd = (options?.password ?? userPasswordInput).trim();
      const allowCopy = options?.allowCopying ?? allowCopyingText;

      let securityBadgeMsg = '';

      if (secMode === 'reencrypt') {
        try {
          // Authentic PDF Owner Encryption (empty user password opens freely without prompt, but flags as (SECURED) with locked edits)
          const randomOwnerPass = 'owner-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          const isSubtleAvailable = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);
          outBytes = await encryptPDF(outBytes, '', {
            ownerPassword: randomOwnerPass,
            algorithm: isSubtleAvailable ? 'AES-256' : 'RC4',
            allowPrinting: true,
            allowHighQualityPrint: true,
            allowModifying: false,
            allowCopying: allowCopy,
            allowFillingForms: true,
            allowAnnotating: false,
            allowAssembly: false,
            allowExtraction: false,
          });
          securityBadgeMsg = ' with authentic (SECURED) encryption';
        } catch (encErr) {
          console.warn('Re-encryption notice, downloading standard PDF:', encErr);
        }
      } else if (secMode === 'password' && pwd.length > 0) {
        try {
          // User Password Protection (requires entering password to open)
          const randomOwnerPass = 'owner-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          const isSubtleAvailable = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);
          outBytes = await encryptPDF(outBytes, pwd, {
            ownerPassword: randomOwnerPass,
            algorithm: isSubtleAvailable ? 'AES-256' : 'RC4',
            allowPrinting: true,
            allowHighQualityPrint: true,
            allowFillingForms: true,
          });
          securityBadgeMsg = ' with password protection';
        } catch (encErr) {
          console.warn('Password encryption notice, downloading standard PDF:', encErr);
        }
      }

      // Safe async download with 60-second retention
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Edited-${fileName || 'Document.pdf'}`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      }, 60000);

      if (onPdfSaved) {
        onPdfSaved(outBytes, fileName || 'Document.pdf');
      }

      setShowExportModal(false);

      setStatusBanner({
        type: 'success',
        message: `Successfully exported ${totalPages}-page edited PDF${securityBadgeMsg} (${fileName || 'Document.pdf'})!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentPageItems = textItems.filter((t) => t.pageIndex === currentPage - 1);
  const currentPageShapes = shapes.filter((s) => s.pageIndex === currentPage - 1);
  const modifiedCount =
    textItems.filter(
      (t) =>
        t.isDeleted ||
        t.isNew ||
        t.text !== t.origText ||
        Math.abs(t.fontSize - t.origFontSize) > 0.2
    ).length + shapes.length;

  // Floating toolbar coordinates calculation
  let floatingStyle: React.CSSProperties | null = null;
  if (selectedText) {
    const textScreenLeft = (selectedText.x - 1) * zoom;
    const textScreenTop = (selectedText.baselineY - selectedText.fontSize * 0.86) * zoom;
    const isCloseToTop = textScreenTop < 56;
    const topPos = isCloseToTop
      ? textScreenTop + selectedText.fontSize * 1.25 * zoom + 8
      : textScreenTop - 46;

    const maxLeft = Math.max(10, pageDims.width * zoom - 440);
    const leftPos = Math.max(8, Math.min(maxLeft, textScreenLeft));

    floatingStyle = {
      position: 'absolute',
      left: `${leftPos}px`,
      top: `${topPos}px`,
      zIndex: 50,
    };
  }

  return (
    <div
      className={
        isFullScreen && pdfBytes
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200'
          : 'space-y-4'
      }
    >
      {/* Compact Header with (i) Info Button (hidden in Full Screen Studio mode) */}
      {!embedded && !isFullScreen && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileEdit className="w-5 h-5 text-indigo-400 shrink-0" />
              <h2 className="text-lg font-bold text-white">Direct PDF Text & Document Editor</h2>
              <button
                onClick={() => setShowInfo((v) => !v)}
                aria-label="Toggle tool info"
                className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="About this tool"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>{pdfBytes ? 'Change PDF' : 'Upload PDF'}</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </label>

              {pdfBytes && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isOriginalEncrypted) {
                        setShowExportModal(true);
                      } else {
                        exportEditedPdf();
                      }
                    }}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExporting
                      ? 'Exporting PDF...'
                      : `Download Edited PDF${modifiedCount > 0 ? ` (${modifiedCount} edits)` : ''}`}
                  </button>

                  <button
                    onClick={() => setShowExportModal(true)}
                    title="Export & Security Options (Re-encrypt as Real Document / Password Protect)"
                    className={`p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                      isOriginalEncrypted
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {showInfo && (
            <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
              Professional-grade in-place PDF editor. Click any text to edit directly with constant font size, font family matching, floating action bar, drag-and-resize bounding boxes, find & replace, and universal undo/redo (Ctrl+Z). Runs 100% locally in your browser memory for total privacy.
            </p>
          )}
        </div>
      )}

      {statusBanner && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs ${
            statusBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {statusBanner.message}
          </span>
          <button onClick={() => setStatusBanner(null)} className="underline ml-3 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {!pdfBytes ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-2xl p-10 sm:p-14 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
            <FileEdit className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">
              Professional In-Place PDF Text Editor
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Edit text with constant font size and matched fonts, replace text across documents, whiteout unwanted details, add signatures, stamps, and watermarks—all with zero file uploads.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/25">
              <Upload className="w-4 h-4" />
              <span>Select PDF to Edit</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={loadDemoEditablePdf}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Try Interactive Demo PDF
            </button>
          </div>
        </div>
      ) : (
        <div className={isFullScreen ? 'flex flex-col h-full w-full overflow-hidden' : 'space-y-3'}>
          {/* 1. Global Studio Navigation Bar */}
          <div
            className={`bg-slate-900/95 border-slate-800 px-4 py-2.5 shadow-xl backdrop-blur-md z-30 shrink-0 ${
              isFullScreen ? 'border-b w-full' : 'border rounded-2xl sticky top-14'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left: Exit Studio / Full-Screen Toggle + Document Name & Pages */}
              <div className="flex items-center gap-2">
                {isFullScreen ? (
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold cursor-pointer border border-slate-700 shadow-sm transition"
                    title="Exit Full-Screen Studio & Return to CommonTool"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Exit Studio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold cursor-pointer border border-indigo-500/30 shadow-sm transition"
                    title="Maximize into Full-Screen Focused Studio"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Full Screen</span>
                  </button>
                )}

                <div className="h-5 w-px bg-slate-800" />

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    isSidebarOpen
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Visual Page Thumbnails"
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pages</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-bold">
                    {pageCount}
                  </span>
                </button>

                <div className="h-5 w-px bg-slate-800 hidden sm:block" />

                <div className="flex items-center gap-1.5 max-w-[170px] sm:max-w-xs truncate">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate" title={fileName}>
                    {fileName || 'Document.pdf'}
                  </span>
                </div>

                {isOriginalEncrypted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]">
                    <Lock className="w-2.5 h-2.5" />
                    <span className="hidden md:inline">SECURED</span>
                  </span>
                )}
              </div>

              {/* Center: Other PDF Tools Dropdown + Page Navigator & Zoom Controls */}
              <div className="flex items-center gap-2">
                {onSwitchPdfTab && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfToolsMenuOpen((v) => !v);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                      title="More PDF Tools (Merge, Split, Compress, Rotate, Convert, E-Sign)"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden xl:inline">More PDF Tools</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {pdfToolsMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-in fade-in zoom-in-95"
                      >
                        {[
                          { id: 'merge', label: 'Merge PDFs', desc: 'Combine multiple files' },
                          { id: 'split', label: 'Split / Extract', desc: 'Extract specific pages' },
                          { id: 'compress', label: 'Compress PDF', desc: 'Reduce file size' },
                          { id: 'rotate', label: 'Rotate Pages', desc: 'Orient all or select pages' },
                          { id: 'convert', label: 'Convert PDF', desc: 'Export to Word, Excel, Images' },
                          { id: 'sign', label: 'E-Sign', desc: 'Place legal signatures' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setPdfToolsMenuOpen(false);
                              setIsFullScreen(false);
                              onSwitchPdfTab(item.id as any);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-semibold text-white group-hover:text-indigo-300">{item.label}</p>
                              <p className="text-[10px] text-slate-500">{item.desc}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 group-hover:text-indigo-400">→</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Page Stepper */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-slate-200 px-1 min-w-[70px] text-center">
                    {currentPage} / {pageCount}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage >= pageCount}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Direct Page Rotation & Deletion Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRotatePage(currentPage)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 text-xs font-semibold cursor-pointer transition"
                    title="Rotate current page 90° clockwise"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden xl:inline">Rotate</span>
                  </button>
                  {pageCount > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeletePage(currentPage)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 text-xs font-semibold cursor-pointer transition"
                      title="Delete current page"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden xl:inline">Delete</span>
                    </button>
                  )}
                </div>

                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-xl p-0.5">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 text-slate-300 hover:text-white disabled:opacity-25 hover:bg-slate-800 rounded-lg cursor-pointer transition"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 text-slate-300 hover:text-white disabled:opacity-25 hover:bg-slate-800 rounded-lg cursor-pointer transition"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Zoom Stepper */}
                <div className="hidden md:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-300 w-11 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right: Change PDF & Primary Download */}
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Change PDF</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                </label>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (isOriginalEncrypted) {
                        setShowExportModal(true);
                      } else {
                        exportEditedPdf();
                      }
                    }}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shadow-lg shadow-indigo-600/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Exporting...' : `Download PDF${modifiedCount > 0 ? ` (${modifiedCount})` : ''}`}</span>
                  </button>

                  <button
                    onClick={() => setShowExportModal(true)}
                    title="Export & Security Options (Re-encrypt as Real Document)"
                    className={`p-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                      isOriginalEncrypted
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Categorized Functional Ribbon */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Grouped Action Tools */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Edit Text */}
                <button
                  onClick={() => setToolMode('edit-text')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'edit-text'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click any text on the page to edit directly"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Edit Text</span>
                </button>

                {/* Add Text */}
                <button
                  onClick={() => setToolMode('add-text')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'add-text'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click anywhere to insert a new text box"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Text</span>
                </button>

                {/* Replace Text */}
                <button
                  onClick={() => {
                    if (selectedText) {
                      setFindQuery(selectedText.text);
                    }
                    setReplaceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  title="Find & Replace text across document (Ctrl+F)"
                >
                  <Replace className="w-3.5 h-3.5 text-amber-400" />
                  <span>Replace Text</span>
                </button>

                <div className="h-5 w-px bg-slate-800 mx-0.5" />

                {/* Whiteout */}
                <button
                  onClick={() => setToolMode('whiteout')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'whiteout'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-indigo-400'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click on the page to place a whiteout / erase patch"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Whiteout</span>
                </button>

                {/* Highlight */}
                <button
                  onClick={() => setToolMode('highlight')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'highlight'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Highlight important text"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Highlight</span>
                </button>

                <div className="h-5 w-px bg-slate-800 mx-0.5" />

                {/* Sign */}
                <button
                  onClick={() => setSignatureModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign</span>
                </button>

                {/* Stamp */}
                <button
                  onClick={() => setStampModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  title="Stamp official badges (Approved, Confidential, Void, Paid, etc.)"
                >
                  <Stamp className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stamps</span>
                </button>

                {/* Image */}
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleInsertImageUpload(e.target.files?.[0])}
                  />
                </label>

                {/* Watermark */}
                <button
                  onClick={() => setWatermarkModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    watermarkSettings.enabled
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Configure diagonal watermark"
                >
                  <Droplet className="w-3.5 h-3.5 text-sky-400" />
                  <span>Watermark {watermarkSettings.enabled && '• ON'}</span>
                </button>
              </div>

              {/* Status / Guidance Sub-text */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {modifiedCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">
                    {modifiedCount} edits ready
                  </span>
                ) : (
                  <span className="hidden lg:inline text-slate-500">
                    {toolMode === 'edit-text' && 'Click any text on the page below to edit directly'}
                    {toolMode === 'add-text' && 'Click anywhere on the document to insert a text box'}
                    {toolMode === 'whiteout' && 'Click and drag to erase unwanted areas'}
                    {toolMode === 'highlight' && 'Click on the page to place a translucent highlight bar'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Main Workspace Studio: Left Page Thumbnails + Center Studio Desk */}
          <div
            className={
              isFullScreen
                ? 'flex-1 overflow-hidden flex flex-col lg:flex-row gap-3 items-stretch px-3 pb-3'
                : 'flex flex-col lg:flex-row gap-4 items-start'
            }
          >
            {/* Left Page Thumbnail Rail (Collapsible) */}
            {isSidebarOpen && (
              <div
                className={
                  isFullScreen
                    ? 'w-full lg:w-44 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col shrink-0 space-y-2.5 h-full overflow-hidden shadow-lg'
                    : 'w-full lg:w-44 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col shrink-0 space-y-2.5 max-h-[85vh]'
                }
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs shrink-0">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pages ({pageCount})</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    title="Hide Page Thumbnails"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnails Scroll List */}
                <div className="flex lg:flex-col gap-2.5 overflow-auto pr-1 flex-1">
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
                    const isCur = currentPage === p;
                    const thumbUrl = thumbnails[p];
                    return (
                      <div
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`group relative rounded-xl border p-1.5 cursor-pointer transition-all flex flex-col items-center gap-1 shrink-0 ${
                          isCur
                            ? 'bg-indigo-600/15 border-indigo-500 ring-2 ring-indigo-500/40'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Page Preview Box */}
                        <div className="w-24 h-32 bg-white rounded-md overflow-hidden flex items-center justify-center relative shadow-sm">
                          {thumbUrl ? (
                            <img src={thumbUrl} alt={`Page ${p}`} className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-[10px] text-slate-400 animate-pulse">Page {p}</div>
                          )}

                          {/* Quick Action Overlay (Rotate / Delete) */}
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRotatePage(p);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white cursor-pointer transition"
                              title="Rotate 90°"
                            >
                              <RotateCw className="w-3 h-3" />
                            </button>
                            {pageCount > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePage(p);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-white cursor-pointer transition"
                                title="Delete Page"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-semibold ${isCur ? 'text-indigo-400' : 'text-slate-400'}`}>
                          Page {p}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Center Studio Desk (Spacious Document Stage) */}
            <div
              className={
                isFullScreen
                  ? 'flex-1 w-full h-full overflow-auto bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-8 flex justify-center items-start shadow-inner'
                  : 'flex-1 w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-8 flex justify-center overflow-auto min-h-[75vh] max-h-[85vh]'
              }
            >
              <div
                ref={pageContainerRef}
                onClick={handlePageSurfaceClick}
                onMouseMove={handleMouseMoveOnPage}
                onMouseUp={handleMouseUpOnPage}
                className={`relative shadow-2xl select-none bg-white transition-all rounded-xs ring-1 ring-slate-800/80 ${
                  toolMode !== 'edit-text' ? 'cursor-crosshair' : 'cursor-default'
                }`}
                style={{
                  width: `${pageDims.width * zoom}px`,
                  height: `${pageDims.height * zoom}px`,
                }}
              >
              {/* Underlying High-DPI PDF Bitmap Canvas */}
              <canvas
                ref={bgCanvasRef}
                className="w-full h-full block pointer-events-none"
              />

              {/* Dynamic Watermark Overlay */}
              {watermarkSettings.enabled &&
                watermarkSettings.text.trim() &&
                (watermarkSettings.applyTo === 'all' ||
                  watermarkSettings.applyTo === 'current') && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
                    <div
                      style={{
                        transform: `rotate(${watermarkSettings.rotation}deg)`,
                        fontSize: `${watermarkSettings.fontSize * zoom}px`,
                        color: watermarkSettings.color,
                        opacity: watermarkSettings.opacity,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        textTransform: 'uppercase',
                      }}
                    >
                      {watermarkSettings.text}
                    </div>
                  </div>
                )}

              {/* Layer 1: Whiteout, Highlight, Image, and Signature Shapes */}
              {currentPageShapes.map((shape) => {
                const isSelected = shape.id === selectedShapeId;
                return (
                  <div
                    key={shape.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTextId(null);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setSelectedShapeId(shape.id);
                      setSelectedTextId(null);
                      const rect = pageContainerRef.current!.getBoundingClientRect();
                      setDraggingId({
                        kind: 'shape',
                        id: shape.id,
                        offsetX: (e.clientX - rect.left) / zoom - shape.x,
                        offsetY: (e.clientY - rect.top) / zoom - shape.y,
                      });
                    }}
                    style={{
                      position: 'absolute',
                      left: `${shape.x * zoom}px`,
                      top: `${shape.y * zoom}px`,
                      width: `${shape.width * zoom}px`,
                      height: `${shape.height * zoom}px`,
                      transform: `rotate(${shape.rotation || 0}deg)`,
                      transformOrigin: 'center center',
                      backgroundColor:
                        shape.kind === 'whiteout' || shape.kind === 'highlight'
                          ? shape.color
                          : 'transparent',
                      opacity: shape.opacity,
                    }}
                    className={`cursor-move select-none ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 z-30 shadow-xl'
                        : 'hover:ring-1 hover:ring-indigo-400/70 z-10'
                    }`}
                  >
                    {shape.imageDataUrl && (
                      <img
                        src={shape.imageDataUrl}
                        alt={shape.kind}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        draggable={false}
                      />
                    )}

                    {/* Interactive Handles & Controls when Selected */}
                    {isSelected && (
                      <>
                        {/* 1. Floating Action Toolbar */}
                        <div
                          className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl z-40 whitespace-nowrap text-xs pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newRot = ((shape.rotation || 0) - 90 + 360) % 360;
                              updateShape(shape.id, { rotation: newRot }, true);
                            }}
                            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                            title="Rotate -90°"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newRot = ((shape.rotation || 0) + 90) % 360;
                              updateShape(shape.id, { rotation: newRot }, true);
                            }}
                            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                            title="Rotate +90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          {shape.rotation ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateShape(shape.id, { rotation: 0 }, true);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold hover:bg-indigo-900 cursor-pointer transition"
                              title="Reset rotation to 0°"
                            >
                              {shape.rotation}° (Reset)
                            </button>
                          ) : null}
                          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dup: PdfAnnotationShape = {
                                ...shape,
                                id: `${shape.kind}-${Date.now()}`,
                                x: shape.x + 15,
                                y: shape.y + 15,
                              };
                              const next = [...shapes, dup];
                              setShapes(next);
                              pushHistory(textItems, next);
                              setSelectedShapeId(dup.id);
                            }}
                            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer transition"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = shapes.filter((s) => s.id !== shape.id);
                              setShapes(next);
                              pushHistory(textItems, next);
                              setSelectedShapeId(null);
                            }}
                            className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 cursor-pointer transition"
                            title="Delete annotation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 2. Top Rotation Handle with Stem */}
                        <div
                          className="absolute left-1/2 -top-5 -translate-x-1/2 flex flex-col items-center z-40 pointer-events-auto"
                          onMouseDown={(e) => handleShapeRotateStart(e, shape)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                            title="Drag to rotate shape freely"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          </div>
                          <div className="w-[1.5px] h-2 bg-indigo-500" />
                        </div>

                        {/* 3. 8 Resize Handles (Corners & Edges) */}
                        {shapeResizeHandles.map((h) => (
                          <div
                            key={h.handle}
                            onMouseDown={(e) => handleShapeResizeStart(e, shape, h.handle)}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-xs shadow-xs z-40 pointer-events-auto ${h.className} hover:scale-130 transition-transform`}
                            title={h.title}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Layer 2: Every Detected & Added PDF Text Block */}
              {currentPageItems.map((item) => {
                const isSelected = item.id === selectedTextId;
                const isModified =
                  item.isDeleted ||
                  item.isNew ||
                  item.text !== item.origText ||
                  Math.abs(item.x - item.origX) > 0.5 ||
                  Math.abs(item.topY - item.origTopY) > 0.5 ||
                  Math.abs(item.fontSize - item.origFontSize) > 0.2;

                const isFindMatch =
                  findQuery.trim().length > 0 &&
                  (matchCase
                    ? item.text.includes(findQuery)
                    : item.text.toLowerCase().includes(findQuery.toLowerCase()));

                const showOrigCover = !item.isNew && isModified;

                return (
                  <React.Fragment key={item.id}>
                    {/* Background mask covering original PDF text */}
                    {showOrigCover && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(item.origX - 1.5) * zoom}px`,
                          top: `${(item.origBaselineY - item.origFontSize * 0.88) * zoom}px`,
                          width: `${(item.origWidth + 3.5) * zoom}px`,
                          height: `${item.origFontSize * 1.16 * zoom}px`,
                          backgroundColor:
                            item.bgColor === 'transparent' ? '#ffffff' : item.bgColor,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    {!item.isDeleted && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTextId(item.id);
                          setSelectedShapeId(null);
                        }}
                        onMouseEnter={() => setHoveredTextId(item.id)}
                        onMouseLeave={() => setHoveredTextId(null)}
                        style={{
                          position: 'absolute',
                          left: `${(item.x - 1) * zoom}px`,
                          top: `${(item.baselineY - item.fontSize * 0.86) * zoom}px`,
                          minWidth: `${Math.max(24, item.width) * zoom}px`,
                          height: `${item.fontSize * 1.16 * zoom}px`,
                          backgroundColor:
                            isSelected || isModified
                              ? item.bgColor === 'transparent'
                                ? 'transparent'
                                : item.bgColor
                              : 'transparent',
                        }}
                        className={`group transition-all ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 z-30 shadow-md bg-white/40'
                            : isFindMatch
                            ? 'ring-2 ring-amber-400 bg-amber-300/30 z-25'
                            : isModified
                            ? 'ring-1 ring-emerald-500/70 z-20'
                            : hoveredTextId === item.id
                            ? 'ring-1 ring-indigo-500/80 bg-indigo-500/10 z-10'
                            : 'hover:ring-1 hover:ring-indigo-400/50 hover:bg-indigo-500/5 z-0'
                        }`}
                      >
                        {/* 8-Point Transform Bounding Box Handles when selected */}
                        {isSelected && (
                          <>
                            {/* Move / Drag Handle Anchor */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setDraggingId({
                                  kind: 'text',
                                  id: item.id,
                                  offsetX: (e.clientX - rect.left) / zoom - item.x,
                                  offsetY: (e.clientY - rect.top) / zoom - item.topY,
                                });
                              }}
                              className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-3 bg-blue-600 rounded-t-sm flex items-center justify-center cursor-move text-white shadow-xs"
                              title="Drag to reposition text"
                            >
                              <Move className="w-2.5 h-2.5" />
                            </div>

                            {/* Corner handles (dynamic scale font size) */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setResizingHandle({
                                  id: item.id,
                                  handle: 'se',
                                  startX: (e.clientX - rect.left) / zoom,
                                  startY: (e.clientY - rect.top) / zoom,
                                  startWidth: item.width,
                                  startFontSize: item.fontSize,
                                  startXPos: item.x,
                                });
                              }}
                              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-40 shadow-xs"
                              title="Drag corner to scale font size"
                            />
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setResizingHandle({
                                  id: item.id,
                                  handle: 'sw',
                                  startX: (e.clientX - rect.left) / zoom,
                                  startY: (e.clientY - rect.top) / zoom,
                                  startWidth: item.width,
                                  startFontSize: item.fontSize,
                                  startXPos: item.x,
                                });
                              }}
                              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-40 shadow-xs"
                              title="Drag corner to scale font size"
                            />
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setResizingHandle({
                                  id: item.id,
                                  handle: 'ne',
                                  startX: (e.clientX - rect.left) / zoom,
                                  startY: (e.clientY - rect.top) / zoom,
                                  startWidth: item.width,
                                  startFontSize: item.fontSize,
                                  startXPos: item.x,
                                });
                              }}
                              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-40 shadow-xs"
                              title="Drag corner to scale font size"
                            />
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setResizingHandle({
                                  id: item.id,
                                  handle: 'nw',
                                  startX: (e.clientX - rect.left) / zoom,
                                  startY: (e.clientY - rect.top) / zoom,
                                  startWidth: item.width,
                                  startFontSize: item.fontSize,
                                  startXPos: item.x,
                                });
                              }}
                              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-40 shadow-xs"
                              title="Drag corner to scale font size"
                            />

                            {/* Side handles (adjust width) */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = pageContainerRef.current!.getBoundingClientRect();
                                setResizingHandle({
                                  id: item.id,
                                  handle: 'e',
                                  startX: (e.clientX - rect.left) / zoom,
                                  startY: (e.clientY - rect.top) / zoom,
                                  startWidth: item.width,
                                  startFontSize: item.fontSize,
                                  startXPos: item.x,
                                });
                              }}
                              className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-3.5 bg-blue-600 rounded-xs cursor-ew-resize z-40 shadow-xs"
                              title="Drag to adjust width"
                            />
                          </>
                        )}

                        {isSelected ? (
                          <input
                            ref={activeInputRef}
                            type="text"
                            autoFocus
                            value={item.text}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              const estimatedW = Math.max(
                                item.origWidth,
                                (nextVal.length + 1) * item.fontSize * 0.58
                              );
                              updateTextItem(item.id, {
                                text: nextVal,
                                width: estimatedW,
                              });
                            }}
                            onBlur={() => {
                              pushHistory(textItems, shapes);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                pushHistory(textItems, shapes);
                                setSelectedTextId(null);
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                const idx = currentPageItems.findIndex((t) => t.id === item.id);
                                const next = currentPageItems[(idx + 1) % currentPageItems.length];
                                if (next) {
                                  pushHistory(textItems, shapes);
                                  setSelectedTextId(next.id);
                                }
                              }
                            }}
                            style={{
                              fontFamily: cssFontStack(item.fontFamily, item.exactFontName),
                              fontSize: `${item.fontSize * zoom}px`,
                              fontWeight: item.bold ? 700 : 400,
                              fontStyle: item.italic ? 'italic' : 'normal',
                              color: item.textColor,
                              lineHeight: 1,
                              width: `${Math.max(
                                item.width,
                                (item.text.length + 1) * item.fontSize * 0.58
                              ) * zoom}px`,
                            }}
                            className="bg-transparent border-0 p-0 m-0 focus:outline-none block"
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: cssFontStack(item.fontFamily, item.exactFontName),
                              fontSize: `${item.fontSize * zoom}px`,
                              fontWeight: item.bold ? 700 : 400,
                              fontStyle: item.italic ? 'italic' : 'normal',
                              color: item.textColor,
                              lineHeight: 1,
                              opacity: isModified ? 1 : 0,
                              whiteSpace: 'pre',
                            }}
                            className="block select-none cursor-text"
                          >
                            {item.text}
                          </span>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* PDFSimpli-Grade Floating Contextual Action Toolbar directly over active text block */}
              {selectedText && floatingStyle && (
                <div
                  style={floatingStyle}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 text-xs text-white"
                >
                  {/* Font Family selector */}
                  <select
                    aria-label="Font family"
                    value={selectedText.fontFamily}
                    onChange={(e) => {
                      const val = e.target.value as PdfFontFamily;
                      let newExactName = selectedText.exactFontName;
                      if (val === 'calibri') newExactName = 'Calibri';
                      else if (val === 'arial') newExactName = 'Arial';
                      else if (val === 'helvetica') newExactName = 'Helvetica';
                      else if (val === 'times') newExactName = 'Times New Roman';
                      else if (val === 'georgia') newExactName = 'Georgia';
                      else if (val === 'garamond') newExactName = 'Garamond';
                      else if (val === 'roboto') newExactName = 'Roboto';
                      else if (val === 'verdana') newExactName = 'Verdana';
                      else if (val === 'courier') newExactName = 'Courier New';
                      else if (val === 'mono') newExactName = 'Consolas';
                      updateTextItem(
                        selectedText.id,
                        { fontFamily: val, exactFontName: newExactName },
                        true
                      );
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 font-medium max-w-[125px] truncate cursor-pointer"
                  >
                    <option value={selectedText.fontFamily}>
                      {selectedText.exactFontName || 'Detected Font'}
                    </option>
                    <option value="calibri">Calibri</option>
                    <option value="arial">Arial</option>
                    <option value="helvetica">Helvetica</option>
                    <option value="times">Times New Roman</option>
                    <option value="georgia">Georgia</option>
                    <option value="garamond">Garamond</option>
                    <option value="roboto">Roboto</option>
                    <option value="verdana">Verdana</option>
                    <option value="courier">Courier New</option>
                    <option value="mono">Consolas</option>
                  </select>

                  {/* Font Size Decrement & Increment */}
                  <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() =>
                        updateTextItem(
                          selectedText.id,
                          { fontSize: Math.max(4, selectedText.fontSize - 1) },
                          true
                        )
                      }
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Decrease font size"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-mono-code font-bold text-emerald-400 px-1.5 w-7 text-center">
                      {Math.round(selectedText.fontSize)}
                    </span>
                    <button
                      onClick={() =>
                        updateTextItem(
                          selectedText.id,
                          { fontSize: Math.min(120, selectedText.fontSize + 1) },
                          true
                        )
                      }
                      className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                      title="Increase font size"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Bold & Italic Toggles */}
                  <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() =>
                        updateTextItem(selectedText.id, { bold: !selectedText.bold }, true)
                      }
                      className={`p-1 rounded cursor-pointer ${
                        selectedText.bold ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() =>
                        updateTextItem(selectedText.id, { italic: !selectedText.italic }, true)
                      }
                      className={`p-1 rounded cursor-pointer ${
                        selectedText.italic ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Text Color Picker */}
                  <label
                    className="p-1 rounded-lg bg-slate-950 border border-slate-700 cursor-pointer flex items-center gap-1"
                    title="Change text ink color"
                  >
                    <span
                      style={{ backgroundColor: selectedText.textColor }}
                      className="w-3.5 h-3.5 rounded-full border border-white/30 inline-block"
                    />
                    <input
                      type="color"
                      value={selectedText.textColor}
                      onChange={(e) =>
                        updateTextItem(selectedText.id, { textColor: e.target.value }, true)
                      }
                      className="sr-only"
                    />
                  </label>

                  {/* Find & Replace Shortcut */}
                  <button
                    onClick={() => {
                      setFindQuery(selectedText.text);
                      setReplaceModalOpen(true);
                    }}
                    className="p-1 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                    title="Replace all occurrences of this text across the document"
                  >
                    <Replace className="w-3.5 h-3.5" />
                  </button>

                  {/* Reset Original Text */}
                  {!selectedText.isNew && (
                    <button
                      onClick={() =>
                        updateTextItem(
                          selectedText.id,
                          {
                            text: selectedText.origText,
                            fontSize: selectedText.origFontSize,
                            x: selectedText.origX,
                            topY: selectedText.origTopY,
                            baselineY: selectedText.origBaselineY,
                            isDeleted: false,
                          },
                          true
                        )
                      }
                      className="p-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Revert back to original PDF text"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Erase / Trash */}
                  <button
                    onClick={() => {
                      let next: EditablePdfTextItem[];
                      if (selectedText.isNew) {
                        next = textItems.filter((t) => t.id !== selectedText.id);
                      } else {
                        next = textItems.map((t) =>
                          t.id === selectedText.id ? { ...t, isDeleted: true, text: '' } : t
                        );
                      }
                      setTextItems(next);
                      pushHistory(next, shapes);
                      setSelectedTextId(null);
                    }}
                    className="p-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                    title="Erase / Delete this text block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Commit Done */}
                  <button
                    onClick={() => {
                      pushHistory(textItems, shapes);
                      setSelectedTextId(null);
                    }}
                    className="p-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer font-bold"
                    title="Done editing (Enter / Esc)"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* PDFSimpli-Style "Replace Text" / Find & Replace Modal */}
      {replaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Replace className="w-4 h-4 text-amber-400" />
                Find & Replace PDF Text
              </h3>
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Search for any word, date, name, or phrase across your document and replace all instances in a single click with preserved fonts.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Find Text</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="e.g. Old Company LLC or $500.00"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Replace With</label>
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="e.g. New Company LLC or $750.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplaceScope('current')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      replaceScope === 'current'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    Current Page ({currentPage})
                  </button>
                  <button
                    onClick={() => {
                      setReplaceScope('all');
                      ensureAllPagesExtracted();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      replaceScope === 'all'
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    All Pages ({pageCount})
                  </button>
                </div>

                <label className="inline-flex items-center gap-1.5 text-slate-400 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={matchCase}
                    onChange={(e) => setMatchCase(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Match Case</span>
                </label>
              </div>

              {findQuery.trim().length > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between text-xs text-amber-300">
                  <span>
                    Found <strong className="text-amber-200">{matchingItems.length}</strong> matching block{matchingItems.length === 1 ? '' : 's'} {replaceScope === 'current' ? `on Page ${currentPage}` : 'across document'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setReplaceModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReplaceAll}
                disabled={!findQuery.trim() || matchingItems.length === 0}
                className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
              >
                Replace All ({matchingItems.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signatureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-emerald-400" />
                Place Signature on Page {currentPage}
              </h3>
              <button
                onClick={() => setSignatureModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Draw Signature</label>
              <canvas
                ref={sigCanvasRef}
                width={380}
                height={110}
                onMouseDown={(e) => {
                  setIsDrawingSig(true);
                  const ctx = sigCanvasRef.current!.getContext('2d')!;
                  const r = sigCanvasRef.current!.getBoundingClientRect();
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineWidth = 2.6;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
                }}
                onMouseMove={(e) => {
                  if (!isDrawingSig) return;
                  const ctx = sigCanvasRef.current!.getContext('2d')!;
                  const r = sigCanvasRef.current!.getBoundingClientRect();
                  ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
                  ctx.stroke();
                }}
                onMouseUp={() => setIsDrawingSig(false)}
                onMouseLeave={() => setIsDrawingSig(false)}
                className="w-full rounded-xl bg-white border border-slate-300 cursor-crosshair"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    const ctx = sigCanvasRef.current?.getContext('2d');
                    if (ctx && sigCanvasRef.current) {
                      ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
                    }
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear Pad
                </button>
                <button
                  onClick={() => placeSignatureOnPage('drawn')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Insert Drawn Signature
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <label className="block text-xs text-slate-400">Or Type Calligraphic Signature</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-serif italic"
                />
                <button
                  onClick={() => placeSignatureOnPage('typed')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer"
                >
                  Insert Typed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Stamps Modal */}
      {stampModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Stamp className="w-4 h-4 text-rose-400" />
                Select Official Document Stamp
              </h3>
              <button
                onClick={() => setStampModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Click any official stamp below to place it onto Page {currentPage}. You can reposition and resize it on the page.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {[
                { text: 'APPROVED', color: '#10b981', sub: 'OFFICIALLY VERIFIED' },
                { text: 'CONFIDENTIAL', color: '#ef4444', sub: 'DO NOT DISTRIBUTE' },
                { text: 'DRAFT', color: '#f59e0b', sub: 'WORK IN PROGRESS' },
                { text: 'VOID', color: '#be123c', sub: 'NULL & CANCELLED' },
                { text: 'PAID', color: '#059669', sub: 'PAYMENT RECEIVED' },
                { text: 'URGENT', color: '#ea580c', sub: 'PRIORITY ACTION' },
                { text: 'FINAL', color: '#6366f1', sub: 'EXECUTED & BINDING' },
                { text: 'COMPLETED', color: '#0d9488', sub: 'RECORD ARCHIVED' },
                { text: 'RECEIVED', color: '#0284c7', sub: new Date().toISOString().split('T')[0] },
                { text: 'COPY', color: '#64748b', sub: 'DUPLICATE FILE' },
              ].map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleAddStamp(s.text, s.color, s.sub)}
                  style={{ borderColor: s.color, color: s.color }}
                  className="p-3 rounded-xl border-2 bg-slate-950/70 hover:scale-102 transition text-center cursor-pointer space-y-0.5"
                >
                  <div className="text-xs font-black tracking-wider">{s.text}</div>
                  <div className="text-[9px] font-bold opacity-80">{s.sub}</div>
                </button>
              ))}
            </div>

            {/* Custom Stamp Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300">Or Create Custom Stamp</label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  value={customStampText}
                  onChange={(e) => setCustomStampText(e.target.value)}
                  placeholder="e.g. AUDITED, REJECTED"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase"
                />
                <input
                  type="color"
                  value={customStampColor}
                  onChange={(e) => setCustomStampColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  title="Stamp Color"
                />
                <button
                  onClick={() => handleAddStamp(customStampText.trim() || 'STAMP', customStampColor)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  Place Stamp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Watermark Configuration Modal */}
      {watermarkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Droplet className="w-4 h-4 text-sky-400" />
                Document Watermark Settings
              </h3>
              <button
                onClick={() => setWatermarkModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Enable Watermark</p>
                <p className="text-[11px] text-slate-400">Shows in live preview and vector PDF export</p>
              </div>
              <button
                onClick={() => setWatermarkSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  watermarkSettings.enabled ? 'bg-sky-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    watermarkSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkSettings.text}
                  onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g. CONFIDENTIAL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {['CONFIDENTIAL', 'DRAFT', 'DO NOT COPY', 'FOR REVIEW', 'SAMPLE', 'TOP SECRET'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setWatermarkSettings((prev) => ({ ...prev, text: preset, enabled: true }))}
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Font Size</span>
                    <span>{watermarkSettings.fontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="84"
                    value={watermarkSettings.fontSize}
                    onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="w-full accent-sky-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Opacity</span>
                    <span>{Math.round(watermarkSettings.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.6"
                    step="0.02"
                    value={watermarkSettings.opacity}
                    onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, opacity: Number(e.target.value) }))}
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Rotation</span>
                    <span>{watermarkSettings.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    step="5"
                    value={watermarkSettings.rotation}
                    onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, rotation: Number(e.target.value) }))}
                    className="w-full accent-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={watermarkSettings.color}
                      onChange={(e) => setWatermarkSettings((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs text-slate-300 font-mono">{watermarkSettings.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Apply Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWatermarkSettings((prev) => ({ ...prev, applyTo: 'all' }))}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                      watermarkSettings.applyTo === 'all'
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    All Pages ({pageCount})
                  </button>
                  <button
                    onClick={() => setWatermarkSettings((prev) => ({ ...prev, applyTo: 'current' }))}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer ${
                      watermarkSettings.applyTo === 'current'
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Current Page Only ({currentPage})
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setWatermarkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export & Document Security / Re-encryption Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Download & Security Options</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isOriginalEncrypted && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-300">Original Document is Secured</p>
                  <p className="text-[11px] text-emerald-400/80 leading-relaxed mt-0.5">
                    Your original PDF (like Reliance Jio / corporate invoices) was protected with Standard PDF Security. You can re-encrypt it to preserve this exact authentic signature.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-300">Choose Export Security Mode</label>

              {/* Option 1: Authentic Re-encryption (SECURED) */}
              <div
                onClick={() => setExportSecurityMode('reencrypt')}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  exportSecurityMode === 'reencrypt'
                    ? 'bg-emerald-950/30 border-emerald-500/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="exportSecMode"
                    checked={exportSecurityMode === 'reencrypt'}
                    onChange={() => setExportSecurityMode('reencrypt')}
                    className="mt-1 accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Re-Encrypt as Authentic (SECURED)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                        Recommended for Bills & Invoices
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Applies authentic AES-256 PDF encryption with Owner Security. The PDF opens immediately in any viewer without asking for a password, and displays <strong>(SECURED)</strong> in Adobe Acrobat with locked modifications, exactly like genuine telecom & bank statements.
                    </p>

                    {exportSecurityMode === 'reencrypt' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowCopyingText}
                            onChange={(e) => setAllowCopyingText(e.target.checked)}
                            className="rounded accent-emerald-500 cursor-pointer"
                          />
                          <span>Allow text copying in readers</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Password Protect */}
              <div
                onClick={() => setExportSecurityMode('password')}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  exportSecurityMode === 'password'
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="exportSecMode"
                    checked={exportSecurityMode === 'password'}
                    onChange={() => setExportSecurityMode('password')}
                    className="mt-1 accent-amber-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">Password Protect Document</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                        Confidential
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Anyone opening the PDF will be required to type this password before they can view its contents (ideal for salary slips, confidential agreements, or bank statements).
                    </p>

                    {exportSecurityMode === 'password' && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <label className="block text-[11px] font-medium text-slate-300">Set Open Password</label>
                        <div className="relative">
                          <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                          <input
                            type={showPasswordInput ? 'text' : 'password'}
                            value={userPasswordInput}
                            onChange={(e) => setUserPasswordInput(e.target.value)}
                            placeholder="Enter password (e.g. 1234 or DOB)"
                            className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswordInput((v) => !v)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {showPasswordInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 3: Standard Unencrypted */}
              <div
                onClick={() => setExportSecurityMode('none')}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  exportSecurityMode === 'none'
                    ? 'bg-indigo-950/30 border-indigo-500/60'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="exportSecMode"
                    checked={exportSecurityMode === 'none'}
                    onChange={() => setExportSecurityMode('none')}
                    className="mt-1 accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white">Standard Unencrypted PDF</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Pristine, universal PDF with no passwords or permission restrictions. Opens in every viewer and can be re-edited freely.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportEditedPdf({
                    mode: exportSecurityMode,
                    password: userPasswordInput,
                    allowCopying: allowCopyingText,
                  });
                }}
                disabled={isExporting || (exportSecurityMode === 'password' && !userPasswordInput.trim())}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isExporting
                    ? 'Generating Encrypted PDF...'
                    : exportSecurityMode === 'reencrypt'
                    ? 'Download (SECURED) PDF'
                    : exportSecurityMode === 'password'
                    ? 'Download Password-Protected PDF'
                    : 'Download PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
