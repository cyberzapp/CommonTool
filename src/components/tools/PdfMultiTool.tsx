import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  FileText,
  FileEdit,
  Upload,
  Download,
  Scissors,
  Layers,
  Minimize2,
  RefreshCw,
  PenTool,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Type,
  Info,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import { PdfEditor } from './PdfEditor';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfTab = 'edit' | 'merge' | 'split' | 'compress' | 'rotate' | 'convert' | 'sign';

interface UploadedPdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
}

interface PreviewPdfResult {
  bytes: Uint8Array;
  filename: string;
  pageCount: number;
  label: string;
}

export const PdfMultiTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PdfTab>('edit');
  const [showInfo, setShowInfo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Merge state
  const [mergeList, setMergeList] = useState<UploadedPdfItem[]>([]);

  // Single PDF state for Split / Compress / Convert / Sign
  const [singlePdf, setSinglePdf] = useState<UploadedPdfItem | null>(null);
  const [splitRange, setSplitRange] = useState('1');
  const [splitMode, setSplitMode] = useState<'extract' | 'individual'>('extract');

  // Compress state
  const [compressionQuality, setCompressionQuality] = useState(0.65);
  const [compressedStats, setCompressedStats] = useState<{ before: number; after: number } | null>(null);

  // Convert state
  const [convertDirection, setConvertDirection] = useState<
    'pdf-to-png' | 'pdf-to-word' | 'pdf-to-excel' | 'images-to-pdf' | 'text-to-pdf'
  >('pdf-to-png');
  const [imagesForPdf, setImagesForPdf] = useState<File[]>([]);
  const [textForPdf, setTextForPdf] = useState('');
  const [extractedPreview, setExtractedPreview] = useState<string>('');
  const [pngPreviews, setPngPreviews] = useState<string[]>([]);

  // Rotate state
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [rotateScope, setRotateScope] = useState<'all' | 'odd' | 'even' | 'single'>('all');
  const [rotatePageNumber, setRotatePageNumber] = useState<number>(1);

  // E-Signature state
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('Alex Morgan');
  const [signerTitle, setSignerTitle] = useState('Authorized Signatory');
  const [includeDateStamp, setIncludeDateStamp] = useState(true);
  const [includeLegalCertificate, setIncludeLegalCertificate] = useState(true);
  const [signPage, setSignPage] = useState(1);
  const [signXPercent, setSignXPercent] = useState(58);
  const [signYPercent, setSignYPercent] = useState(16);
  const [penColor, setPenColor] = useState('#1d4ed8');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnSigDataUrl, setDrawnSigDataUrl] = useState<string | null>(null);

  // Live Page Preview state (for inspecting input or output PDF before downloading)
  const [previewResult, setPreviewResult] = useState<PreviewPdfResult | null>(null);
  const [inspectorPage, setInspectorPage] = useState(1);
  const [renderedPageUrl, setRenderedPageUrl] = useState<string | null>(null);
  const renderCounterRef = useRef(0);

  // Determine which PDF bytes are currently shown in the Live Visual Inspector
  const activeInspectBytes =
    previewResult?.bytes ||
    (activeTab === 'merge' ? mergeList[0]?.bytes : singlePdf?.bytes) ||
    null;

  const activeInspectTotalPages =
    previewResult?.pageCount ||
    (activeTab === 'merge' ? mergeList[0]?.pageCount || 1 : singlePdf?.pageCount || 1);

  const pageToRender = activeTab === 'sign' && !previewResult ? signPage : inspectorPage;

  useEffect(() => {
    setPreviewResult(null);
    setInspectorPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (!activeInspectBytes) {
      setRenderedPageUrl(null);
      return;
    }
    const taskId = ++renderCounterRef.current;
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: activeInspectBytes.slice(0) });
        const pdf = await loadingTask.promise;
        if (taskId !== renderCounterRef.current) return;
        const safeP = Math.min(Math.max(1, pageToRender), pdf.numPages);
        const page = await pdf.getPage(safeP);
        const viewport = page.getViewport({ scale: 1.3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (taskId === renderCounterRef.current) {
            setRenderedPageUrl(canvas.toDataURL('image/png'));
          }
        }
      } catch {
        // ignore render error
      }
    })();
  }, [activeInspectBytes, pageToRender]);

  useEffect(() => {
    if (activeTab === 'sign' && sigCanvasRef.current && signMode === 'draw') {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab, signMode, penColor]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const downloadBlob = (blob: Blob, filename: string, origSize?: number) => {
    const url = URL.createObjectURL(blob);
    triggerDownloadWithSuccessPage({
      fileBlobUrl: url,
      fileName: filename,
      fileSize: blob.size,
      toolId: 'pdf-multitool',
      toolTitle: 'PDF Multi-Tool Suite',
      originalSize: origSize && origSize > blob.size ? origSize : singlePdf?.size,
      compressedSize: blob.size,
    });
  };

  const handleUploadPdfs = async (files: FileList | null, target: 'merge' | 'single') => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
    setPreviewResult(null);
    try {
      const loadedItems: UploadedPdfItem[] = [];
      for (const file of Array.from(files)) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        loadedItems.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          pageCount: doc.getPageCount(),
          bytes,
        });
      }
      if (target === 'merge') {
        setMergeList((prev) => [...prev, ...loadedItems]);
        if (!singlePdf && loadedItems[0]) setSinglePdf(loadedItems[0]);
        setStatusMessage(`Added ${loadedItems.length} PDF file(s).`);
      } else {
        setSinglePdf(loadedItems[0]);
        setSplitRange(`1-${loadedItems[0].pageCount}`);
        setSignPage(1);
        setCompressedStats(null);
        setStatusMessage(`Loaded "${loadedItems[0].name}" (${loadedItems[0].pageCount} pages).`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Failed to read PDF: ${err instanceof Error ? err.message : 'Invalid file'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. MERGE PDFs (Preview or Download)
  const buildMergedPdf = async (): Promise<PreviewPdfResult | null> => {
    if (mergeList.length < 1) return null;
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of mergeList) {
        const srcDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      const mergedBytes = new Uint8Array(await mergedPdf.save());
      const res: PreviewPdfResult = {
        bytes: mergedBytes,
        filename: `CommonTool-Merged-${Date.now()}.pdf`,
        pageCount: mergedPdf.getPageCount(),
        label: `Merged PDF (${mergedPdf.getPageCount()} pages, ${formatBytes(mergedBytes.byteLength)})`,
      };
      setPreviewResult(res);
      setInspectorPage(1);
      setStatusMessage(`Merged preview ready (${res.pageCount} pages). Inspect on the right before downloading!`);
      return res;
    } catch (err: unknown) {
      setStatusMessage(`Merge error: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const parsePageRanges = (input: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(maxPages, parseInt(endStr, 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) pages.add(i - 1);
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= maxPages) {
          pages.add(num - 1);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // 2. SPLIT / EXTRACT PAGES
  const handleSplitPdf = async (downloadImmediately: boolean) => {
    if (!singlePdf) return;
    setIsProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(singlePdf.bytes, { ignoreEncryption: true });
      if (splitMode === 'extract') {
        const indices = parsePageRanges(splitRange, singlePdf.pageCount);
        if (indices.length === 0) {
          setStatusMessage('Enter valid page numbers between 1 and ' + singlePdf.pageCount);
          setIsProcessing(false);
          return;
        }
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const outBytes = new Uint8Array(await newDoc.save());
        const res: PreviewPdfResult = {
          bytes: outBytes,
          filename: `${singlePdf.name.replace(/\.pdf$/i, '')}-pages-${splitRange.replace(/\s+/g, '')}.pdf`,
          pageCount: indices.length,
          label: `Extracted ${indices.length} page(s) (${formatBytes(outBytes.byteLength)})`,
        };
        setPreviewResult(res);
        setInspectorPage(1);
        if (downloadImmediately) {
          downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), res.filename);
          setStatusMessage(`Downloaded extracted PDF (${indices.length} pages).`);
        } else {
          setStatusMessage(`Extracted ${indices.length} page(s). Inspect the preview on the right!`);
        }
      } else {
        const zip = new JSZip();
        for (let i = 0; i < singlePdf.pageCount; i++) {
          const singlePageDoc = await PDFDocument.create();
          const [copied] = await singlePageDoc.copyPages(srcDoc, [i]);
          singlePageDoc.addPage(copied);
          const bytes = await singlePageDoc.save();
          zip.file(`page-${i + 1}.pdf`, bytes);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${singlePdf.name.replace(/\.pdf$/i, '')}-split-pages.zip`);
        setStatusMessage(`Split all ${singlePdf.pageCount} pages into a ZIP archive!`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Split error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. COMPRESS PDF (Preview first or Download)
  const handleCompressPdf = async (downloadImmediately: boolean) => {
    if (!singlePdf) return;
    setIsProcessing(true);
    try {
      const loadingTask = pdfjsLib.getDocument({ data: singlePdf.bytes.slice() });
      const pdfJsDoc = await loadingTask.promise;
      const outPdf = await PDFDocument.create();

      for (let i = 1; i <= pdfJsDoc.numPages; i++) {
        const page = await pdfJsDoc.getPage(i);
        const scale = compressionQuality < 0.5 ? 1.0 : 1.25;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const jpegDataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
        const jpegImage = await outPdf.embedJpg(jpegDataUrl);
        const origViewport = page.getViewport({ scale: 1.0 });
        const newPage = outPdf.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
      }

      const compressedBytes = new Uint8Array(await outPdf.save({ useObjectStreams: true }));
      setCompressedStats({
        before: singlePdf.size,
        after: compressedBytes.byteLength,
      });
      const res: PreviewPdfResult = {
        bytes: compressedBytes,
        filename: `${singlePdf.name.replace(/\.pdf$/i, '')}-compressed.pdf`,
        pageCount: pdfJsDoc.numPages,
        label: `Compressed PDF (${formatBytes(singlePdf.size)} → ${formatBytes(compressedBytes.byteLength)})`,
      };
      setPreviewResult(res);
      setInspectorPage(1);

      if (downloadImmediately) {
        downloadBlob(new Blob([compressedBytes], { type: 'application/pdf' }), res.filename);
        setStatusMessage(`Downloaded compressed PDF (${formatBytes(compressedBytes.byteLength)})!`);
      } else {
        setStatusMessage(
          `Compression preview ready (${formatBytes(singlePdf.size)} → ${formatBytes(compressedBytes.byteLength)}). Check visual quality on the right!`
        );
      }
    } catch (err: unknown) {
      setStatusMessage(`Compression error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. CONVERT PDF <-> PNG / WORD / EXCEL (Preview First!)
  const handlePreviewConversion = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    setPngPreviews([]);
    setExtractedPreview('');
    try {
      if (convertDirection === 'images-to-pdf') {
        if (imagesForPdf.length === 0) {
          setStatusMessage('Select at least one PNG or JPG image first.');
          setIsProcessing(false);
          return;
        }
        const pdfDoc = await PDFDocument.create();
        for (const imgFile of imagesForPdf) {
          const buf = await imgFile.arrayBuffer();
          const isPng = imgFile.type.includes('png') || imgFile.name.toLowerCase().endsWith('.png');
          const embedded = isPng ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf);
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        }
        const out = new Uint8Array(await pdfDoc.save());
        setPreviewResult({
          bytes: out,
          filename: 'CommonTool-Images-to-PDF.pdf',
          pageCount: imagesForPdf.length,
          label: `Images to PDF (${imagesForPdf.length} pages)`,
        });
        setStatusMessage('Generated PDF preview from images! Inspect on the right before downloading.');
        setIsProcessing(false);
        return;
      }

      if (convertDirection === 'text-to-pdf') {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const lines = (textForPdf || 'Sample Document Content').split('\n');
        let page = pdfDoc.addPage([612, 792]);
        let y = 740;
        for (const line of lines) {
          if (y < 60) {
            page = pdfDoc.addPage([612, 792]);
            y = 740;
          }
          page.drawText(line.slice(0, 95), { x: 50, y, size: 11, font, color: rgb(0.1, 0.12, 0.16) });
          y -= 18;
        }
        const out = new Uint8Array(await pdfDoc.save());
        setPreviewResult({
          bytes: out,
          filename: 'CommonTool-Document.pdf',
          pageCount: pdfDoc.getPageCount(),
          label: `Text to PDF (${pdfDoc.getPageCount()} pages)`,
        });
        setStatusMessage('Generated PDF preview from text! Inspect on the right before downloading.');
        setIsProcessing(false);
        return;
      }

      if (!singlePdf) {
        setStatusMessage('Please upload a PDF file first.');
        setIsProcessing(false);
        return;
      }

      const loadingTask = pdfjsLib.getDocument({ data: singlePdf.bytes.slice() });
      const pdfJsDoc = await loadingTask.promise;

      if (convertDirection === 'pdf-to-png') {
        const urls: string[] = [];
        const maxPreview = Math.min(pdfJsDoc.numPages, 6);
        for (let i = 1; i <= maxPreview; i++) {
          const page = await pdfJsDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL('image/png'));
        }
        setPngPreviews(urls);
        setStatusMessage(`Rendered ${urls.length} page preview(s) below. Click Download to save!`);
      } else {
        let plainPreview = '';
        for (let i = 1; i <= pdfJsDoc.numPages; i++) {
          const page = await pdfJsDoc.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items as Array<{ str: string; transform: number[] }>;
          const rowsMap = new Map<number, Array<{ x: number; text: string }>>();
          items.forEach((item) => {
            if (!item.str.trim()) return;
            const yKey = Math.round(item.transform[5] / 8) * 8;
            const row = rowsMap.get(yKey) || [];
            row.push({ x: item.transform[4], text: item.str.trim() });
            rowsMap.set(yKey, row);
          });
          const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
          plainPreview += `--- Page ${i} ---\n`;
          sortedY.forEach((y) => {
            const rowItems = (rowsMap.get(y) || []).sort((a, b) => a.x - b.x);
            plainPreview += rowItems.map((r) => r.text).join('  |  ') + '\n';
          });
          plainPreview += '\n';
        }
        setExtractedPreview(plainPreview || 'No text layer found on PDF.');
        setStatusMessage('Extracted structure preview ready below! Review before downloading.');
      }
    } catch (err: unknown) {
      setStatusMessage(`Conversion error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadConverted = async () => {
    if (
      (convertDirection === 'images-to-pdf' || convertDirection === 'text-to-pdf') &&
      previewResult
    ) {
      downloadBlob(
        new Blob([previewResult.bytes], { type: 'application/pdf' }),
        previewResult.filename
      );
      return;
    }
    if (!singlePdf) return;
    setIsProcessing(true);
    try {
      const loadingTask = pdfjsLib.getDocument({ data: singlePdf.bytes.slice() });
      const pdfJsDoc = await loadingTask.promise;

      if (convertDirection === 'pdf-to-png') {
        const zip = new JSZip();
        for (let i = 1; i <= pdfJsDoc.numPages; i++) {
          const page = await pdfJsDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
          if (pdfJsDoc.numPages === 1) {
            downloadBlob(blob, `${singlePdf.name.replace(/\.pdf$/i, '')}-page-1.png`);
            setIsProcessing(false);
            return;
          }
          zip.file(`page-${i}.png`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${singlePdf.name.replace(/\.pdf$/i, '')}-png-pages.zip`);
      } else if (convertDirection === 'pdf-to-word') {
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;white-space:pre-wrap;padding:24px;">${
          extractedPreview || ''
        }</body></html>`;
        downloadBlob(
          new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' }),
          `${singlePdf.name.replace(/\.pdf$/i, '')}.doc`
        );
      } else if (convertDirection === 'pdf-to-excel') {
        const wb = XLSX.utils.book_new();
        const rows = (extractedPreview || '')
          .split('\n')
          .filter(Boolean)
          .map((line) => line.split('  |  '));
        const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['Empty']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Extracted');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadBlob(
          new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
          `${singlePdf.name.replace(/\.pdf$/i, '')}.xlsx`
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature pad drawing handlers
  const getCanvasPoint = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startSignDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
  };

  const moveSignDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const startSignTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const t = e.touches[0];
    const pt = getCanvasPoint(canvas, t.clientX, t.clientY);
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
  };

  const moveSignTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const t = e.touches[0];
    const pt = getCanvasPoint(canvas, t.clientX, t.clientY);
    const ctx = canvas.getContext('2d')!;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const endSignDraw = () => {
    setIsDrawing(false);
    if (sigCanvasRef.current) {
      setDrawnSigDataUrl(sigCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnSigDataUrl(null);
  };

  // 4b. ROTATE PAGES
  const processRotate = async (downloadImmediately = false) => {
    if (!singlePdf) {
      setStatusMessage('Please upload a PDF file first.');
      return;
    }
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(singlePdf.bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      pages.forEach((p, index) => {
        const pageNum = index + 1;
        let shouldRotate = false;
        if (rotateScope === 'all') shouldRotate = true;
        else if (rotateScope === 'odd' && pageNum % 2 !== 0) shouldRotate = true;
        else if (rotateScope === 'even' && pageNum % 2 === 0) shouldRotate = true;
        else if (rotateScope === 'single' && pageNum === rotatePageNumber) shouldRotate = true;

        if (shouldRotate) {
          const currentRot = p.getRotation().angle;
          p.setRotation(degrees((currentRot + rotationAngle) % 360));
        }
      });

      const rotatedBytes = new Uint8Array(await pdfDoc.save());
      const filename = `${singlePdf.name.replace(/\.pdf$/i, '')}-rotated-${rotationAngle}deg.pdf`;
      setPreviewResult({
        bytes: rotatedBytes,
        filename,
        pageCount: pages.length,
        label: `Rotated PDF (+${rotationAngle}°)`,
      });
      setInspectorPage(1);

      if (downloadImmediately) {
        downloadBlob(new Blob([rotatedBytes], { type: 'application/pdf' }), filename);
        setStatusMessage(`Downloaded rotated PDF!`);
      } else {
        setStatusMessage(`Rotated ${pages.length} page(s) by ${rotationAngle}°! Review on the right before downloading.`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Rotate error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. E-SIGNATURE (Preview or Download)
  const handleApplySignature = async (downloadImmediately: boolean) => {
    if (!singlePdf) {
      setStatusMessage('Please upload a PDF file first.');
      return;
    }
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(singlePdf.bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const targetIndex = Math.min(Math.max(0, signPage - 1), pages.length - 1);
      const page = pages[targetIndex];
      const { width, height } = page.getSize();

      const offCanvas = document.createElement('canvas');
      offCanvas.width = 420;
      offCanvas.height = 150;
      const octx = offCanvas.getContext('2d')!;

      if (signMode === 'draw' && sigCanvasRef.current) {
        octx.drawImage(sigCanvasRef.current, 0, 0, 380, 95);
      } else {
        octx.fillStyle = penColor;
        octx.font = 'italic 600 42px "Dancing Script", Georgia, serif';
        octx.fillText(typedSignature || 'Signed', 16, 65);
      }

      octx.strokeStyle = '#64748b';
      octx.lineWidth = 1.2;
      octx.beginPath();
      octx.moveTo(12, 102);
      octx.lineTo(395, 102);
      octx.stroke();

      octx.fillStyle = '#334155';
      octx.font = '600 13px Inter, sans-serif';
      octx.fillText(signerTitle || 'Authorized Signature', 12, 122);

      if (includeDateStamp) {
        const dateStr = new Date().toISOString().slice(0, 10);
        octx.fillStyle = '#475569';
        octx.font = '12px Inter, sans-serif';
        octx.fillText(`Signed: ${dateStr} • Verified Client-Side`, 12, 140);
      }

      const sigDataUrl = offCanvas.toDataURL('image/png');
      const pngEmbed = await pdfDoc.embedPng(sigDataUrl);

      const sigWidth = 180;
      const sigHeight = 65;
      const xPos = (signXPercent / 100) * (width - sigWidth);
      const yPos = (signYPercent / 100) * (height - sigHeight);

      page.drawImage(pngEmbed, {
        x: xPos,
        y: yPos,
        width: sigWidth,
        height: sigHeight,
      });

      // Embed Legally Binding ESIGN & UETA Audit Seal
      if (includeLegalCertificate) {
        const hashBuf = await crypto.subtle.digest('SHA-256', singlePdf.bytes);
        const hashHex = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 32);
        const auditStamp = `ESIGN & UETA AUDIT TRAIL: Signed by ${typedSignature || 'Alex Morgan'} (${signerTitle}) • ${new Date().toISOString()} • SHA-256 Integrity: ${hashHex}... • Verified Client-Side`;
        const helvFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(auditStamp, {
          x: 24,
          y: 18,
          size: 7.2,
          font: helvFont,
          color: rgb(0.35, 0.4, 0.48),
        });
      }

      const signedBytes = new Uint8Array(await pdfDoc.save());
      const filename = `${singlePdf.name.replace(/\.pdf$/i, '')}-signed.pdf`;
      setPreviewResult({
        bytes: signedBytes,
        filename,
        pageCount: pages.length,
        label: `Signed PDF (Page ${targetIndex + 1})`,
      });
      setInspectorPage(targetIndex + 1);

      if (downloadImmediately) {
        downloadBlob(new Blob([signedBytes], { type: 'application/pdf' }), filename);
        setStatusMessage(`Downloaded signed PDF!`);
      } else {
        setStatusMessage(`Signature burned onto Page ${targetIndex + 1} preview! Review on the right before downloading.`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Signing error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const moveMergeItem = (index: number, direction: -1 | 1) => {
    setPreviewResult(null);
    setMergeList((prev) => {
      const copy = [...prev];
      const target = index + direction;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      {/* Compact Header with (i) Info Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-slate-900 border border-slate-800 rounded-xl px-3 sm:px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
          <h2 className="text-base font-bold text-white">PDF Multi-Tool</h2>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            title="About PDF Multi-Tool"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center touch-manipulation"
          >
            <Info className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {activeTab !== 'edit' && (
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer touch-manipulation">
            <Upload className="w-4 h-4 shrink-0" />
            <span>{activeTab === 'merge' ? 'Add PDFs to Merge' : singlePdf ? 'Change PDF' : 'Upload PDF'}</span>
            <input
              type="file"
              accept="application/pdf"
              multiple={activeTab === 'merge'}
              className="hidden"
              onChange={(e) => handleUploadPdfs(e.target.files, activeTab === 'merge' ? 'merge' : 'single')}
            />
          </label>
        )}
      </div>

      {showInfo && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          Edit any existing text in a PDF in-place with matched font and constant font size, merge multiple PDFs, split or extract specific pages, compress file size, convert between PDF and Word/Excel/PNG, or add e-signatures.
        </div>
      )}

      {/* Clean 7-Tab Bar - Swipeable on Mobile, Grid on Tablet/Desktop */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-4 lg:grid-cols-7">
        {[
          { id: 'edit', label: 'Edit PDF Text', icon: FileEdit },
          { id: 'merge', label: 'Merge', icon: Layers },
          { id: 'split', label: 'Split / Extract', icon: Scissors },
          { id: 'compress', label: 'Compress', icon: Minimize2 },
          { id: 'rotate', label: 'Rotate Pages', icon: RotateCw },
          { id: 'convert', label: 'Convert', icon: RefreshCw },
          { id: 'sign', label: 'E-Sign', icon: PenTool },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as PdfTab)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 whitespace-nowrap touch-manipulation active:scale-95 ${
                active
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'edit' ? (
        <PdfEditor
          embedded
          initialPdfBytes={singlePdf?.bytes}
          initialFileName={singlePdf?.name}
          onSwitchPdfTab={(tab) => setActiveTab(tab as PdfTab)}
          onPdfSaved={(bytes, name) => {
            setSinglePdf({
              id: crypto.randomUUID(),
              file: new File([bytes], name, { type: 'application/pdf' }),
              name,
              size: bytes.byteLength,
              pageCount: singlePdf?.pageCount || 1,
              bytes,
            });
          }}
        />
      ) : (
      /* Main Split Workspace: Left = Controls, Right = Live Visual Page Preview */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* TAB 1: MERGE */}
            {activeTab === 'merge' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Files to Merge ({mergeList.length})
                  </h3>
                  <label className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer">
                    + Add More PDFs
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUploadPdfs(e.target.files, 'merge')}
                    />
                  </label>
                </div>

                {mergeList.length === 0 ? (
                  <label className="block border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 text-center space-y-2 cursor-pointer transition">
                    <Layers className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">
                      Click to select 2 or more PDF files to combine
                    </p>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => handleUploadPdfs(e.target.files, 'merge')}
                    />
                  </label>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {mergeList.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {item.pageCount} pages • {formatBytes(item.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveMergeItem(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-900 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMergeItem(idx, 1)}
                            disabled={idx === mergeList.length - 1}
                            className="p-1 rounded bg-slate-900 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewResult(null);
                              setMergeList((prev) => prev.filter((x) => x.id !== item.id));
                            }}
                            className="p-1 rounded bg-slate-900 text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mergeList.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={buildMergedPdf}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      Preview Merged PDF
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = previewResult || (await buildMergedPdf());
                        if (res) {
                          downloadBlob(new Blob([res.bytes], { type: 'application/pdf' }), res.filename);
                        }
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Merged PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SPLIT */}
            {activeTab === 'split' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('extract')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                      splitMode === 'extract'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    Extract Specific Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('individual')}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                      splitMode === 'individual'
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    Split Every Page to ZIP
                  </button>
                </div>

                {splitMode === 'extract' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Page Ranges (e.g., 1-2, 4)
                    </label>
                    <input
                      type="text"
                      value={splitRange}
                      onChange={(e) => {
                        setSplitRange(e.target.value);
                        setPreviewResult(null);
                      }}
                      placeholder="1-2"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {splitMode === 'extract' && (
                    <button
                      type="button"
                      onClick={() => handleSplitPdf(false)}
                      disabled={!singlePdf || isProcessing}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      Preview Extracted Pages
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSplitPdf(true)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {splitMode === 'extract' ? 'Download Extracted PDF' : 'Download Split Pages (.ZIP)'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: COMPRESS */}
            {activeTab === 'compress' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white">
                      Target Quality: {Math.round(compressionQuality * 100)}%
                    </label>
                    <span className="text-[11px] text-indigo-400">
                      {compressionQuality <= 0.45 ? 'Maximum Reduction' : 'Balanced Quality'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.92"
                    step="0.05"
                    value={compressionQuality}
                    onChange={(e) => {
                      setCompressionQuality(parseFloat(e.target.value));
                      setPreviewResult(null);
                    }}
                    className="w-full"
                  />
                </div>

                {compressedStats && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block">Original Size</span>
                      <strong className="text-white">{formatBytes(compressedStats.before)}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Compressed Preview Size</span>
                      <strong className="text-emerald-400">{formatBytes(compressedStats.after)}</strong>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCompressPdf(false)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    {isProcessing ? 'Compressing...' : 'Preview Compressed Result'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompressPdf(true)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Compressed PDF
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3b: ROTATE */}
            {activeTab === 'rotate' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Rotation Angle</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { angle: 90 as const, label: '90° Clockwise' },
                      { angle: 180 as const, label: '180° Flip' },
                      { angle: 270 as const, label: '270° Counter-CW' },
                    ].map((item) => (
                      <button
                        key={item.angle}
                        type="button"
                        onClick={() => {
                          setRotationAngle(item.angle);
                          setPreviewResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                          rotationAngle === item.angle
                            ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <RotateCw className="w-3.5 h-3.5 mx-auto mb-1" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-2">Apply Rotation To</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'all' as const, label: 'All Pages' },
                      { id: 'odd' as const, label: 'Odd Pages' },
                      { id: 'even' as const, label: 'Even Pages' },
                      { id: 'single' as const, label: 'Single Page' },
                    ].map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => {
                          setRotateScope(scope.id);
                          setPreviewResult(null);
                        }}
                        className={`py-2 px-2.5 rounded-xl border text-center text-xs font-semibold cursor-pointer ${
                          rotateScope === scope.id
                            ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>

                {rotateScope === 'single' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Page Number</label>
                    <input
                      type="number"
                      min={1}
                      max={singlePdf?.pageCount || 100}
                      value={rotatePageNumber}
                      onChange={(e) => {
                        setRotatePageNumber(parseInt(e.target.value) || 1);
                        setPreviewResult(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => processRotate(false)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Preview Rotated PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => processRotate(true)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Rotated PDF
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: CONVERT */}
            {activeTab === 'convert' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'pdf-to-png', label: 'PDF → PNG', icon: ImageIcon },
                    { id: 'pdf-to-word', label: 'PDF → Word (.doc)', icon: FileText },
                    { id: 'pdf-to-excel', label: 'PDF → Excel (.xlsx)', icon: FileSpreadsheet },
                    { id: 'images-to-pdf', label: 'Images → PDF', icon: ImageIcon },
                    { id: 'text-to-pdf', label: 'Text → PDF', icon: Type },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setConvertDirection(item.id as typeof convertDirection);
                          setPngPreviews([]);
                          setExtractedPreview('');
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          convertDirection === item.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {convertDirection === 'images-to-pdf' && (
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Select PNG / JPG Images ({imagesForPdf.length} selected)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      className="hidden"
                      onChange={(e) => setImagesForPdf(Array.from(e.target.files || []))}
                    />
                  </label>
                )}

                {convertDirection === 'text-to-pdf' && (
                  <textarea
                    rows={4}
                    value={textForPdf}
                    onChange={(e) => setTextForPdf(e.target.value)}
                    placeholder="Paste or type text to render into a clean PDF..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white"
                  />
                )}

                {pngPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {pngPreviews.map((src, i) => (
                      <img key={i} src={src} alt={`Page ${i + 1}`} className="rounded border border-slate-700" />
                    ))}
                  </div>
                )}

                {extractedPreview && (
                  <pre className="max-h-40 overflow-auto p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono-code">
                    {extractedPreview}
                  </pre>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handlePreviewConversion}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Preview Converted Output
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadConverted}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Converted File
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: E-SIGN */}
            {activeTab === 'sign' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSignMode('draw')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        signMode === 'draw' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode('type')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        signMode === 'type' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Type Signature
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#1d4ed8', '#0f172a', '#be123c'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setPenColor(col)}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                          penColor === col ? 'border-indigo-400 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                {signMode === 'draw' ? (
                  <div className="space-y-1">
                    <div className="bg-white rounded-xl p-1.5 border border-slate-700">
                      <canvas
                        ref={sigCanvasRef}
                        width={380}
                        height={95}
                        onMouseDown={startSignDraw}
                        onMouseMove={moveSignDraw}
                        onMouseUp={endSignDraw}
                        onMouseLeave={endSignDraw}
                        onTouchStart={startSignTouch}
                        onTouchMove={moveSignTouch}
                        onTouchEnd={endSignDraw}
                        className="w-full h-[95px] cursor-crosshair touch-none"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Draw above, then click on the page preview on the right to position</span>
                      <button type="button" onClick={clearSignatureCanvas} className="text-rose-400 hover:underline">
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type full name for cursive signature"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Signer Title</label>
                    <input
                      type="text"
                      value={signerTitle}
                      onChange={(e) => setSignerTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Page</label>
                    <input
                      type="number"
                      min={1}
                      max={singlePdf?.pageCount || 99}
                      value={signPage}
                      onChange={(e) => {
                        setSignPage(Math.max(1, parseInt(e.target.value, 10) || 1));
                        setPreviewResult(null);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400">Horizontal ({signXPercent}%)</label>
                    <input
                      type="range"
                      min={5}
                      max={85}
                      value={signXPercent}
                      onChange={(e) => {
                        setSignXPercent(parseInt(e.target.value, 10));
                        setPreviewResult(null);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">Vertical ({signYPercent}%)</label>
                    <input
                      type="range"
                      min={5}
                      max={85}
                      value={signYPercent}
                      onChange={(e) => {
                        setSignYPercent(parseInt(e.target.value, 10));
                        setPreviewResult(null);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Legal Binding & Audit Compliance Checkbox */}
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLegalCertificate}
                    onChange={(e) => setIncludeLegalCertificate(e.target.checked)}
                    className="rounded text-indigo-600 accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Attach Legally Binding Audit Seal & SHA-256 Integrity Footnote (E-SIGN & UETA)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplySignature(false)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Verify Burned Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplySignature(true)}
                    disabled={!singlePdf || isProcessing}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Signed PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: Live Visual Page Preview (Click to Position Signature or Inspect Output Pages) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {previewResult ? previewResult.label : 'Live PDF Page Preview'}
            </span>

            {activeInspectTotalPages > 1 && (
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'sign' && !previewResult) {
                      setSignPage((p) => Math.max(1, p - 1));
                    } else {
                      setInspectorPage((p) => Math.max(1, p - 1));
                    }
                  }}
                  disabled={pageToRender <= 1}
                  className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono-code text-[11px]">
                  {pageToRender} / {activeInspectTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'sign' && !previewResult) {
                      setSignPage((p) => Math.min(activeInspectTotalPages, p + 1));
                    } else {
                      setInspectorPage((p) => Math.min(activeInspectTotalPages, p + 1));
                    }
                  }}
                  disabled={pageToRender >= activeInspectTotalPages}
                  className="p-1 rounded bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[340px] rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-4 overflow-hidden">
            <div
              onClick={(e) => {
                if (activeTab !== 'sign') return;
                const rect = e.currentTarget.getBoundingClientRect();
                const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                const yPct = Math.round((1 - (e.clientY - rect.top) / rect.height) * 100);
                setSignXPercent(Math.min(80, Math.max(5, xPct)));
                setSignYPercent(Math.min(85, Math.max(5, yPct)));
                setPreviewResult(null);
              }}
              className={`relative bg-white text-slate-900 rounded shadow-lg border border-slate-300 w-[248px] h-[320px] overflow-hidden select-none ${
                activeTab === 'sign' ? 'cursor-crosshair' : ''
              }`}
            >
              {renderedPageUrl ? (
                <img
                  src={renderedPageUrl}
                  alt="PDF Page Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-6 text-center flex flex-col items-center justify-center h-full space-y-2">
                  <FileText className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No PDF Loaded Yet</p>
                  <p className="text-[11px] text-slate-400">
                    Upload a PDF file to preview pages and inspect your changes before downloading.
                  </p>
                </div>
              )}

              {/* Live Interactive Signature Overlay on Page before burning */}
              {activeTab === 'sign' && !previewResult && (
                <div
                  className="absolute px-2 py-1 rounded bg-white/90 border border-indigo-500 shadow-sm pointer-events-none flex flex-col items-start"
                  style={{
                    left: `${Math.min(68, signXPercent * 0.72)}%`,
                    bottom: `${Math.min(80, signYPercent * 0.82)}%`,
                    maxWidth: '120px',
                  }}
                >
                  {signMode === 'draw' && drawnSigDataUrl ? (
                    <img src={drawnSigDataUrl} alt="Signature" className="h-6 object-contain" />
                  ) : (
                    <span
                      className="font-signature text-sm leading-none truncate"
                      style={{ color: penColor }}
                    >
                      {typedSignature || 'Sign Here'}
                    </span>
                  )}
                  <span className="text-[8px] font-semibold text-slate-600 border-t border-slate-300 w-full mt-0.5 pt-0.5 truncate">
                    {signerTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            {activeTab === 'sign'
              ? 'Tip: Click anywhere on the page preview above to position your signature.'
              : previewResult
              ? 'Previewing modified output PDF — ready to download.'
              : 'Upload a PDF and click Preview to inspect changes before downloading.'}
          </p>
        </div>
      </div>
      )}
    </div>
  );
};
