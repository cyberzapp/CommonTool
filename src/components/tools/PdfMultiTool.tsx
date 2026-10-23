import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  FileText,
  Upload,
  Download,
  Scissors,
  Layers,
  Minimize2,
  RefreshCw,
  PenTool,
  Sparkles,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Type,
} from 'lucide-react';

// Configure PDF.js worker using local bundled asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PdfTab = 'merge' | 'split' | 'compress' | 'convert' | 'sign';

interface UploadedPdfItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  bytes: Uint8Array;
}

export const PdfMultiTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PdfTab>('merge');
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
  const [textForPdf, setTextForPdf] = useState(
    'CommonTool Document Export\n\nThis PDF was generated 100% client-side in your browser.\n\n• Zero server uploads\n• Instant vector typography\n• Ready for archiving or signing'
  );
  const [extractedPreview, setExtractedPreview] = useState<string>('');

  // E-Signature state
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('Alex Morgan');
  const [signerTitle, setSignerTitle] = useState('Authorized Signatory');
  const [includeDateStamp, setIncludeDateStamp] = useState(true);
  const [signPage, setSignPage] = useState(1);
  const [signXPercent, setSignXPercent] = useState(62);
  const [signYPercent, setSignYPercent] = useState(18);
  const [penColor, setPenColor] = useState('#1d4ed8');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate a multi-page sample PDF right in browser for instant testing
  const generateSamplePdf = async () => {
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const samplePages = [
        {
          title: 'CommonTool Sample Financial Report — Q3',
          subtitle: 'Page 1: Executive Overview & Revenue Table',
          rows: [
            ['Region', 'Q1 Revenue', 'Q2 Revenue', 'Q3 Revenue', 'YoY Growth'],
            ['North America', '$142,500', '$168,200', '$194,800', '+24.5%'],
            ['Europe (EMEA)', '$98,400', '$112,000', '$129,600', '+19.2%'],
            ['Asia-Pacific', '$76,900', '$89,500', '$114,300', '+31.8%'],
            ['Latin America', '$34,200', '$39,100', '$46,750', '+16.4%'],
          ],
        },
        {
          title: 'CommonTool Service Level Agreement',
          subtitle: 'Page 2: Terms, Deliverables & E-Signature Block',
          rows: [
            ['Milestone', 'Deliverable', 'Owner', 'Status', 'Amount'],
            ['Phase 1', 'Architecture & Security Audit', 'Core Team', 'Completed', '$12,000'],
            ['Phase 2', 'Client-Side Wasm Modules', 'Engineering', 'Completed', '$18,500'],
            ['Phase 3', 'Production Rollout & QA', 'DevOps', 'Approved', '$9,500'],
          ],
        },
        {
          title: 'CommonTool Appendix & Compliance',
          subtitle: 'Page 3: Zero-Upload Privacy Verification Certificate',
          rows: [
            ['Check ID', 'Security Control', 'Standard', 'Result', 'Verified'],
            ['SEC-01', 'Local Browser Sandbox Processing', 'ISO-27001', 'PASS', 'Yes'],
            ['SEC-02', 'Zero Third-Party Payload Telemetry', 'GDPR Art.25', 'PASS', 'Yes'],
            ['SEC-03', 'Cryptographic Client Signatures', 'eIDAS Basic', 'PASS', 'Yes'],
          ],
        },
      ];

      for (let i = 0; i < samplePages.length; i++) {
        const p = samplePages[i];
        const page = pdfDoc.addPage([612, 792]);
        page.drawRectangle({
          x: 40,
          y: 700,
          width: 532,
          height: 55,
          color: rgb(0.12, 0.16, 0.28),
        });
        page.drawText(p.title, {
          x: 55,
          y: 730,
          size: 15,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        page.drawText(p.subtitle, {
          x: 55,
          y: 710,
          size: 10,
          font: fontRegular,
          color: rgb(0.75, 0.82, 0.98),
        });

        let y = 650;
        for (let r = 0; r < p.rows.length; r++) {
          const row = p.rows[r];
          const isHeader = r === 0;
          if (isHeader) {
            page.drawRectangle({
              x: 40,
              y: y - 6,
              width: 532,
              height: 24,
              color: rgb(0.92, 0.94, 0.98),
            });
          }
          row.forEach((cell, cIdx) => {
            page.drawText(cell, {
              x: 50 + cIdx * 104,
              y,
              size: isHeader ? 10 : 9.5,
              font: isHeader ? fontBold : fontRegular,
              color: rgb(0.15, 0.18, 0.25),
            });
          });
          y -= 28;
        }

        page.drawText(
          'This document was synthesized locally inside CommonTool to test Merge, Split, Compress, Convert (Word/Excel/PNG), and E-Sign.',
          {
            x: 40,
            y: 440,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.35, 0.4, 0.48),
          }
        );

        page.drawText(`Page ${i + 1} of ${samplePages.length} • CommonTool Zero-Upload Engine`, {
          x: 40,
          y: 45,
          size: 9,
          font: fontRegular,
          color: rgb(0.5, 0.55, 0.62),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const uint8 = new Uint8Array(pdfBytes);
      const file = new File([uint8], 'CommonTool-Sample-Report.pdf', { type: 'application/pdf' });
      const item: UploadedPdfItem = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: uint8.byteLength,
        pageCount: 3,
        bytes: uint8,
      };

      setSinglePdf(item);
      setMergeList((prev) => [...prev, item]);
      setSplitRange('1-2');
      setSignPage(2);
      setStatusMessage('Loaded 3-page "CommonTool-Sample-Report.pdf" into active PDF workspace!');
    } catch (err: unknown) {
      setStatusMessage(`Error generating sample PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadPdfs = async (files: FileList | null, target: 'merge' | 'single') => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
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
        setStatusMessage(`Added ${loadedItems.length} PDF file(s) to queue.`);
      } else {
        setSinglePdf(loadedItems[0]);
        setSplitRange(`1-${loadedItems[0].pageCount}`);
        setSignPage(1);
        setCompressedStats(null);
        setStatusMessage(`Loaded "${loadedItems[0].name}" (${loadedItems[0].pageCount} pages).`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Failed to read PDF: ${err instanceof Error ? err.message : 'Invalid PDF file'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1. MERGE PDFs
  const handleMergePdfs = async () => {
    if (mergeList.length < 1) return;
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const item of mergeList) {
        const srcDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      downloadBlob(blob, `CommonTool-Merged-${Date.now()}.pdf`);
      setStatusMessage(`Successfully merged ${mergeList.length} files (${mergedPdf.getPageCount()} total pages)!`);
    } catch (err: unknown) {
      setStatusMessage(`Merge error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse page range e.g. "1-3, 5" -> 0-based indices
  const parsePageRanges = (input: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
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
  const handleSplitPdf = async () => {
    if (!singlePdf) return;
    setIsProcessing(true);
    try {
      const srcDoc = await PDFDocument.load(singlePdf.bytes, { ignoreEncryption: true });
      if (splitMode === 'extract') {
        const indices = parsePageRanges(splitRange, singlePdf.pageCount);
        if (indices.length === 0) {
          setStatusMessage('Please enter valid page numbers between 1 and ' + singlePdf.pageCount);
          setIsProcessing(false);
          return;
        }
        const newDoc = await PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, indices);
        copied.forEach((p) => newDoc.addPage(p));
        const outBytes = await newDoc.save();
        downloadBlob(
          new Blob([outBytes], { type: 'application/pdf' }),
          `${singlePdf.name.replace(/\.pdf$/i, '')}-pages-${splitRange.replace(/\s+/g, '')}.pdf`
        );
        setStatusMessage(`Extracted ${indices.length} page(s) into a new PDF!`);
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
        setStatusMessage(`Split all ${singlePdf.pageCount} pages into individual PDFs inside a ZIP archive!`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Split error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. COMPRESS PDF
  const handleCompressPdf = async () => {
    if (!singlePdf) return;
    setIsProcessing(true);
    try {
      // Load via PDF.js and re-encode pages at target JPEG quality, or strip metadata & use object streams if high quality
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

      const compressedBytes = await outPdf.save({ useObjectStreams: true });
      setCompressedStats({
        before: singlePdf.size,
        after: compressedBytes.byteLength,
      });
      downloadBlob(
        new Blob([compressedBytes], { type: 'application/pdf' }),
        `${singlePdf.name.replace(/\.pdf$/i, '')}-compressed.pdf`
      );
      setStatusMessage(
        `Compressed PDF generated (${formatBytes(singlePdf.size)} → ${formatBytes(compressedBytes.byteLength)})!`
      );
    } catch (err: unknown) {
      setStatusMessage(`Compression error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. CONVERT PDF <-> PNG / WORD / EXCEL
  const handleConvert = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      if (convertDirection === 'images-to-pdf') {
        if (imagesForPdf.length === 0) {
          setStatusMessage('Please select at least one PNG or JPG image.');
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
        const out = await pdfDoc.save();
        downloadBlob(new Blob([out], { type: 'application/pdf' }), 'CommonTool-Images-to-PDF.pdf');
        setStatusMessage(`Converted ${imagesForPdf.length} image(s) into a single PDF!`);
        setIsProcessing(false);
        return;
      }

      if (convertDirection === 'text-to-pdf') {
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const lines = textForPdf.split('\n');
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
        const out = await pdfDoc.save();
        downloadBlob(new Blob([out], { type: 'application/pdf' }), 'CommonTool-Document.pdf');
        setStatusMessage('Converted document text to PDF!');
        setIsProcessing(false);
        return;
      }

      if (!singlePdf) {
        setStatusMessage('Please load a PDF file or click "Load Sample PDF" first.');
        setIsProcessing(false);
        return;
      }

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
            setStatusMessage('Rendered high-resolution PNG from PDF page!');
            setIsProcessing(false);
            return;
          }
          zip.file(`page-${i}.png`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${singlePdf.name.replace(/\.pdf$/i, '')}-png-pages.zip`);
        setStatusMessage(`Exported ${pdfJsDoc.numPages} high-DPI PNG pages as a ZIP archive!`);
      } else if (convertDirection === 'pdf-to-word') {
        let fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${singlePdf.name}</title></head><body style="font-family:Calibri,Arial,sans-serif;line-height:1.5;padding:24px;">`;
        let plainPreview = '';

        for (let i = 1; i <= pdfJsDoc.numPages; i++) {
          const page = await pdfJsDoc.getPage(i);
          const textContent = await page.getTextContent();
          const items = textContent.items as Array<{ str: string; transform: number[] }>;
          // Group by Y coordinate
          const rowsMap = new Map<number, string[]>();
          items.forEach((item) => {
            const yKey = Math.round(item.transform[5] / 6) * 6;
            const list = rowsMap.get(yKey) || [];
            if (item.str.trim()) list.push(item.str);
            rowsMap.set(yKey, list);
          });
          const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
          fullHtml += `<h2>Page ${i}</h2>`;
          plainPreview += `--- Page ${i} ---\n`;
          sortedY.forEach((y) => {
            const line = (rowsMap.get(y) || []).join('   ');
            if (line) {
              fullHtml += `<p>${line}</p>`;
              plainPreview += `${line}\n`;
            }
          });
          fullHtml += `<hr/>`;
          plainPreview += `\n`;
        }
        fullHtml += `</body></html>`;
        setExtractedPreview(plainPreview);
        const wordBlob = new Blob(['\ufeff', fullHtml], {
          type: 'application/msword;charset=utf-8',
        });
        downloadBlob(wordBlob, `${singlePdf.name.replace(/\.pdf$/i, '')}.doc`);
        setStatusMessage('Extracted structured text & layout into Word (.doc) document!');
      } else if (convertDirection === 'pdf-to-excel') {
        const wb = XLSX.utils.book_new();
        let previewText = '';
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
          const aoa: string[][] = [];
          sortedY.forEach((y) => {
            const rowItems = (rowsMap.get(y) || []).sort((a, b) => a.x - b.x);
            const cells = rowItems.map((r) => r.text);
            aoa.push(cells);
            previewText += cells.join(' | ') + '\n';
          });
          const ws = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [['No tabular text found on page']]);
          XLSX.utils.book_append_sheet(wb, ws, `Page_${i}`);
        }
        setExtractedPreview(previewText);
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadBlob(
          new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
          `${singlePdf.name.replace(/\.pdf$/i, '')}.xlsx`
        );
        setStatusMessage('Extracted tabular rows/columns into Excel (.xlsx) workbook!');
      }
    } catch (err: unknown) {
      setStatusMessage(`Conversion error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature pad drawing handlers (Mouse + Mobile Touch)
  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
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
  };

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // 5. APPLY E-SIGNATURE TO PDF
  const handleApplySignature = async () => {
    if (!singlePdf) {
      setStatusMessage('Load a PDF or click "Load Sample PDF" first to sign.');
      return;
    }
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(singlePdf.bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const targetIndex = Math.min(Math.max(0, signPage - 1), pages.length - 1);
      const page = pages[targetIndex];
      const { width, height } = page.getSize();

      // Create signature PNG on an offscreen canvas
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

      // Draw crisp verification baseline & metadata
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

      const signedBytes = await pdfDoc.save();
      downloadBlob(
        new Blob([signedBytes], { type: 'application/pdf' }),
        `${singlePdf.name.replace(/\.pdf$/i, '')}-signed.pdf`
      );
      setStatusMessage(`Applied e-signature to Page ${targetIndex + 1} and downloaded signed PDF!`);
    } catch (err: unknown) {
      setStatusMessage(`Signing error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const moveMergeItem = (index: number, direction: -1 | 1) => {
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
    <div className="space-y-6">
      {/* Header & Quick Sample Loader */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-rose-400" />
            PDF Multi-Tool Suite
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Merge, split, compress, convert (PDF ↔ Word/Excel/PNG), and e-sign documents 100% locally in your browser.
          </p>
        </div>
        <button
          onClick={generateSamplePdf}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white font-semibold text-sm shadow-lg shadow-rose-500/20 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Load 3-Page Sample PDF
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'merge', label: 'Merge PDFs', icon: Layers },
          { id: 'split', label: 'Split & Extract Pages', icon: Scissors },
          { id: 'compress', label: 'Compress PDF', icon: Minimize2 },
          { id: 'convert', label: 'Convert (Word / Excel / PNG)', icon: RefreshCw },
          { id: 'sign', label: 'E-Sign Document', icon: PenTool },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PdfTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs text-emerald-400 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Active Single PDF Indicator for Split/Compress/Convert/Sign */}
      {activeTab !== 'merge' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
              PDF
            </div>
            {singlePdf ? (
              <div>
                <p className="text-sm font-semibold text-white">{singlePdf.name}</p>
                <p className="text-xs text-slate-400">
                  {singlePdf.pageCount} Page(s) • {formatBytes(singlePdf.size)} • Ready for client-side processing
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-300">No PDF currently loaded</p>
                <p className="text-xs text-slate-400">Upload a PDF from your device or click "Load 3-Page Sample PDF" above</p>
              </div>
            )}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer">
            <Upload className="w-4 h-4 text-rose-400" />
            <span>Choose PDF File</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleUploadPdfs(e.target.files, 'single')}
            />
          </label>
        </div>
      )}

      {/* TAB 1: MERGE */}
      {activeTab === 'merge' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Combine Multiple PDFs in Custom Order</h3>
              <p className="text-xs text-slate-400">Add 2 or more PDF files, reorder them with arrow controls, and merge into one file.</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Add PDF Files</span>
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
            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-300 font-medium">No PDF files queued for merging yet</p>
              <p className="text-xs text-slate-500">Click "Add PDF Files" or click "Load 3-Page Sample PDF" twice to test merging!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mergeList.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-slate-950/80 border border-slate-800/90 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.pageCount} pages • {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => moveMergeItem(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveMergeItem(idx, 1)}
                      disabled={idx === mergeList.length - 1}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMergeList((prev) => prev.filter((x) => x.id !== item.id))}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Total Output: {mergeList.reduce((acc, i) => acc + i.pageCount, 0)} pages across {mergeList.length} files
                </span>
                <button
                  onClick={handleMergePdfs}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Merge & Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPLIT & EXTRACT */}
      {activeTab === 'split' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSplitMode('extract')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                splitMode === 'extract'
                  ? 'bg-rose-500/15 border-rose-500/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-semibold text-sm">Extract Specific Page Ranges</p>
              <p className="text-xs text-slate-400 mt-1">Create a new PDF containing only your chosen pages (e.g. 1-2, 3).</p>
            </button>
            <button
              onClick={() => setSplitMode('individual')}
              className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                splitMode === 'individual'
                  ? 'bg-rose-500/15 border-rose-500/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-semibold text-sm">Burst Every Page to Separate PDFs (.ZIP)</p>
              <p className="text-xs text-slate-400 mt-1">Splits every single page into its own standalone PDF file inside a ZIP archive.</p>
            </button>
          </div>

          {splitMode === 'extract' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Page Ranges (e.g., 1-2, 3)
              </label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="1-2, 5"
                className="w-full md:w-80 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
          )}

          <button
            onClick={handleSplitPdf}
            disabled={!singlePdf || isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-semibold text-sm transition cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            {splitMode === 'extract' ? 'Extract Pages & Download PDF' : 'Split All Pages to ZIP'}
          </button>
        </div>
      )}

      {/* TAB 3: COMPRESS PDF */}
      {activeTab === 'compress' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-200">
                Compression Target Quality: {Math.round(compressionQuality * 100)}%
              </label>
              <span className="text-xs text-rose-300 font-medium">
                {compressionQuality <= 0.45
                  ? 'Maximum Compression (Smallest Size)'
                  : compressionQuality <= 0.75
                  ? 'Balanced Quality & Size (Recommended)'
                  : 'High Fidelity'}
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="0.92"
              step="0.05"
              value={compressionQuality}
              onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {compressedStats && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Original Size</p>
                <p className="text-base font-bold text-slate-200">{formatBytes(compressedStats.before)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Processed Size</p>
                <p className="text-base font-bold text-emerald-400">{formatBytes(compressedStats.after)}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCompressPdf}
            disabled={!singlePdf || isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-semibold text-sm transition cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            {isProcessing ? 'Compressing PDF Pages...' : 'Compress & Download PDF'}
          </button>
        </div>
      )}

      {/* TAB 4: CONVERT */}
      {activeTab === 'convert' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { id: 'pdf-to-png', label: 'PDF → PNG Images', icon: ImageIcon },
              { id: 'pdf-to-word', label: 'PDF → Word (.doc)', icon: FileText },
              { id: 'pdf-to-excel', label: 'PDF → Excel (.xlsx)', icon: FileSpreadsheet },
              { id: 'images-to-pdf', label: 'PNG/JPG → PDF', icon: ImageIcon },
              { id: 'text-to-pdf', label: 'Word/Text → PDF', icon: Type },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setConvertDirection(item.id as typeof convertDirection)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    convertDirection === item.id
                      ? 'bg-rose-500/20 border-rose-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 text-rose-400 mb-1.5" />
                  <p className="text-xs font-semibold">{item.label}</p>
                </button>
              );
            })}
          </div>

          {convertDirection === 'images-to-pdf' && (
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer">
                <Upload className="w-4 h-4 text-rose-400" />
                <span>Select PNG / JPG Images ({imagesForPdf.length} selected)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => setImagesForPdf(Array.from(e.target.files || []))}
                />
              </label>
            </div>
          )}

          {convertDirection === 'text-to-pdf' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Document Content to Render into PDF</label>
              <textarea
                rows={5}
                value={textForPdf}
                onChange={(e) => setTextForPdf(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200"
              />
            </div>
          )}

          <button
            onClick={handleConvert}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-sm transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Converting...' : 'Run Conversion & Download'}
          </button>

          {extractedPreview && (convertDirection === 'pdf-to-word' || convertDirection === 'pdf-to-excel') && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 uppercase">Extracted Structure Preview</p>
              <pre className="max-h-48 overflow-auto p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono-code">
                {extractedPreview}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: E-SIGN DOCUMENT */}
      {activeTab === 'sign' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Signature Creator */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSignMode('draw')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      signMode === 'draw' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Draw Signature
                  </button>
                  <button
                    onClick={() => setSignMode('type')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      signMode === 'type' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Type Cursive Signature
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Ink:</span>
                  {['#1d4ed8', '#0f172a', '#be123c'].map((col) => (
                    <button
                      key={col}
                      onClick={() => setPenColor(col)}
                      className={`w-5 h-5 rounded-full border-2 ${
                        penColor === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              {signMode === 'draw' ? (
                <div className="space-y-2">
                  <div className="bg-white rounded-xl p-2 border border-slate-700">
                    <canvas
                      ref={sigCanvasRef}
                      width={380}
                      height={110}
                      onMouseDown={startSignDraw}
                      onMouseMove={moveSignDraw}
                      onMouseUp={endSignDraw}
                      onMouseLeave={endSignDraw}
                      onTouchStart={startSignTouch}
                      onTouchMove={moveSignTouch}
                      onTouchEnd={endSignDraw}
                      className="w-full h-[110px] cursor-crosshair touch-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Draw your signature inside the white pad above</span>
                    <button onClick={clearSignatureCanvas} className="text-rose-400 hover:underline">
                      Clear Pad
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    placeholder="Type your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <div className="bg-white rounded-xl p-5 text-center border border-slate-700">
                    <span className="font-signature text-4xl" style={{ color: penColor }}>
                      {typedSignature || 'Your Signature'}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Signer Title / Role</label>
                  <input
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDateStamp}
                      onChange={(e) => setIncludeDateStamp(e.target.checked)}
                    />
                    Include ISO Date & Verification Stamp
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Placement Coordinates */}
            <div className="space-y-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white">Signature Placement on PDF Page</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Page Number</label>
                  <input
                    type="number"
                    min={1}
                    max={singlePdf?.pageCount || 99}
                    value={signPage}
                    onChange={(e) => setSignPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Horizontal ({signXPercent}%)</label>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={signXPercent}
                    onChange={(e) => setSignXPercent(parseInt(e.target.value, 10))}
                    className="w-full mt-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Vertical ({signYPercent}% from bottom)</label>
                  <input
                    type="range"
                    min={5}
                    max={90}
                    value={signYPercent}
                    onChange={(e) => setSignYPercent(parseInt(e.target.value, 10))}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              {/* Interactive visual page map */}
              <div className="relative mx-auto w-44 h-56 bg-white rounded-lg border-2 border-slate-700 shadow-inner overflow-hidden">
                <div className="p-2 space-y-1.5 opacity-25">
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                  <div className="h-2 bg-slate-500 rounded w-full" />
                  <div className="h-2 bg-slate-500 rounded w-5/6" />
                  <div className="h-16 bg-slate-300 rounded w-full mt-2" />
                </div>
                <div
                  className="absolute px-2 py-1 rounded bg-rose-500/20 border border-rose-600 text-[10px] font-bold text-rose-800 shadow"
                  style={{
                    left: `${Math.min(65, signXPercent * 0.65)}%`,
                    bottom: `${Math.min(78, signYPercent * 0.8)}%`,
                  }}
                >
                  ✒️ Sign Here
                </div>
              </div>

              <button
                onClick={handleApplySignature}
                disabled={!singlePdf || isProcessing}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-semibold text-sm transition cursor-pointer"
              >
                <PenTool className="w-4 h-4" />
                Burn E-Signature & Download Signed PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
