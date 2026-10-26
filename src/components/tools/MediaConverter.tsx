import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import heic2any from 'heic2any';
import JSZip from 'jszip';
import { triggerDownloadWithSuccessPage } from '../../lib/downloadManager';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Crop,
  Layers,
  Music,
  Trash2,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Archive,
  Info,
  Zap,
} from 'lucide-react';

// =========================================================================
// TYPES
// =========================================================================
type Workspace = 'batch' | 'crop' | 'audio';
type OutFormat = 'webp' | 'jpeg' | 'png' | 'tiff' | 'svg';
type ResizeMode = 'none' | 'percent' | 'fit';
type SizeMode = 'quality' | 'target';

interface BatchOutput {
  blob: Blob;
  url: string;
  size: number;
  width: number;
  height: number;
  ext: string;
  quality?: number;
  targetMissed?: boolean;
}

interface BatchItem {
  id: string;
  file: File;
  name: string;
  origSize: number;
  isHeic: boolean;
  thumbUrl: string | null;
  status: 'queued' | 'processing' | 'done' | 'error';
  srcWidth?: number;
  srcHeight?: number;
  out?: BatchOutput;
  error?: string;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

// =========================================================================
// HELPERS
// =========================================================================
const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

const isHeicFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    file.type.includes('heic') ||
    file.type.includes('heif')
  );
};

const isImageFile = (file: File) => file.type.startsWith('image/') || isHeicFile(file);

const extFor = (fmt: OutFormat) => (fmt === 'jpeg' ? 'jpg' : fmt);

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'image';

/** Decodes HEIC/HEIF to PNG via WebAssembly; returns other files untouched. */
async function toDecodableBlob(file: File): Promise<Blob> {
  if (!isHeicFile(file)) return file;
  const res = await heic2any({ blob: file, toType: 'image/png' });
  return Array.isArray(res) ? res[0] : res;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This image could not be decoded by your browser.'));
    img.src = url;
  });
}

/** High-quality downscale: halves repeatedly before the final draw to avoid aliasing. */
function drawResized(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
  fillWhite: boolean
): HTMLCanvasElement {
  let curSource: CanvasImageSource = source;
  let curW = srcW;
  let curH = srcH;

  while (curW / 2 >= outW && curH / 2 >= outH) {
    const step = document.createElement('canvas');
    step.width = Math.round(curW / 2);
    step.height = Math.round(curH / 2);
    const sctx = step.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(curSource, 0, 0, step.width, step.height);
    curSource = step;
    curW = step.width;
    curH = step.height;
  }

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d')!;
  if (fillWhite) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(curSource, 0, 0, outW, outH);
  return out;
}

function canvasToTiffBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const width = canvas.width;
  const height = canvas.height;
  const byteCount = width * height * 4;

  const numTags = 9;
  const ifdOffset = 8;
  const ifdSize = 2 + numTags * 12 + 4;
  const valueDataOffset = ifdOffset + ifdSize;
  const pixelDataOffset = valueDataOffset + 8;
  const totalFileSize = pixelDataOffset + byteCount;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint16(0, 0x4949, true); // Little endian "II"
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  let pos = ifdOffset;
  view.setUint16(pos, numTags, true);
  pos += 2;

  const writeTag = (tag: number, type: number, count: number, val: number) => {
    view.setUint16(pos, tag, true);
    view.setUint16(pos + 2, type, true);
    view.setUint32(pos + 4, count, true);
    view.setUint32(pos + 8, val, true);
    pos += 12;
  };

  writeTag(256, 4, 1, width); // ImageWidth
  writeTag(257, 4, 1, height); // ImageLength
  writeTag(258, 3, 4, valueDataOffset); // BitsPerSample
  writeTag(259, 3, 1, 1); // Compression (None)
  writeTag(262, 3, 1, 2); // Photometric (RGB)
  writeTag(273, 4, 1, pixelDataOffset); // StripOffsets
  writeTag(277, 3, 1, 4); // SamplesPerPixel (RGBA)
  writeTag(278, 4, 1, height); // RowsPerStrip
  writeTag(279, 4, 1, byteCount); // StripByteCounts
  view.setUint32(pos, 0, true);

  view.setUint16(valueDataOffset, 8, true);
  view.setUint16(valueDataOffset + 2, 8, true);
  view.setUint16(valueDataOffset + 4, 8, true);
  view.setUint16(valueDataOffset + 6, 8, true);

  bytes.set(imgData.data, pixelDataOffset);
  return new Blob([buffer], { type: 'image/tiff' });
}

async function encodeCanvas(canvas: HTMLCanvasElement, fmt: OutFormat, quality: number): Promise<Blob> {
  if (fmt === 'tiff') return canvasToTiffBlob(canvas);
  if (fmt === 'svg') {
    // SVG container with an embedded PNG (raster inside SVG — not vector tracing).
    const png = canvas.toDataURL('image/png');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="${canvas.width}" height="${canvas.height}"><image href="${png}" width="${canvas.width}" height="${canvas.height}" /></svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`Your browser cannot encode ${fmt.toUpperCase()}.`))),
      `image/${fmt}`,
      quality
    );
  });
}

/** Binary-searches encoder quality so the output fits under maxBytes (JPG/WebP only). */
async function encodeToTargetSize(
  canvas: HTMLCanvasElement,
  fmt: 'jpeg' | 'webp',
  maxBytes: number
): Promise<{ blob: Blob; quality: number; hit: boolean }> {
  let lo = 0.05;
  let hi = 0.95;
  let best: Blob | null = null;
  let bestQ = lo;
  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2;
    const b = await encodeCanvas(canvas, fmt, q);
    if (b.size <= maxBytes) {
      best = b;
      bestQ = q;
      lo = q;
    } else {
      hi = q;
    }
  }
  if (best) return { blob: best, quality: bestQ, hit: true };
  const floor = await encodeCanvas(canvas, fmt, 0.05);
  return { blob: floor, quality: 0.05, hit: floor.size <= maxBytes };
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = frames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

function downloadBlob(blob: Blob, name: string, originalSize?: number) {
  const url = URL.createObjectURL(blob);
  triggerDownloadWithSuccessPage({
    fileBlobUrl: url,
    fileName: name,
    fileSize: blob.size,
    toolId: 'media-converter',
    toolTitle: 'Media & Image Converter Studio',
    originalSize: originalSize && originalSize > blob.size ? originalSize : undefined,
    compressedSize: blob.size,
  });
}

// Crop aspect presets
const ASPECT_PRESETS: Array<{ id: string; label: string; hint: string; ratio: number | null }> = [
  { id: 'free', label: 'Free', hint: 'Any shape', ratio: null },
  { id: '1:1', label: '1:1', hint: 'Square / profile', ratio: 1 },
  { id: '4:5', label: '4:5', hint: 'Instagram post', ratio: 4 / 5 },
  { id: '16:9', label: '16:9', hint: 'YouTube / slides', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', hint: 'Story / Reel', ratio: 9 / 16 },
  { id: '1.91:1', label: '1.91:1', hint: 'Link preview / OG', ratio: 1.91 },
  { id: '3:2', label: '3:2', hint: 'Photo print', ratio: 3 / 2 },
  { id: 'passport', label: '35×45', hint: 'Passport photo', ratio: 35 / 45 },
];

// =========================================================================
// COMPONENT
// =========================================================================
export const MediaConverter: React.FC = () => {
  const [workspace, setWorkspace] = useState<Workspace>('batch');

  // =======================================================================
  // WORKSPACE 1: BATCH CONVERT & COMPRESS
  // =======================================================================
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const [outFormat, setOutFormat] = useState<OutFormat>('webp');
  const [quality, setQuality] = useState(0.82);
  const [sizeMode, setSizeMode] = useState<SizeMode>('quality');
  const [targetKB, setTargetKB] = useState(200);
  const [allowDownscaleForTarget, setAllowDownscaleForTarget] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('none');
  const [resizePercent, setResizePercent] = useState(50);
  const [maxW, setMaxW] = useState(1920);
  const [maxH, setMaxH] = useState(1920);

  const itemsRef = useRef<BatchItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => {
        if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
        if (it.out) URL.revokeObjectURL(it.out.url);
      });
    };
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(isImageFile);
    if (incoming.length === 0) return;
    const newItems: BatchItem[] = incoming.map((file) => {
      const heic = isHeicFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        origSize: file.size,
        isHeic: heic,
        thumbUrl: heic ? null : URL.createObjectURL(file),
        status: 'queued',
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  // Paste images from clipboard while on the batch workspace
  useEffect(() => {
    if (workspace !== 'batch') return;
    const onPaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [workspace, addFiles]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.thumbUrl) URL.revokeObjectURL(target.thumbUrl);
      if (target?.out) URL.revokeObjectURL(target.out.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    items.forEach((it) => {
      if (it.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
      if (it.out) URL.revokeObjectURL(it.out.url);
    });
    setItems([]);
  };

  // Any settings change invalidates finished results so users never download stale output
  useEffect(() => {
    setItems((prev) =>
      prev.some((i) => i.status === 'done' || i.status === 'error')
        ? prev.map((i) => {
            if (i.status !== 'done' && i.status !== 'error') return i;
            if (i.out) URL.revokeObjectURL(i.out.url);
            return { ...i, status: 'queued', out: undefined, error: undefined };
          })
        : prev
    );
  }, [outFormat, quality, sizeMode, targetKB, allowDownscaleForTarget, resizeMode, resizePercent, maxW, maxH]);

  const targetSupported = outFormat === 'jpeg' || outFormat === 'webp';

  const processOne = async (item: BatchItem): Promise<Partial<BatchItem>> => {
    const decodable = await toDecodableBlob(item.file);
    const srcUrl = URL.createObjectURL(decodable);
    try {
      const img = await loadImage(srcUrl);
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      let outW = srcW;
      let outH = srcH;
      if (resizeMode === 'percent') {
        outW = Math.max(1, Math.round((srcW * resizePercent) / 100));
        outH = Math.max(1, Math.round((srcH * resizePercent) / 100));
      } else if (resizeMode === 'fit') {
        const scale = Math.min(1, maxW / srcW, maxH / srcH);
        outW = Math.max(1, Math.round(srcW * scale));
        outH = Math.max(1, Math.round(srcH * scale));
      }

      const fillWhite = outFormat === 'jpeg';
      let canvas = drawResized(img, srcW, srcH, outW, outH, fillWhite);
      let blob: Blob;
      let usedQuality: number | undefined = quality;
      let targetMissed = false;

      if (sizeMode === 'target' && targetSupported) {
        const maxBytes = targetKB * 1024;
        let result = await encodeToTargetSize(canvas, outFormat as 'jpeg' | 'webp', maxBytes);
        let attempts = 0;
        while (!result.hit && allowDownscaleForTarget && attempts < 6 && canvas.width > 64) {
          const nw = Math.round(canvas.width * 0.8);
          const nh = Math.round(canvas.height * 0.8);
          canvas = drawResized(canvas, canvas.width, canvas.height, nw, nh, fillWhite);
          result = await encodeToTargetSize(canvas, outFormat as 'jpeg' | 'webp', maxBytes);
          attempts++;
        }
        blob = result.blob;
        usedQuality = result.quality;
        targetMissed = !result.hit;
      } else {
        blob = await encodeCanvas(canvas, outFormat, quality);
        if (outFormat === 'png' || outFormat === 'tiff' || outFormat === 'svg') usedQuality = undefined;
      }

      const out: BatchOutput = {
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        ext: extFor(outFormat),
        quality: usedQuality,
        targetMissed,
      };

      // HEIC files have no browser thumbnail until decoded — reuse the output preview
      const thumbUrl = item.thumbUrl ?? (outFormat === 'tiff' ? null : URL.createObjectURL(blob));
      return { status: 'done', srcWidth: srcW, srcHeight: srcH, out, thumbUrl };
    } finally {
      URL.revokeObjectURL(srcUrl);
    }
  };

  const runBatch = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    const queue = itemsRef.current.filter((i) => i.status === 'queued' || i.status === 'error');
    for (const item of queue) {
      // Skip items the user removed mid-run
      if (!itemsRef.current.some((i) => i.id === item.id)) continue;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'processing', error: undefined } : i)));
      try {
        const patch = await processOne(item);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: msg } : i)));
      }
    }
    setIsBatchRunning(false);
  };

  const downloadAllZip = async () => {
    const done = items.filter((i) => i.status === 'done' && i.out);
    if (done.length === 0) return;
    if (done.length === 1) {
      const only = done[0];
      downloadBlob(only.out!.blob, `${baseName(only.name)}.${only.out!.ext}`, only.file.size);
      return;
    }
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      let totalOriginalSize = 0;
      for (const it of done) {
        totalOriginalSize += it.file.size;
        let name = `${baseName(it.name)}.${it.out!.ext}`;
        let n = 2;
        while (used.has(name)) name = `${baseName(it.name)}-${n++}.${it.out!.ext}`;
        used.add(name);
        zip.file(name, it.out!.blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `CommonTool-converted-${done.length}-images.zip`, totalOriginalSize);
    } finally {
      setIsZipping(false);
    }
  };

  const batchStats = useMemo(() => {
    const done = items.filter((i) => i.status === 'done' && i.out);
    const inBytes = done.reduce((s, i) => s + i.origSize, 0);
    const outBytes = done.reduce((s, i) => s + (i.out?.size ?? 0), 0);
    const pending = items.filter((i) => i.status === 'queued' || i.status === 'error').length;
    return {
      doneCount: done.length,
      inBytes,
      outBytes,
      savedPct: inBytes > 0 ? Math.round((1 - outBytes / inBytes) * 100) : 0,
      pending,
    };
  }, [items]);

  // =======================================================================
  // WORKSPACE 2: CROP & RESIZE EDITOR
  // =======================================================================
  const [cropImg, setCropImg] = useState<HTMLImageElement | null>(null);
  const [cropName, setCropName] = useState('');
  const [cropLoading, setCropLoading] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectId, setAspectId] = useState('free');
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [workDims, setWorkDims] = useState({ w: 0, h: 0 });
  const [cropOutFormat, setCropOutFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [cropQuality, setCropQuality] = useState(0.9);
  const [cropOutWidth, setCropOutWidth] = useState<string>('');

  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; start: CropRect } | null>(null);

  const aspectRatio = ASPECT_PRESETS.find((p) => p.id === aspectId)?.ratio ?? null;

  const centeredCropFor = (W: number, H: number, ratio: number | null): CropRect => {
    if (!ratio) return { x: 0, y: 0, w: W, h: H };
    let w = W;
    let h = w / ratio;
    if (h > H) {
      h = H;
      w = h * ratio;
    }
    return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w: Math.round(w), h: Math.round(h) };
  };

  const loadCropFile = async (file?: File) => {
    if (!file) return;
    setCropLoading(true);
    setCropError(null);
    try {
      const decodable = await toDecodableBlob(file);
      const url = URL.createObjectURL(decodable);
      const img = await loadImage(url);
      setCropImg(img);
      setCropName(file.name);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    } catch (err: unknown) {
      setCropError(err instanceof Error ? err.message : String(err));
    } finally {
      setCropLoading(false);
    }
  };

  // Render rotated/flipped working canvas
  useEffect(() => {
    if (!cropImg || !workCanvasRef.current) return;
    const iw = cropImg.naturalWidth;
    const ih = cropImg.naturalHeight;
    const sideways = rotation % 180 !== 0;
    const W = sideways ? ih : iw;
    const H = sideways ? iw : ih;
    const canvas = workCanvasRef.current;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(cropImg, -iw / 2, -ih / 2);
    ctx.restore();
    setWorkDims({ w: W, h: H });
  }, [cropImg, rotation, flipH, flipV]);

  // Reset crop when dimensions or aspect preset change
  useEffect(() => {
    if (workDims.w === 0) return;
    setCrop(centeredCropFor(workDims.w, workDims.h, aspectRatio));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDims.w, workDims.h, aspectId]);

  const onCropPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...crop } };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      const stage = cropStageRef.current;
      if (!drag || !stage || workDims.w === 0) return;
      const rect = stage.getBoundingClientRect();
      const scale = workDims.w / rect.width; // natural px per CSS px
      const dx = (e.clientX - drag.startX) * scale;
      const dy = (e.clientY - drag.startY) * scale;
      const W = workDims.w;
      const H = workDims.h;
      const s = drag.start;
      const MIN = 20;

      if (drag.mode === 'move') {
        setCrop({
          ...s,
          x: Math.round(Math.max(0, Math.min(W - s.w, s.x + dx))),
          y: Math.round(Math.max(0, Math.min(H - s.h, s.y + dy))),
        });
        return;
      }

      const growsLeft = drag.mode === 'nw' || drag.mode === 'sw';
      const growsUp = drag.mode === 'nw' || drag.mode === 'ne';
      const anchorX = growsLeft ? s.x + s.w : s.x;
      const anchorY = growsUp ? s.y + s.h : s.y;
      const maxWAvail = growsLeft ? anchorX : W - anchorX;
      const maxHAvail = growsUp ? anchorY : H - anchorY;

      let nw = growsLeft ? s.w - dx : s.w + dx;
      let nh = growsUp ? s.h - dy : s.h + dy;

      if (aspectRatio) {
        nw = Math.max(MIN, Math.min(nw, maxWAvail, maxHAvail * aspectRatio));
        nh = nw / aspectRatio;
      } else {
        nw = Math.max(MIN, Math.min(nw, maxWAvail));
        nh = Math.max(MIN, Math.min(nh, maxHAvail));
      }

      setCrop({
        x: Math.round(growsLeft ? anchorX - nw : anchorX),
        y: Math.round(growsUp ? anchorY - nh : anchorY),
        w: Math.round(nw),
        h: Math.round(nh),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [workDims, aspectRatio]);

  const cropOutputDims = useMemo(() => {
    const target = parseInt(cropOutWidth, 10);
    if (!target || target <= 0 || crop.w === 0) return { w: crop.w, h: crop.h };
    return { w: target, h: Math.max(1, Math.round((crop.h / crop.w) * target)) };
  }, [cropOutWidth, crop]);

  const exportCrop = async () => {
    if (!workCanvasRef.current || crop.w === 0) return;
    const region = document.createElement('canvas');
    region.width = crop.w;
    region.height = crop.h;
    region.getContext('2d')!.drawImage(workCanvasRef.current, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    const final = drawResized(region, crop.w, crop.h, cropOutputDims.w, cropOutputDims.h, cropOutFormat === 'jpeg');
    const blob = await encodeCanvas(final, cropOutFormat, cropQuality);
    downloadBlob(blob, `${baseName(cropName)}-${cropOutputDims.w}x${cropOutputDims.h}.${extFor(cropOutFormat)}`);
  };

  const pct = (v: number, total: number) => (total > 0 ? `${(v / total) * 100}%` : '0%');

  // =======================================================================
  // WORKSPACE 3: AUDIO TRIMMER (waveform)
  // =======================================================================
  const [audioBuf, setAudioBuf] = useState<AudioBuffer | null>(null);
  const [audioName, setAudioName] = useState('');
  const [audioIsVideo, setAudioIsVideo] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [outRate, setOutRate] = useState(0); // 0 = keep original
  const [forceMono, setForceMono] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [isExportingAudio, setIsExportingAudio] = useState(false);

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playRafRef = useRef<number | null>(null);
  const waveDragRef = useRef<'start' | 'end' | null>(null);

  const peaks = useMemo(() => {
    if (!audioBuf) return null;
    const buckets = 1200;
    const data0 = audioBuf.getChannelData(0);
    const data1 = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : null;
    const per = Math.max(1, Math.floor(data0.length / buckets));
    const out = new Float32Array(buckets * 2);
    for (let b = 0; b < buckets; b++) {
      let min = 1;
      let max = -1;
      const startIdx = b * per;
      const endIdx = Math.min(data0.length, startIdx + per);
      for (let i = startIdx; i < endIdx; i++) {
        const v = data1 ? (data0[i] + data1[i]) / 2 : data0[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      out[b * 2] = min;
      out[b * 2 + 1] = max;
    }
    return out;
  }, [audioBuf]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
      } catch {
        // already stopped
      }
      sourceNodeRef.current = null;
    }
    if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
    playRafRef.current = null;
    setIsPlaying(false);
    setPlayhead(null);
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const loadAudioFile = async (file?: File) => {
    if (!file) return;
    stopPlayback();
    setAudioLoading(true);
    setAudioError(null);
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const arr = await file.arrayBuffer();
      const decoded = await audioCtxRef.current.decodeAudioData(arr.slice(0));
      setAudioBuf(decoded);
      setAudioName(file.name);
      setAudioIsVideo(file.type.startsWith('video/'));
      setTrimStart(0);
      setTrimEnd(Number(decoded.duration.toFixed(2)));
      setFadeIn(0);
      setFadeOut(0);
    } catch {
      setAudioError(
        'Your browser could not decode an audio track from this file. Try MP3, WAV, M4A, OGG, or an MP4/WebM video that contains audio.'
      );
    } finally {
      setAudioLoading(false);
    }
  };

  // Draw waveform
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas || !peaks || !audioBuf) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const dur = audioBuf.duration;
    const buckets = peaks.length / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, W, H);

    const sx = (trimStart / dur) * W;
    const ex = (trimEnd / dur) * W;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.12)';
    ctx.fillRect(sx, 0, ex - sx, H);

    const mid = H / 2;
    for (let b = 0; b < buckets; b++) {
      const x = (b / buckets) * W;
      const inSel = x >= sx && x <= ex;
      ctx.fillStyle = inSel ? '#818cf8' : '#3f3f46';
      const yMin = mid + peaks[b * 2] * mid * 0.92;
      const yMax = mid + peaks[b * 2 + 1] * mid * 0.92;
      ctx.fillRect(x, yMax, Math.max(1, W / buckets), Math.max(1, yMin - yMax));
    }

    const drawHandle = (x: number) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 1, 0, 2, H);
      ctx.fillRect(x - 6, 0, 12, 14);
      ctx.fillRect(x - 6, H - 14, 12, 14);
    };
    drawHandle(sx);
    drawHandle(ex);

    if (playhead !== null) {
      const px = (playhead / dur) * W;
      ctx.fillStyle = '#34d399';
      ctx.fillRect(px - 1, 0, 2, H);
    }
  }, [peaks, audioBuf, trimStart, trimEnd, playhead]);

  const timeFromPointer = (clientX: number) => {
    const canvas = waveCanvasRef.current;
    if (!canvas || !audioBuf) return 0;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Number((frac * audioBuf.duration).toFixed(2));
  };

  const onWavePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!audioBuf) return;
    const t = timeFromPointer(e.clientX);
    const which = Math.abs(t - trimStart) <= Math.abs(t - trimEnd) ? 'start' : 'end';
    waveDragRef.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (which === 'start') setTrimStart(Math.min(t, trimEnd - 0.1));
    else setTrimEnd(Math.max(t, trimStart + 0.1));
  };

  const onWavePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!waveDragRef.current) return;
    const t = timeFromPointer(e.clientX);
    if (waveDragRef.current === 'start') setTrimStart(Math.max(0, Math.min(t, trimEnd - 0.1)));
    else setTrimEnd(Math.min(audioBuf?.duration ?? t, Math.max(t, trimStart + 0.1)));
  };

  const onWavePointerUp = () => {
    waveDragRef.current = null;
  };

  const playSelection = () => {
    if (!audioBuf || !audioCtxRef.current) return;
    stopPlayback();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const dur = Math.max(0.05, trimEnd - trimStart);
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    const gain = ctx.createGain();
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, t0);
    if (fadeIn > 0) gain.gain.linearRampToValueAtTime(1, t0 + Math.min(fadeIn, dur));
    if (fadeOut > 0) {
      gain.gain.setValueAtTime(1, t0 + Math.max(0, dur - fadeOut));
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
    }
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0, trimStart, dur);
    src.onended = () => stopPlayback();
    sourceNodeRef.current = src;
    setIsPlaying(true);

    const tick = () => {
      setPlayhead(trimStart + (ctx.currentTime - t0));
      playRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const exportAudio = async () => {
    if (!audioBuf) return;
    setIsExportingAudio(true);
    try {
      const rate = outRate === 0 ? audioBuf.sampleRate : outRate;
      const channels = forceMono ? 1 : Math.min(2, audioBuf.numberOfChannels);
      const dur = Math.max(0.05, trimEnd - trimStart);
      const frames = Math.max(1, Math.ceil(dur * rate));
      const off = new OfflineAudioContext(channels, frames, rate);
      const src = off.createBufferSource();
      src.buffer = audioBuf;
      const gain = off.createGain();
      gain.gain.setValueAtTime(fadeIn > 0 ? 0 : 1, 0);
      if (fadeIn > 0) gain.gain.linearRampToValueAtTime(1, Math.min(fadeIn, dur));
      if (fadeOut > 0) {
        gain.gain.setValueAtTime(1, Math.max(0, dur - fadeOut));
        gain.gain.linearRampToValueAtTime(0, dur);
      }
      src.connect(gain);
      gain.connect(off.destination);
      src.start(0, trimStart, dur);
      const rendered = await off.startRendering();

      if (normalize) {
        let peak = 0;
        for (let c = 0; c < rendered.numberOfChannels; c++) {
          const d = rendered.getChannelData(c);
          for (let i = 0; i < d.length; i++) {
            const a = Math.abs(d[i]);
            if (a > peak) peak = a;
          }
        }
        if (peak > 0) {
          const g = 0.98 / peak;
          for (let c = 0; c < rendered.numberOfChannels; c++) {
            const d = rendered.getChannelData(c);
            for (let i = 0; i < d.length; i++) d[i] *= g;
          }
        }
      }

      const wav = encodeWav(rendered);
      downloadBlob(wav, `${baseName(audioName)}-${trimStart.toFixed(1)}s-${trimEnd.toFixed(1)}s.wav`);
    } finally {
      setIsExportingAudio(false);
    }
  };

  const estimatedWavBytes = useMemo(() => {
    if (!audioBuf) return 0;
    const rate = outRate === 0 ? audioBuf.sampleRate : outRate;
    const ch = forceMono ? 1 : Math.min(2, audioBuf.numberOfChannels);
    return Math.round(Math.max(0, trimEnd - trimStart) * rate) * ch * 2 + 44;
  }, [audioBuf, outRate, forceMono, trimStart, trimEnd]);

  // =======================================================================
  // RENDER
  // =======================================================================
  const panel = 'bg-zinc-900/90 border border-zinc-800 rounded-2xl';
  const label = 'block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5';
  const seg = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
      active ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
    }`;

  return (
    <div className="space-y-4">
      {/* Studio header */}
      <div className={`${panel} px-4 py-3 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Media & Image Studio</h2>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Files never leave your device
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          {[
            { id: 'batch', label: 'Batch Convert & Compress', icon: Layers },
            { id: 'crop', label: 'Crop & Resize', icon: Crop },
            { id: 'audio', label: 'Audio Trimmer', icon: Music },
          ].map((t) => {
            const Icon = t.icon;
            const active = workspace === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setWorkspace(t.id as Workspace)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  active ? 'bg-zinc-800 text-white shadow-2xs' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* WORKSPACE 1: BATCH                                                  */}
      {/* =================================================================== */}
      {workspace === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Stage */}
          <div className="lg:col-span-8 space-y-3">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`block rounded-2xl border-2 border-dashed text-center cursor-pointer transition ${
                items.length === 0 ? 'p-12' : 'p-4'
              } ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/40'
              }`}
            >
              <Upload className={`mx-auto text-indigo-400 ${items.length === 0 ? 'w-9 h-9 mb-3' : 'w-5 h-5 mb-1'}`} />
              <p className="text-xs font-semibold text-zinc-200">
                {items.length === 0 ? 'Drop images here, click to browse, or paste (⌘V)' : 'Add more images'}
              </p>
              {items.length === 0 && (
                <p className="text-[11px] text-zinc-500 mt-1">
                  JPG, PNG, WebP, GIF, BMP, AVIF and iPhone HEIC/HEIF — many files at once
                </p>
              )}
              <input
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>

            {items.length > 0 && (
              <>
                {/* Summary bar */}
                <div className={`${panel} px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs`}>
                  <div className="flex items-center gap-4 text-zinc-400">
                    <span>
                      <strong className="text-zinc-100">{items.length}</strong> files
                    </span>
                    {batchStats.doneCount > 0 && (
                      <>
                        <span>
                          {formatBytes(batchStats.inBytes)} → <strong className="text-zinc-100">{formatBytes(batchStats.outBytes)}</strong>
                        </span>
                        <span className={batchStats.savedPct >= 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                          {batchStats.savedPct >= 0 ? `${batchStats.savedPct}% smaller` : `${Math.abs(batchStats.savedPct)}% larger`}
                        </span>
                      </>
                    )}
                  </div>
                  <button onClick={clearAll} className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-400 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                  </button>
                </div>

                {/* File list */}
                <div className="space-y-2">
                  {items.map((it) => {
                    const delta = it.out ? Math.round((1 - it.out.size / it.origSize) * 100) : null;
                    return (
                      <div key={it.id} className={`${panel} p-2.5 flex items-center gap-3`}>
                        <div className="w-14 h-14 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                          {it.thumbUrl ? (
                            <img src={it.thumbUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold text-zinc-500">{it.isHeic ? 'HEIC' : 'IMG'}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate">{it.name}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 mt-0.5">
                            <span>{formatBytes(it.origSize)}</span>
                            {it.srcWidth && (
                              <span>
                                {it.srcWidth}×{it.srcHeight}
                              </span>
                            )}
                            {it.out && (
                              <>
                                <span className="text-zinc-300">
                                  → .{it.out.ext.toUpperCase()} {it.out.width}×{it.out.height} • {formatBytes(it.out.size)}
                                </span>
                                {delta !== null && (
                                  <span className={delta >= 0 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                                    {delta >= 0 ? `−${delta}%` : `+${Math.abs(delta)}%`}
                                  </span>
                                )}
                                {it.out.quality !== undefined && sizeMode === 'target' && (
                                  <span className="text-zinc-500">q={Math.round(it.out.quality * 100)}</span>
                                )}
                              </>
                            )}
                          </div>
                          {it.out?.targetMissed && (
                            <p className="text-[11px] text-amber-400 mt-0.5">
                              Could not reach {targetKB} KB — this is the smallest result possible.
                            </p>
                          )}
                          {it.status === 'error' && <p className="text-[11px] text-rose-400 mt-0.5">{it.error}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {it.status === 'queued' && <span className="text-[11px] text-zinc-500">Queued</span>}
                          {it.status === 'processing' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
                          {it.status === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                          {it.status === 'done' && it.out && (
                            <a
                              href={it.out.url}
                              download={`${baseName(it.name)}.${it.out.ext}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-400" />
                              Save
                            </a>
                          )}
                          <button
                            onClick={() => removeItem(it.id)}
                            disabled={it.status === 'processing'}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                            aria-label={`Remove ${it.name}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Settings */}
          <div className="lg:col-span-4">
            <div className={`${panel} p-4 space-y-4 lg:sticky lg:top-20`}>
              <div>
                <span className={label}>Output format</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['webp', 'jpeg', 'png', 'tiff', 'svg'] as OutFormat[]).map((f) => (
                    <button key={f} onClick={() => setOutFormat(f)} className={seg(outFormat === f)}>
                      {extFor(f).toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  {outFormat === 'webp' && 'Best size-to-quality ratio for the web. Keeps transparency.'}
                  {outFormat === 'jpeg' && 'Universal compatibility. Transparent areas become white.'}
                  {outFormat === 'png' && 'Lossless with transparency. Usually larger files.'}
                  {outFormat === 'tiff' && 'Uncompressed TIFF for print and archival. Very large files.'}
                  {outFormat === 'svg' && 'SVG wrapper around the pixels (not vector tracing).'}
                </p>
              </div>

              {(outFormat === 'webp' || outFormat === 'jpeg') && (
                <div>
                  <span className={label}>File size control</span>
                  <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                    <button onClick={() => setSizeMode('quality')} className={seg(sizeMode === 'quality')}>
                      Quality
                    </button>
                    <button onClick={() => setSizeMode('target')} className={seg(sizeMode === 'target')}>
                      Target size
                    </button>
                  </div>
                  {sizeMode === 'quality' ? (
                    <div>
                      <div className="flex justify-between text-xs text-zinc-300 mb-1">
                        <span>Quality</span>
                        <span>{Math.round(quality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.01}
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          value={targetKB}
                          onChange={(e) => setTargetKB(Math.max(5, parseInt(e.target.value, 10) || 5))}
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                        <span className="text-xs text-zinc-400">KB max per image</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[50, 100, 200, 500, 1000].map((kb) => (
                          <button
                            key={kb}
                            onClick={() => setTargetKB(kb)}
                            className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 cursor-pointer"
                          >
                            {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowDownscaleForTarget}
                          onChange={(e) => setAllowDownscaleForTarget(e.target.checked)}
                          className="accent-indigo-500"
                        />
                        Shrink dimensions if quality alone isn't enough
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className={label}>Resize</span>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  <button onClick={() => setResizeMode('none')} className={seg(resizeMode === 'none')}>
                    Original
                  </button>
                  <button onClick={() => setResizeMode('percent')} className={seg(resizeMode === 'percent')}>
                    Percent
                  </button>
                  <button onClick={() => setResizeMode('fit')} className={seg(resizeMode === 'fit')}>
                    Max size
                  </button>
                </div>
                {resizeMode === 'percent' && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Scale</span>
                      <span>{resizePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={200}
                      step={5}
                      value={resizePercent}
                      onChange={(e) => setResizePercent(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
                {resizeMode === 'fit' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="number"
                        min={16}
                        value={maxW}
                        onChange={(e) => setMaxW(Math.max(16, parseInt(e.target.value, 10) || 16))}
                        className="w-20 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        min={16}
                        value={maxH}
                        onChange={(e) => setMaxH(Math.max(16, parseInt(e.target.value, 10) || 16))}
                        className="w-20 px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                      <span>px</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        [3840, 3840, '4K'],
                        [1920, 1920, 'Full HD'],
                        [1280, 1280, 'HD'],
                        [1080, 1080, 'Social'],
                        [800, 800, 'Email'],
                      ].map(([w, h, l]) => (
                        <button
                          key={String(l)}
                          onClick={() => {
                            setMaxW(Number(w));
                            setMaxH(Number(h));
                          }}
                          className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 cursor-pointer"
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500">Keeps aspect ratio. Smaller images are never upscaled.</p>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>Re-encoding removes EXIF metadata, including GPS location, from every output file.</span>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={runBatch}
                  disabled={isBatchRunning || batchStats.pending === 0}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition"
                >
                  {isBatchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isBatchRunning
                    ? 'Processing…'
                    : batchStats.pending > 0
                    ? `Convert ${batchStats.pending} image${batchStats.pending === 1 ? '' : 's'}`
                    : items.length === 0
                    ? 'Add images to start'
                    : 'All images converted'}
                </button>
                <button
                  onClick={downloadAllZip}
                  disabled={batchStats.doneCount === 0 || isZipping}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 text-xs font-bold cursor-pointer transition"
                >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4 text-indigo-400" />}
                  {batchStats.doneCount > 1 ? `Download all (${batchStats.doneCount}) as ZIP` : 'Download result'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* WORKSPACE 2: CROP & RESIZE                                          */}
      {/* =================================================================== */}
      {workspace === 'crop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            {!cropImg ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  loadCropFile(e.dataTransfer.files?.[0]);
                }}
                className="block rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/40 p-16 text-center cursor-pointer transition"
              >
                {cropLoading ? (
                  <Loader2 className="w-9 h-9 mx-auto mb-3 text-indigo-400 animate-spin" />
                ) : (
                  <Crop className="w-9 h-9 mx-auto mb-3 text-indigo-400" />
                )}
                <p className="text-xs font-semibold text-zinc-200">Drop an image or click to open it in the crop editor</p>
                <p className="text-[11px] text-zinc-500 mt-1">HEIC photos are supported</p>
                {cropError && <p className="text-[11px] text-rose-400 mt-2">{cropError}</p>}
                <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => loadCropFile(e.target.files?.[0])} />
              </label>
            ) : (
              <>
                <div className={`${panel} p-4 flex items-center justify-center bg-[repeating-conic-gradient(#18181b_0%_25%,#111113_0%_50%)] bg-size-[20px_20px]`}>
                  <div ref={cropStageRef} className="relative inline-block select-none overflow-hidden touch-none">
                    <canvas ref={workCanvasRef} className="block max-w-full max-h-[560px] w-auto h-auto" />
                    {crop.w > 0 && (
                      <div
                        className="absolute border-2 border-white cursor-move"
                        style={{
                          left: pct(crop.x, workDims.w),
                          top: pct(crop.y, workDims.h),
                          width: pct(crop.w, workDims.w),
                          height: pct(crop.h, workDims.h),
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                        }}
                        onPointerDown={(e) => onCropPointerDown(e, 'move')}
                      >
                        {/* Rule-of-thirds grid */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                        </div>
                        {(['nw', 'ne', 'sw', 'se'] as DragMode[]).map((corner) => (
                          <div
                            key={corner}
                            onPointerDown={(e) => onCropPointerDown(e, corner)}
                            className={`absolute w-4 h-4 bg-white rounded-sm shadow-md ${
                              corner === 'nw'
                                ? '-left-2 -top-2 cursor-nwse-resize'
                                : corner === 'ne'
                                ? '-right-2 -top-2 cursor-nesw-resize'
                                : corner === 'sw'
                                ? '-left-2 -bottom-2 cursor-nesw-resize'
                                : '-right-2 -bottom-2 cursor-nwse-resize'
                            }`}
                          />
                        ))}
                        <div className="absolute -top-7 left-0 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white whitespace-nowrap pointer-events-none">
                          {crop.w} × {crop.h}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${panel} px-3 py-2 flex flex-wrap items-center justify-between gap-2`}>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setRotation((r) => (r + 270) % 360)} className={seg(false)} title="Rotate left">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setRotation((r) => (r + 90) % 360)} className={seg(false)} title="Rotate right">
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setFlipH((v) => !v)} className={seg(flipH)} title="Flip horizontally">
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setFlipV((v) => !v)} className={seg(flipV)} title="Flip vertically">
                      <FlipVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCrop(centeredCropFor(workDims.w, workDims.h, aspectRatio))}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Reset crop
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="truncate max-w-[180px]">{cropName}</span>
                    <span>•</span>
                    <span>
                      {workDims.w}×{workDims.h}
                    </span>
                    <label className="text-indigo-400 hover:underline cursor-pointer">
                      Change
                      <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => loadCropFile(e.target.files?.[0])} />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className={`${panel} p-4 space-y-4 lg:sticky lg:top-20`}>
              <div>
                <span className={label}>Aspect ratio</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASPECT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAspectId(p.id)}
                      disabled={!cropImg}
                      className={`text-left px-2.5 py-2 rounded-lg border transition cursor-pointer disabled:opacity-40 ${
                        aspectId === p.id
                          ? 'bg-indigo-600/15 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">{p.label}</span>
                      <span className="block text-[10px] text-zinc-500">{p.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className={label}>Output width (optional)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={16}
                    placeholder={crop.w ? String(crop.w) : 'Original'}
                    value={cropOutWidth}
                    onChange={(e) => setCropOutWidth(e.target.value)}
                    className="w-28 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                  />
                  <span className="text-xs text-zinc-400">px → final {cropOutputDims.w}×{cropOutputDims.h}</span>
                </div>
              </div>

              <div>
                <span className={label}>Format</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['jpeg', 'png', 'webp'] as const).map((f) => (
                    <button key={f} onClick={() => setCropOutFormat(f)} className={seg(cropOutFormat === f)}>
                      {extFor(f).toUpperCase()}
                    </button>
                  ))}
                </div>
                {cropOutFormat !== 'png' && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Quality</span>
                      <span>{Math.round(cropQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={1}
                      step={0.01}
                      value={cropQuality}
                      onChange={(e) => setCropQuality(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={exportCrop}
                disabled={!cropImg || crop.w === 0}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition"
              >
                <Download className="w-4 h-4" />
                Export {cropOutputDims.w > 0 ? `${cropOutputDims.w}×${cropOutputDims.h}` : ''} .{extFor(cropOutFormat).toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* WORKSPACE 3: AUDIO TRIMMER                                          */}
      {/* =================================================================== */}
      {workspace === 'audio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            {!audioBuf ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  loadAudioFile(e.dataTransfer.files?.[0]);
                }}
                className="block rounded-2xl border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/40 p-16 text-center cursor-pointer transition"
              >
                {audioLoading ? (
                  <Loader2 className="w-9 h-9 mx-auto mb-3 text-indigo-400 animate-spin" />
                ) : (
                  <Music className="w-9 h-9 mx-auto mb-3 text-indigo-400" />
                )}
                <p className="text-xs font-semibold text-zinc-200">Drop an audio file, or a video to pull out its audio track</p>
                <p className="text-[11px] text-zinc-500 mt-1">MP3, WAV, M4A, OGG, FLAC, MP4, WebM</p>
                {audioError && <p className="text-[11px] text-rose-400 mt-2">{audioError}</p>}
                <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => loadAudioFile(e.target.files?.[0])} />
              </label>
            ) : (
              <>
                <div className={`${panel} p-4 space-y-3`}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-100 truncate">{audioName}</p>
                      <p className="text-[11px] text-zinc-400">
                        {formatTime(audioBuf.duration)} • {audioBuf.sampleRate / 1000} kHz •{' '}
                        {audioBuf.numberOfChannels === 1 ? 'Mono' : 'Stereo'}
                      </p>
                    </div>
                    <label className="text-indigo-400 hover:underline cursor-pointer text-[11px] shrink-0">
                      Change file
                      <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => loadAudioFile(e.target.files?.[0])} />
                    </label>
                  </div>

                  <canvas
                    ref={waveCanvasRef}
                    width={1200}
                    height={160}
                    onPointerDown={onWavePointerDown}
                    onPointerMove={onWavePointerMove}
                    onPointerUp={onWavePointerUp}
                    className="w-full h-40 rounded-xl border border-zinc-800 cursor-ew-resize touch-none"
                  />
                  <p className="text-[11px] text-zinc-500">Drag the white handles, or click near either edge to move it.</p>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={isPlaying ? stopPlayback : playSelection}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isPlaying ? 'Stop' : 'Play selection'}
                    </button>

                    <div className="flex items-center gap-3 text-xs text-zinc-300">
                      <label className="flex items-center gap-1.5">
                        Start
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          value={trimStart}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setTrimStart(Math.max(0, Math.min(v, trimEnd - 0.1)));
                          }}
                          className="w-20 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                        />
                      </label>
                      <label className="flex items-center gap-1.5">
                        End
                        <input
                          type="number"
                          step={0.1}
                          value={trimEnd}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setTrimEnd(Math.min(audioBuf.duration, Math.max(v, trimStart + 0.1)));
                          }}
                          className="w-20 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                        />
                      </label>
                      <span className="text-zinc-400">
                        Length <strong className="text-white">{formatTime(trimEnd - trimStart)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {audioIsVideo && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>This is a video file. Only its audio track is trimmed and exported, not the video picture.</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-4">
            <div className={`${panel} p-4 space-y-4 lg:sticky lg:top-20`}>
              <div>
                <span className={label}>Fades</span>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Fade in</span>
                      <span>{fadeIn.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.1}
                      value={fadeIn}
                      disabled={!audioBuf}
                      onChange={(e) => setFadeIn(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 mb-1">
                      <span>Fade out</span>
                      <span>{fadeOut.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.1}
                      value={fadeOut}
                      disabled={!audioBuf}
                      onChange={(e) => setFadeOut(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className={label}>Sample rate</span>
                <select
                  value={outRate}
                  onChange={(e) => setOutRate(parseInt(e.target.value, 10))}
                  disabled={!audioBuf}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                >
                  <option value={0}>Keep original{audioBuf ? ` (${audioBuf.sampleRate / 1000} kHz)` : ''}</option>
                  <option value={48000}>48 kHz (video standard)</option>
                  <option value={44100}>44.1 kHz (CD quality)</option>
                  <option value={22050}>22.05 kHz (smaller)</option>
                  <option value={16000}>16 kHz (voice / speech)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={forceMono} onChange={(e) => setForceMono(e.target.checked)} className="accent-indigo-500" />
                  Convert to mono (half the size)
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} className="accent-indigo-500" />
                  Normalize volume (peak to −0.2 dB)
                </label>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Exports as 16-bit WAV, which plays everywhere. Browsers can't encode MP3 without extra libraries.
                  {audioBuf && (
                    <>
                      {' '}
                      Estimated size: <strong className="text-zinc-200">{formatBytes(estimatedWavBytes)}</strong>.
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={exportAudio}
                disabled={!audioBuf || isExportingAudio}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition"
              >
                {isExportingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export trimmed WAV
              </button>

              {audioBuf && (
                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Resampling and fades are rendered offline at full precision.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
