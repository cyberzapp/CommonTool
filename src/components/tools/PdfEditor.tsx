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
  Sliders,
  Check,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfFontFamily = 'sans' | 'serif' | 'mono';

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
): { family: PdfFontFamily; bold: boolean; italic: boolean } {
  const combined = `${fontName} ${fontFamilyHint}`.toLowerCase();
  const bold =
    combined.includes('bold') ||
    combined.includes('black') ||
    combined.includes('heavy') ||
    combined.includes('semibold') ||
    combined.includes('demi') ||
    combined.includes('-bd') ||
    combined.includes(',bold');
  const italic =
    combined.includes('italic') ||
    combined.includes('oblique') ||
    combined.includes('-it') ||
    combined.includes(',italic');

  let family: PdfFontFamily = 'sans';
  if (
    combined.includes('times') ||
    combined.includes('serif') && !combined.includes('sans') ||
    combined.includes('georgia') ||
    combined.includes('garamond') ||
    combined.includes('cambria') ||
    combined.includes('palatino') ||
    combined.includes('roman')
  ) {
    family = 'serif';
  } else if (
    combined.includes('courier') ||
    combined.includes('mono') ||
    combined.includes('consolas') ||
    combined.includes('menlo') ||
    combined.includes('code')
  ) {
    family = 'mono';
  }

  return { family, bold, italic };
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

export const PdfEditor: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1); // 1-based
  const [pageDims, setPageDims] = useState<PageDimensions>({ width: 595, height: 842 });
  const [zoom, setZoom] = useState<number>(1.15);

  const [toolMode, setToolMode] = useState<EditorToolMode>('edit-text');
  const [textItems, setTextItems] = useState<EditablePdfTextItem[]>([]);
  const [extractedPages, setExtractedPages] = useState<Record<number, boolean>>({});
  const [shapes, setShapes] = useState<PdfAnnotationShape[]>([]);

  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<{ kind: 'text' | 'shape'; id: string; offsetX: number; offsetY: number } | null>(null);

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

  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      imageDataUrl: dataUrl,
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedShapeId(newShape.id);
    setSelectedTextId(null);
    setStampModalOpen(false);
    setStatusBanner({ type: 'success', message: `Added "${stampText}" stamp to Page ${currentPage}` });
  };

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedText = textItems.find((t) => t.id === selectedTextId) || null;
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;

  const cssFontStack = (family: PdfFontFamily) => {
    if (family === 'serif') return 'Georgia, "Times New Roman", Times, serif';
    if (family === 'mono') return '"JetBrains Mono", "Courier New", Courier, monospace';
    return 'Helvetica, Arial, Inter, system-ui, sans-serif';
  };

  // Load a new PDF file into the editor
  const loadPdfBuffer = async (bytes: Uint8Array, name: string) => {
    try {
      setIsRendering(true);
      setStatusBanner(null);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const total = doc.getPageCount();
      setPdfBytes(bytes);
      setFileName(name);
      setPageCount(total);
      setCurrentPage(1);
      setTextItems([]);
      setShapes([]);
      setExtractedPages({});
      setSelectedTextId(null);
      setSelectedShapeId(null);

      // Fit zoom nicely on mobile vs desktop
      if (window.innerWidth < 640) {
        setZoom(0.58);
      } else if (window.innerWidth < 1024) {
        setZoom(0.85);
      } else {
        setZoom(1.15);
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        message: `Could not open PDF: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsRendering(false);
    }
  };

  const handleFileUpload = async (file: File | undefined) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    await loadPdfBuffer(new Uint8Array(buf), file.name);
  };

  // Render current page bitmap & extract exact text items with constant font size, font family, and sampled colors
  const renderPageAndExtractText = useCallback(async () => {
    if (!pdfBytes || !bgCanvasRef.current) return;
    setIsRendering(true);
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
      const pdf = await loadingTask.promise;
      const pageIdx = currentPage - 1;
      const page = await pdf.getPage(currentPage);

      const baseViewport = page.getViewport({ scale: 1.0 });
      setPageDims({ width: baseViewport.width, height: baseViewport.height });

      // Render high-DPI canvas at 2x scale
      const renderScale = 2.0;
      const renderViewport = page.getViewport({ scale: renderScale });
      const canvas = bgCanvasRef.current;
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      // Extract text items once per page
      if (!extractedPages[pageIdx]) {
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
          const { family, bold, italic } = detectFontMetadata(
            item.fontName || '',
            styleObj.fontFamily || ''
          );

          rawRuns.push({
            str: item.str,
            x,
            baselineY,
            topY,
            width,
            height,
            fontSize,
            fontName: item.fontName || '',
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
            // Merge if part of the same word or separated by normal word space (not a separate table column)
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

        // Convert merged runs into EditablePdfTextItem with sampled canvas colors
        const pageItems: EditablePdfTextItem[] = mergedRuns.map((r, idx) => {
          const { bgColor, textColor } = sampleColorsFromCanvas(
            ctx,
            canvas.width,
            canvas.height,
            r.x * renderScale,
            r.topY * renderScale,
            r.width * renderScale,
            r.height * renderScale
          );

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
            fontFamily: r.family,
            bold: r.bold,
            italic: r.italic,
            textColor,
            bgColor,
            isNew: false,
            isDeleted: false,
          };
        });

        setTextItems((prev) => [
          ...prev.filter((item) => item.pageIndex !== pageIdx),
          ...pageItems,
        ]);
        setExtractedPages((prev) => ({ ...prev, [pageIdx]: true }));
      }
    } catch {
      // ignore render cancellation
    } finally {
      setIsRendering(false);
    }
  }, [pdfBytes, currentPage, extractedPages]);

  useEffect(() => {
    renderPageAndExtractText();
  }, [renderPageAndExtractText]);

  // Update a specific text item's property
  const updateTextItem = (id: string, patch: Partial<EditablePdfTextItem>) => {
    setTextItems((prev) =>
      prev.map((item) => {
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
      })
    );
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
        fontFamily: 'sans',
        bold: false,
        italic: false,
        textColor: '#0f172a',
        bgColor: 'transparent',
        isNew: true,
        isDeleted: false,
      };
      setTextItems((prev) => [...prev, newItem]);
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
      };
      setShapes((prev) => [...prev, newShape]);
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
      };
      setShapes((prev) => [...prev, newShape]);
      setSelectedShapeId(id);
      setSelectedTextId(null);
    } else {
      setSelectedTextId(null);
      setSelectedShapeId(null);
    }
  };

  // Drag support for moving text boxes or shapes
  const handleMouseMoveOnPage = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !pageContainerRef.current) return;
    const rect = pageContainerRef.current.getBoundingClientRect();
    const nextX = Math.max(0, (e.clientX - rect.left) / zoom - draggingId.offsetX);
    const nextY = Math.max(0, (e.clientY - rect.top) / zoom - draggingId.offsetY);

    if (draggingId.kind === 'text') {
      updateTextItem(draggingId.id, { x: nextX, topY: nextY });
    } else {
      setShapes((prev) =>
        prev.map((s) => (s.id === draggingId.id ? { ...s, x: nextX, y: nextY } : s))
      );
    }
  };

  const handleMouseUpOnPage = () => {
    if (draggingId) setDraggingId(null);
  };

  // Upload image to place on page
  const handleInsertImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `img-${Date.now()}`;
      setShapes((prev) => [
        ...prev,
        {
          id,
          pageIndex: currentPage - 1,
          kind: 'image',
          x: pageDims.width * 0.25,
          y: pageDims.height * 0.25,
          width: 160,
          height: 90,
          color: '#ffffff',
          opacity: 1,
          imageDataUrl: reader.result as string,
        },
      ]);
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
    setShapes((prev) => [
      ...prev,
      {
        id,
        pageIndex: currentPage - 1,
        kind: 'signature',
        x: pageDims.width * 0.35,
        y: pageDims.height * 0.72,
        width: 165,
        height: 52,
        color: '#0f172a',
        opacity: 1,
        imageDataUrl: dataUrl,
      },
    ]);
    setSelectedShapeId(id);
    setSignatureModalOpen(false);
  };

  // Generate a realistic editable sample PDF right in the browser if user clicks "Try Demo Editable PDF" in empty dropzone
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

  // Export the final edited PDF with vector fonts, exact constant font sizes, and seamless background patching
  const exportEditedPdf = async () => {
    if (!pdfBytes) return;
    setIsExporting(true);
    setStatusBanner(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      // Embed complete 12-font standard PDF family (Sans, Serif, Mono in Regular, Bold, Italic, BoldItalic)
      const fontMap = {
        sans: {
          regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
          bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
          italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        serif: {
          regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
          bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
          italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
          boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        },
        mono: {
          regular: await pdfDoc.embedFont(StandardFonts.Courier),
          bold: await pdfDoc.embedFont(StandardFonts.CourierBold),
          italic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
        },
      };

      const pickEmbeddedFont = (family: PdfFontFamily, bold: boolean, italic: boolean) => {
        const group = fontMap[family] || fontMap.sans;
        if (bold && italic) return group.boldItalic;
        if (bold) return group.bold;
        if (italic) return group.italic;
        return group.regular;
      };

      const pages = pdfDoc.getPages();

      // 1. Apply all modified, deleted, or newly added text items
      for (const item of textItems) {
        const pdfPage = pages[item.pageIndex];
        if (!pdfPage) continue;
        const { height: pageH } = pdfPage.getSize();

        const wasModified =
          item.isDeleted ||
          item.isNew ||
          item.text !== item.origText ||
          Math.abs(item.x - item.origX) > 0.5 ||
          Math.abs(item.topY - item.origTopY) > 0.5 ||
          Math.abs(item.fontSize - item.origFontSize) > 0.2;

        if (!wasModified) continue;

        // Step A: If this was an existing PDF text item, seamlessly cover the original PDF glyphs with the sampled background color
        if (!item.isNew) {
          const bg = hexToRgb01(item.bgColor === 'transparent' ? '#ffffff' : item.bgColor);
          const origBaselinePdfY = pageH - item.origBaselineY;
          pdfPage.drawRectangle({
            x: Math.max(0, item.origX - 1.5),
            y: origBaselinePdfY - item.origFontSize * 0.25,
            width: item.origWidth + 3.5,
            height: item.origFontSize * 1.16,
            color: rgb(bg.r, bg.g, bg.b),
          });
        }

        // Step B: If not deleted and has non-empty text, draw the new crisp vector text at the exact baseline & constant font size
        if (!item.isDeleted && item.text.trim().length > 0) {
          if (item.bgColor && item.bgColor !== 'transparent' && (item.isNew || Math.abs(item.x - item.origX) > 1 || Math.abs(item.topY - item.origTopY) > 1)) {
            const bg = hexToRgb01(item.bgColor);
            const curBaselinePdfY = pageH - item.baselineY;
            pdfPage.drawRectangle({
              x: item.x - 2,
              y: curBaselinePdfY - item.fontSize * 0.24,
              width: item.width + 4,
              height: item.fontSize * 1.15,
              color: rgb(bg.r, bg.g, bg.b),
            });
          }

          const font = pickEmbeddedFont(item.fontFamily, item.bold, item.italic);
          const fg = hexToRgb01(item.textColor);
          const targetBaselinePdfY = pageH - item.baselineY;

          pdfPage.drawText(item.text, {
            x: item.x,
            y: targetBaselinePdfY,
            size: item.fontSize,
            font,
            color: rgb(fg.r, fg.g, fg.b),
          });
        }
      }

      // 2. Apply all shapes, whiteouts, highlights, images, and signatures
      for (const shape of shapes) {
        const pdfPage = pages[shape.pageIndex];
        if (!pdfPage) continue;
        const { height: pageH } = pdfPage.getSize();
        const pdfY = pageH - shape.y - shape.height;

        if (shape.kind === 'whiteout' || shape.kind === 'highlight') {
          const c = hexToRgb01(shape.color);
          pdfPage.drawRectangle({
            x: shape.x,
            y: pdfY,
            width: shape.width,
            height: shape.height,
            color: rgb(c.r, c.g, c.b),
            opacity: shape.opacity,
          });
        } else if ((shape.kind === 'image' || shape.kind === 'signature' || shape.kind === 'stamp') && shape.imageDataUrl) {
          const isPng = shape.imageDataUrl.startsWith('data:image/png');
          const embeddedImg = isPng
            ? await pdfDoc.embedPng(shape.imageDataUrl)
            : await pdfDoc.embedJpg(shape.imageDataUrl);
          pdfPage.drawImage(embeddedImg, {
            x: shape.x,
            y: pdfY,
            width: shape.width,
            height: shape.height,
          });
        }
      }

      // 3. Apply Watermarks if enabled
      if (watermarkSettings.enabled && watermarkSettings.text.trim()) {
        const wmTargetPages = watermarkSettings.applyTo === 'all' ? pages : [pages[currentPage - 1]];
        const wmFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const wmc = hexToRgb01(watermarkSettings.color);
        for (const wp of wmTargetPages) {
          if (!wp) continue;
          const { width: pW, height: pH } = wp.getSize();
          const textW = wmFont.widthOfTextAtSize(watermarkSettings.text, watermarkSettings.fontSize);
          const rad = (watermarkSettings.rotation * Math.PI) / 180;
          wp.drawText(watermarkSettings.text, {
            x: pW / 2 - (textW / 2) * Math.cos(rad),
            y: pH / 2 - (textW / 2) * Math.sin(rad),
            size: watermarkSettings.fontSize,
            font: wmFont,
            color: rgb(wmc.r, wmc.g, wmc.b),
            opacity: watermarkSettings.opacity,
            rotate: degrees(watermarkSettings.rotation),
          });
        }
      }

      const outBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(outBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Edited-${fileName || 'Document.pdf'}`;
      a.click();
      URL.revokeObjectURL(url);

      setStatusBanner({
        type: 'success',
        message: `Successfully exported vector-edited PDF (${fileName || 'Document.pdf'})!`,
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
  const modifiedCount = textItems.filter(
    (t) => t.isDeleted || t.isNew || t.text !== t.origText || Math.abs(t.fontSize - t.origFontSize) > 0.2
  ).length + shapes.length;

  return (
    <div className="space-y-4">
      {/* Compact Header with (i) Info Button */}
      {!embedded && (
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
                <button
                  onClick={exportEditedPdf}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExporting ? 'Exporting PDF...' : `Download Edited PDF${modifiedCount > 0 ? ` (${modifiedCount} edits)` : ''}`}
                </button>
              )}
            </div>
          </div>

          {showInfo && (
            <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
              Click any existing text in your PDF to edit it directly in-place. The editor automatically preserves the original constant font size, matched font family (Sans-Serif, Serif, Monospace), bold/italic style, text color, and background fill, and exports a crisp vector PDF locally.
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
              Click Any Text in a PDF to Edit It In-Place
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically detects original font family, constant point size, ink color, and background fill. Edit words, numbers, dates, or paragraphs directly on the page.
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
        <div className="space-y-3">
          {/* Top Professional PDF Editor Ribbon / Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5 sticky top-14 z-20 backdrop-blur-md shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: Editor Mode Tools */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setToolMode('edit-text')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'edit-text'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click any existing text on the PDF to edit it in-place"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Edit PDF Text</span>
                </button>

                <button
                  onClick={() => setToolMode('add-text')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'add-text'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click anywhere on the page to insert a new text block"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Text</span>
                </button>

                <button
                  onClick={() => setToolMode('whiteout')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'whiteout'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click on the page to place a whiteout / erase box"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Whiteout</span>
                </button>

                <button
                  onClick={() => setToolMode('highlight')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    toolMode === 'highlight'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                  title="Click on the page to highlight text"
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Highlight</span>
                </button>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleInsertImageUpload(e.target.files?.[0])}
                  />
                </label>

                <button
                  onClick={() => setSignatureModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign</span>
                </button>

                <button
                  onClick={() => setStampModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                  title="Stamp official badges (Approved, Confidential, Void, Paid, etc.)"
                >
                  <Stamp className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stamps</span>
                </button>

                <button
                  onClick={() => setWatermarkModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                    watermarkSettings.enabled
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Configure diagonal watermark across pages"
                >
                  <Droplet className="w-3.5 h-3.5 text-sky-400" />
                  <span>Watermark {watermarkSettings.enabled && '• ON'}</span>
                </button>
              </div>

              {/* Right: Page Switcher, Zoom & Export */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-semibold text-slate-200 px-1">
                    Page {currentPage} / {pageCount}
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

                <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-mono-code text-slate-300 w-11 text-center">
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

                {embedded && (
                  <button
                    onClick={exportEditedPdf}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dynamic Typography & Formatting Inspector Bar when a Text Block is Selected */}
            {selectedText ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-semibold text-[11px]">
                    {selectedText.isNew ? 'Added Text' : 'Matched PDF Text'}
                  </span>

                  {/* Font Family Selector */}
                  <select
                    aria-label="Font family"
                    value={selectedText.fontFamily}
                    onChange={(e) =>
                      updateTextItem(selectedText.id, { fontFamily: e.target.value as PdfFontFamily })
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-medium"
                  >
                    <option value="sans">Sans-Serif (Helvetica / Arial)</option>
                    <option value="serif">Serif (Times New Roman)</option>
                    <option value="mono">Monospace (Courier)</option>
                  </select>

                  {/* Constant Font Size Control */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5">
                    <span className="text-[10px] text-slate-400">Size:</span>
                    <input
                      type="number"
                      step="0.5"
                      min={4}
                      max={120}
                      value={selectedText.fontSize}
                      onChange={(e) =>
                        updateTextItem(selectedText.id, {
                          fontSize: Math.max(4, parseFloat(e.target.value) || selectedText.origFontSize),
                        })
                      }
                      className="w-12 bg-transparent text-center text-xs font-bold text-emerald-400 focus:outline-none"
                      title="Constant PDF Font Size in Points (pt)"
                    />
                    <span className="text-[10px] text-slate-500">pt</span>
                    {!selectedText.isNew && Math.abs(selectedText.fontSize - selectedText.origFontSize) > 0.1 && (
                      <button
                        onClick={() => updateTextItem(selectedText.id, { fontSize: selectedText.origFontSize })}
                        className="text-[10px] text-indigo-400 hover:underline ml-1 cursor-pointer"
                        title="Lock back to exact original PDF font size"
                      >
                        Lock {selectedText.origFontSize}pt
                      </button>
                    )}
                  </div>

                  {/* Bold & Italic */}
                  <button
                    onClick={() => updateTextItem(selectedText.id, { bold: !selectedText.bold })}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      selectedText.bold
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => updateTextItem(selectedText.id, { italic: !selectedText.italic })}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      selectedText.italic
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  {/* Text Color Picker */}
                  <label
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                    title="Text Ink Color (Auto-sampled from original PDF)"
                  >
                    <span className="text-[10px] text-slate-400">Text</span>
                    <input
                      type="color"
                      value={selectedText.textColor}
                      onChange={(e) => updateTextItem(selectedText.id, { textColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>

                  {/* Background Patch Color Picker */}
                  <label
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                    title="Background Fill Color covering original text"
                  >
                    <span className="text-[10px] text-slate-400">Bg</span>
                    <input
                      type="color"
                      value={selectedText.bgColor === 'transparent' ? '#ffffff' : selectedText.bgColor}
                      onChange={(e) => updateTextItem(selectedText.id, { bgColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                </div>

                {/* Reset or Delete Text Block */}
                <div className="flex items-center gap-1.5">
                  {!selectedText.isNew && (
                    <button
                      onClick={() =>
                        updateTextItem(selectedText.id, {
                          text: selectedText.origText,
                          fontSize: selectedText.origFontSize,
                          x: selectedText.origX,
                          topY: selectedText.origTopY,
                          baselineY: selectedText.origBaselineY,
                          isDeleted: false,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      title="Restore original unmodified PDF text"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (selectedText.isNew) {
                        setTextItems((prev) => prev.filter((t) => t.id !== selectedText.id));
                      } else {
                        updateTextItem(selectedText.id, { isDeleted: true, text: '' });
                      }
                      setSelectedTextId(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 cursor-pointer"
                    title="Erase / Delete this text block from the PDF"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Erase Text</span>
                  </button>
                </div>
              </div>
            ) : selectedShape ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90 text-xs">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold capitalize">
                    {selectedShape.kind} Annotation
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-slate-300">
                    <span>Width:</span>
                    <input
                      type="range"
                      min={25}
                      max={500}
                      value={selectedShape.width}
                      onChange={(e) =>
                        setShapes((prev) =>
                          prev.map((s) =>
                            s.id === selectedShape.id ? { ...s, width: parseInt(e.target.value, 10) } : s
                          )
                        )
                      }
                      className="w-24"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-slate-300">
                    <span>Height:</span>
                    <input
                      type="range"
                      min={12}
                      max={350}
                      value={selectedShape.height}
                      onChange={(e) =>
                        setShapes((prev) =>
                          prev.map((s) =>
                            s.id === selectedShape.id ? { ...s, height: parseInt(e.target.value, 10) } : s
                          )
                        )
                      }
                      className="w-24"
                    />
                  </label>
                </div>
                <button
                  onClick={() => {
                    setShapes((prev) => prev.filter((s) => s.id !== selectedShape.id));
                    setSelectedShapeId(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Annotation</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/70 text-[11px] text-slate-400">
                <span>
                  {toolMode === 'edit-text' &&
                    `Click any text on the page below to edit it in-place with constant font size (${currentPageItems.length} editable text blocks detected on Page ${currentPage}).`}
                  {toolMode === 'add-text' && 'Click anywhere on the PDF page below to insert a new text box.'}
                  {toolMode === 'whiteout' && 'Click anywhere on the PDF page below to place a whiteout / erase cover patch.'}
                  {toolMode === 'highlight' && 'Click anywhere on the PDF page below to place a translucent highlight bar.'}
                </span>
                {isRendering && <span className="text-indigo-400 font-semibold">Scanning page fonts...</span>}
              </div>
            )}
          </div>

          {/* Interactive WYSIWYG PDF Page Canvas */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-6 overflow-auto flex justify-center max-h-[78vh]">
            <div
              ref={pageContainerRef}
              onClick={handlePageSurfaceClick}
              onMouseMove={handleMouseMoveOnPage}
              onMouseUp={handleMouseUpOnPage}
              className={`relative shadow-2xl select-none bg-white transition-all ${
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
              {watermarkSettings.enabled && watermarkSettings.text.trim() && (
                watermarkSettings.applyTo === 'all' || watermarkSettings.applyTo === 'current'
              ) && (
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
                      backgroundColor:
                        shape.kind === 'whiteout' || shape.kind === 'highlight'
                          ? shape.color
                          : 'transparent',
                      opacity: shape.opacity,
                    }}
                    className={`cursor-move ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 z-20'
                        : 'hover:ring-1 hover:ring-indigo-400/70 z-10'
                    }`}
                  >
                    {shape.imageDataUrl && (
                      <img
                        src={shape.imageDataUrl}
                        alt={shape.kind}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    )}
                  </div>
                );
              })}

              {/* Layer 2: Every Detected & Added PDF Text Block (In-Place Editable with Constant Font Size) */}
              {currentPageItems.map((item) => {
                const isSelected = item.id === selectedTextId;
                const isModified =
                  item.isDeleted ||
                  item.isNew ||
                  item.text !== item.origText ||
                  Math.abs(item.x - item.origX) > 0.5 ||
                  Math.abs(item.topY - item.origTopY) > 0.5 ||
                  Math.abs(item.fontSize - item.origFontSize) > 0.2;

                // If an existing item was moved or deleted, render a seamless background patch over its original coordinates
                const showOrigCover = !item.isNew && isModified;

                return (
                  <React.Fragment key={item.id}>
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
                        className={`group transition-colors ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 z-30 shadow-sm'
                            : isModified
                            ? 'ring-1 ring-emerald-500/60 hover:ring-indigo-500 z-20'
                            : 'hover:ring-1 hover:ring-indigo-500/70 hover:bg-indigo-500/5 z-10'
                        }`}
                      >
                        {/* Drag Handle when selected */}
                        {isSelected && (
                          <button
                            type="button"
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
                            title="Drag to reposition text"
                            className="absolute -left-5 top-0 w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center cursor-move shadow"
                          >
                            <Move className="w-2.5 h-2.5" />
                          </button>
                        )}

                        {isSelected ? (
                          <input
                            type="text"
                            autoFocus
                            value={item.text}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              const estimatedW = Math.max(
                                item.origWidth,
                                nextVal.length * item.fontSize * 0.56
                              );
                              updateTextItem(item.id, {
                                text: nextVal,
                                width: estimatedW,
                              });
                            }}
                            style={{
                              fontFamily: cssFontStack(item.fontFamily),
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
                              fontFamily: cssFontStack(item.fontFamily),
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
    </div>
  );
};
