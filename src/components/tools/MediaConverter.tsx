import React, { useState, useRef, useEffect } from 'react';
import heic2any from 'heic2any';
import {
  Image as ImageIcon,
  FileImage,
  Upload,
  Download,
  CheckCircle2,
  Scissors,
  Info,
  Eye,
} from 'lucide-react';

type MediaTab = 'image-convert' | 'heic-convert' | 'av-trimmer';
type TargetImageFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export const MediaConverter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MediaTab>('image-convert');
  const [showInfo, setShowInfo] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Image converter state
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState<string>('');
  const [sourceImageSize, setSourceImageSize] = useState<number>(0);
  const [targetFormat, setTargetFormat] = useState<TargetImageFormat>('webp');
  const [imageQuality, setImageQuality] = useState(0.85);
  const [resizeScale, setResizeScale] = useState(100);
  const [convertedOutput, setConvertedOutput] = useState<{
    url: string;
    size: number;
    ext: string;
    width: number;
    height: number;
  } | null>(null);

  // HEIC converter state
  const [heicOutputFormat, setHeicOutputFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [heicResultUrl, setHeicResultUrl] = useState<string | null>(null);
  const [heicResultName, setHeicResultName] = useState<string>('');
  const [heicResultSize, setHeicResultSize] = useState<number>(0);

  // Audio/Video trimmer & compressor state
  const [mediaFileUrl, setMediaFileUrl] = useState<string | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>('');
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(4);
  const [mediaDuration, setMediaDuration] = useState(6);
  const [sampleRateScale, setSampleRateScale] = useState<number>(22050);
  const [trimmedResult, setTrimmedResult] = useState<{ url: string; size: number; name: string } | null>(null);
  const rawAudioBufferRef = useRef<AudioBuffer | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const handleImageFileSelect = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSourceImageUrl(reader.result as string);
      setSourceImageName(file.name);
      setSourceImageSize(file.size);
      setStatusMessage(`Loaded "${file.name}" (${formatBytes(file.size)}). Live preview updated below.`);
    };
    reader.readAsDataURL(file);
  };

  // Automatically generate Live Preview whenever source image, target format, quality, or resize scale changes
  useEffect(() => {
    if (!sourceImageUrl) {
      setConvertedOutput(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('Could not decode image'));
          img.src = sourceImageUrl;
        });
        if (cancelled) return;

        const outW = Math.max(16, Math.round((img.width * resizeScale) / 100));
        const outH = Math.max(16, Math.round((img.height * resizeScale) / 100));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d')!;

        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
        }
        ctx.drawImage(img, 0, 0, outW, outH);

        if (targetFormat === 'svg') {
          const pngData = canvas.toDataURL('image/png');
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outW} ${outH}" width="${outW}" height="${outH}"><image href="${pngData}" width="${outW}" height="${outH}" /></svg>`;
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          if (!cancelled) {
            setConvertedOutput({ url, size: blob.size, ext: 'svg', width: outW, height: outH });
          }
        } else {
          const mime = `image/${targetFormat}`;
          const blob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b!), mime, imageQuality)
          );
          const url = URL.createObjectURL(blob);
          const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
          if (!cancelled) {
            setConvertedOutput({ url, size: blob.size, ext, width: outW, height: outH });
          }
        }
      } catch {
        // ignore decode error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceImageUrl, targetFormat, imageQuality, resizeScale]);

  const handleHeicUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('Decoding photo locally...');
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.heic') || lower.endsWith('.heif') || file.type.includes('heic')) {
        const result = await heic2any({
          blob: file,
          toType: heicOutputFormat,
          quality: 0.9,
        });
        const finalBlob = Array.isArray(result) ? result[0] : result;
        const url = URL.createObjectURL(finalBlob);
        const ext = heicOutputFormat === 'image/jpeg' ? 'jpg' : 'png';
        setHeicResultUrl(url);
        setHeicResultSize(finalBlob.size);
        setHeicResultName(file.name.replace(/\.(heic|heif)$/i, '') + `.${ext}`);
        setStatusMessage(`Preview ready! Review your converted .${ext.toUpperCase()} below before downloading.`);
      } else {
        const bmp = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const blob = await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b!), heicOutputFormat, 0.9)
        );
        const ext = heicOutputFormat === 'image/jpeg' ? 'jpg' : 'png';
        setHeicResultUrl(URL.createObjectURL(blob));
        setHeicResultSize(blob.size);
        setHeicResultName(file.name.replace(/\.[^.]+$/, '') + `.${ext}`);
        setStatusMessage(`Preview ready! Review your converted .${ext.toUpperCase()} below before downloading.`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Decode error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const audioBufferToWavBlob = (
    buffer: AudioBuffer,
    startSec: number,
    endSec: number,
    targetSampleRate: number
  ): Blob => {
    const startSample = Math.max(0, Math.floor(startSec * buffer.sampleRate));
    const endSample = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const ratio = buffer.sampleRate / targetSampleRate;
    const outFrames = Math.max(1, Math.floor(frameCount / ratio));
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = outFrames * blockAlign;
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const chanData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < outFrames; i++) {
      const srcIdx = Math.min(buffer.length - 1, startSample + Math.floor(i * ratio));
      const sample = Math.max(-1, Math.min(1, chanData[srcIdx]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const handleMediaUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      const isVid = file.type.startsWith('video/');
      setMediaType(isVid ? 'video' : 'audio');
      setMediaFileUrl(url);
      setMediaFileName(file.name);
      setTrimmedResult(null);

      const arrayBuf = await file.arrayBuffer();
      const audioCtx = new AudioContext();
      const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
      rawAudioBufferRef.current = decoded;
      const dur = Number(decoded.duration.toFixed(1));
      setMediaDuration(dur);
      setTrimStart(0);
      setTrimEnd(dur);
      setStatusMessage(`Loaded "${file.name}" (${dur}s). Adjust trim sliders and preview your clip.`);
    } catch {
      setStatusMessage(`Loaded "${file.name}".`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrimAndCompressAudio = () => {
    if (!rawAudioBufferRef.current) {
      setStatusMessage('Please upload an audio or video file first.');
      return;
    }
    setIsProcessing(true);
    try {
      const start = Math.min(trimStart, trimEnd - 0.2);
      const end = Math.max(trimEnd, start + 0.2);
      const blob = audioBufferToWavBlob(rawAudioBufferRef.current, start, end, sampleRateScale);
      const url = URL.createObjectURL(blob);
      const outName = mediaFileName.replace(/\.[^.]+$/, '') + `-trimmed-${start}s-${end}s.wav`;
      setTrimmedResult({ url, size: blob.size, name: outName });
      setStatusMessage(
        `Trimmed preview ready (${start}s – ${end}s, ${formatBytes(blob.size)})! Play below to verify before downloading.`
      );
    } catch (err: unknown) {
      setStatusMessage(`Trim error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Header with (i) Info Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-500 shrink-0" />
          <h2 className="text-base font-bold text-white">Format & Media Converter</h2>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            title="About Format & Media Converter"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
          Convert images between PNG, JPG, WebP, and SVG with a live side-by-side preview, decode Apple HEIC photos, or trim and compress audio/video clips locally.
        </div>
      )}

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'image-convert', label: 'Image Converter', icon: ImageIcon },
          { id: 'heic-convert', label: 'HEIC to JPG / PNG', icon: FileImage },
          { id: 'av-trimmer', label: 'Audio / Video Trimmer', icon: Scissors },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as MediaTab)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: IMAGE CONVERTER WITH LIVE BEFORE/AFTER VISUAL PREVIEW */}
      {activeTab === 'image-convert' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Conversion Settings</h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{sourceImageUrl ? 'Change Image' : 'Select Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFileSelect(e.target.files?.[0])}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Target Format</label>
              <div className="grid grid-cols-4 gap-2">
                {(['webp', 'png', 'jpeg', 'svg'] as TargetImageFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 rounded-xl font-bold text-xs uppercase border transition cursor-pointer ${
                      targetFormat === fmt
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    .{fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Quality</span>
                  <span>{Math.round(imageQuality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={imageQuality}
                  onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Resize Scale</span>
                  <span>{resizeScale}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={10}
                  value={resizeScale}
                  onChange={(e) => setResizeScale(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            </div>

            {convertedOutput && (
              <div className="pt-2 space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Original</span>
                    <strong className="text-white">{formatBytes(sourceImageSize)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">
                      Preview (.{convertedOutput.ext.toUpperCase()} • {convertedOutput.width}×{convertedOutput.height})
                    </span>
                    <strong className="text-emerald-400">{formatBytes(convertedOutput.size)}</strong>
                  </div>
                </div>

                <a
                  href={convertedOutput.url}
                  download={`${(sourceImageName || 'image').replace(/\.[^.]+$/, '')}.${convertedOutput.ext}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Converted .{convertedOutput.ext.toUpperCase()}
                </a>
              </div>
            )}
          </div>

          {/* Live Side-by-Side Preview */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Live Converted Preview
            </span>

            {convertedOutput ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 items-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Original</span>
                  <img
                    src={sourceImageUrl!}
                    alt="Original"
                    className="max-h-52 mx-auto rounded object-contain"
                  />
                  <p className="text-[11px] text-slate-400 truncate">{sourceImageName}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-1.5 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    Live .{convertedOutput.ext.toUpperCase()} Preview ({formatBytes(convertedOutput.size)})
                  </span>
                  <img
                    src={convertedOutput.url}
                    alt="Converted Preview"
                    className="max-h-52 mx-auto rounded object-contain"
                  />
                  <p className="text-[11px] text-slate-300">
                    {convertedOutput.width} × {convertedOutput.height} px
                  </p>
                </div>
              </div>
            ) : (
              <label className="flex-1 min-h-[260px] border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-500" />
                <p className="text-xs font-semibold text-slate-300">
                  Click to select an image to preview live conversion
                </p>
                <p className="text-[11px] text-slate-500">Supports PNG, JPG, WebP, and SVG</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFileSelect(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HEIC CONVERTER */}
      {activeTab === 'heic-convert' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Apple .HEIC / .HEIF Photo Decoder</h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHeicOutputFormat('image/jpeg')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  heicOutputFormat === 'image/jpeg' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Output: .JPG
              </button>
              <button
                type="button"
                onClick={() => setHeicOutputFormat('image/png')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  heicOutputFormat === 'image/png' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Output: .PNG
              </button>
            </div>
          </div>

          <label className="block border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition">
            <FileImage className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-white">Select .HEIC or .HEIF Photo to Preview & Convert</p>
            <input
              type="file"
              accept=".heic,.heif,image/*"
              className="hidden"
              onChange={(e) => handleHeicUpload(e.target.files?.[0])}
            />
          </label>

          {heicResultUrl && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{heicResultName}</p>
                  <p className="text-[11px] text-emerald-400">
                    Decoded Preview ({formatBytes(heicResultSize)})
                  </p>
                </div>
                <a
                  href={heicResultUrl}
                  download={heicResultName}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Photo
                </a>
              </div>
              <img
                src={heicResultUrl}
                alt="Decoded HEIC Preview"
                className="max-h-64 mx-auto rounded-lg object-contain border border-slate-800"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIO / VIDEO TRIMMER */}
      {activeTab === 'av-trimmer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Audio & Video Trimmer</h3>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{mediaFileUrl ? 'Change Media File' : 'Upload Audio / Video'}</span>
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => handleMediaUpload(e.target.files?.[0])}
              />
            </label>
          </div>

          {!mediaFileUrl ? (
            <label className="block border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition">
              <Scissors className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">
                Select an audio or video file to trim and preview
              </p>
              <input
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={(e) => handleMediaUpload(e.target.files?.[0])}
              />
            </label>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <p className="text-xs font-semibold text-slate-400">Source Media Player</p>
              {mediaType === 'video' ? (
                <video src={mediaFileUrl} controls className="max-h-56 mx-auto rounded-lg" />
              ) : (
                <audio src={mediaFileUrl} controls className="w-full" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start ({trimStart}s)</label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.5, mediaDuration - 0.5)}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End ({trimEnd}s)</label>
                  <input
                    type="range"
                    min={0.5}
                    max={mediaDuration}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Sample Rate</label>
                  <select
                    value={sampleRateScale}
                    onChange={(e) => setSampleRateScale(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value={44100}>44.1 kHz (Full Quality)</option>
                    <option value={22050}>22.05 kHz (50% Smaller)</option>
                    <option value={16000}>16.0 kHz (Voice Compact)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTrimAndCompressAudio}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Generate Trimmed Preview ({trimStart.toFixed(1)}s – {trimEnd.toFixed(1)}s)
              </button>
            </div>
          )}

          {trimmedResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-400">
                    Trimmed Preview Ready: {trimmedResult.name} ({formatBytes(trimmedResult.size)})
                  </p>
                  <p className="text-[11px] text-slate-400">Listen below to verify before downloading:</p>
                </div>
                <a
                  href={trimmedResult.url}
                  download={trimmedResult.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Trimmed Audio
                </a>
              </div>
              <audio src={trimmedResult.url} controls className="w-full" />
            </div>
          )}
        </div>
      )}

      {statusMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
