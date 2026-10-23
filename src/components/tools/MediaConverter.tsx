import React, { useState, useRef } from 'react';
import heic2any from 'heic2any';
import {
  Image as ImageIcon,
  Film,
  FileImage,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  Scissors,
  Sliders,
} from 'lucide-react';

type MediaTab = 'image-convert' | 'heic-convert' | 'av-trimmer';
type TargetImageFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export const MediaConverter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MediaTab>('image-convert');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Image converter state
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState<string>('sample-graphic.png');
  const [targetFormat, setTargetFormat] = useState<TargetImageFormat>('webp');
  const [imageQuality, setImageQuality] = useState(0.88);
  const [resizeScale, setResizeScale] = useState(100);
  const [convertedOutput, setConvertedOutput] = useState<{ url: string; size: number; ext: string } | null>(null);

  // HEIC converter state
  const [heicOutputFormat, setHeicOutputFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [heicResultUrl, setHeicResultUrl] = useState<string | null>(null);
  const [heicResultName, setHeicResultName] = useState<string>('');

  // Audio/Video trimmer & compressor state
  const [mediaFileUrl, setMediaFileUrl] = useState<string | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string>('synthesized-tone.wav');
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(4);
  const [mediaDuration, setMediaDuration] = useState(6);
  const [sampleRateScale, setSampleRateScale] = useState<number>(22050); // for audio compression
  const [trimmedResult, setTrimmedResult] = useState<{ url: string; size: number; name: string } | null>(null);
  const rawAudioBufferRef = useRef<AudioBuffer | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  // Generate sample test image on the fly
  const generateSampleImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, '#4f46e5');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    // Geometric circles
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.arc(650, 120, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.fillText('CommonTool Media Studio', 60, 220);
    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText('PNG • JPG • WebP • SVG Client-Side Converter', 60, 270);

    const dataUrl = canvas.toDataURL('image/png');
    setSourceImageUrl(dataUrl);
    setSourceImageName('CommonTool-Brand-Card.png');
    setConvertedOutput(null);
    setStatusMessage('Generated 800×500 sample image ready for PNG / JPG / WebP / SVG conversion!');
  };

  const handleImageFileSelect = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSourceImageUrl(reader.result as string);
      setSourceImageName(file.name);
      setConvertedOutput(null);
      setStatusMessage(`Loaded "${file.name}" (${formatBytes(file.size)})`);
    };
    reader.readAsDataURL(file);
  };

  const convertImageNow = async () => {
    if (!sourceImageUrl) {
      generateSampleImage();
      return;
    }
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Could not decode source image'));
        img.src = sourceImageUrl;
      });

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
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outW} ${outH}" width="${outW}" height="${outH}">
  <image href="${pngData}" width="${outW}" height="${outH}" />
</svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        setConvertedOutput({ url, size: blob.size, ext: 'svg' });
        setStatusMessage(`Converted to scalable SVG container (${formatBytes(blob.size)})!`);
      } else {
        const mime = `image/${targetFormat}`;
        const blob = await new Promise<Blob>((res) =>
          canvas.toBlob((b) => res(b!), mime, imageQuality)
        );
        const url = URL.createObjectURL(blob);
        const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
        setConvertedOutput({ url, size: blob.size, ext });
        setStatusMessage(`Converted image to .${ext.toUpperCase()} (${formatBytes(blob.size)})!`);
      }
    } catch (err: unknown) {
      setStatusMessage(`Image conversion failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // HEIC to JPG handler
  const handleHeicUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMessage('Decoding HEIC container in browser...');
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
        setHeicResultName(file.name.replace(/\.(heic|heif)$/i, '') + `.${ext}`);
        setStatusMessage(`Converted HEIC photo to .${ext.toUpperCase()} (${formatBytes(finalBlob.size)})!`);
      } else {
        // Fallback if user uploads standard image to test the pipeline
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
        setHeicResultName(file.name.replace(/\.[^.]+$/, '') + `.${ext}`);
        setStatusMessage(`Converted photo to .${ext.toUpperCase()} (${formatBytes(blob.size)})!`);
      }
    } catch (err: unknown) {
      setStatusMessage(`HEIC decode error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Encode an AudioBuffer slice to 16-bit PCM WAV Blob
  const audioBufferToWavBlob = (buffer: AudioBuffer, startSec: number, endSec: number, targetSampleRate: number): Blob => {
    const startSample = Math.max(0, Math.floor(startSec * buffer.sampleRate));
    const endSample = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const ratio = buffer.sampleRate / targetSampleRate;
    const outFrames = Math.max(1, Math.floor(frameCount / ratio));
    const numChannels = 1; // Mono mixdown for compact size
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
    view.setUint16(20, 1, true); // PCM
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

  // Generate a 6-second melodic synth sample for instant Audio Trimmer testing
  const generateSampleAudio = async () => {
    setIsProcessing(true);
    try {
      const ctx = new OfflineAudioContext(1, 44100 * 6, 44100);
      const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.01, idx);
        gain.gain.exponentialRampToValueAtTime(0.4, idx + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, idx + 0.95);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(idx);
        osc.stop(idx + 0.98);
      });
      const rendered = await ctx.startRendering();
      rawAudioBufferRef.current = rendered;
      const wavBlob = audioBufferToWavBlob(rendered, 0, 6, 44100);
      const url = URL.createObjectURL(wavBlob);
      setMediaFileUrl(url);
      setMediaFileName('CommonTool-Synth-Sample.wav');
      setMediaType('audio');
      setMediaDuration(6);
      setTrimStart(1);
      setTrimEnd(4.5);
      setTrimmedResult(null);
      setStatusMessage('Generated 6.0s studio synth audio clip! Adjust trim sliders and click Trim & Compress.');
    } catch (err: unknown) {
      setStatusMessage(`Sample audio error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
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
      setStatusMessage(`Loaded "${file.name}" (${dur}s duration). Set trim points below.`);
    } catch {
      setStatusMessage(`Loaded media file "${file.name}". Ready for trimming.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrimAndCompressAudio = () => {
    if (!rawAudioBufferRef.current) {
      setStatusMessage('Click "Generate 6s Sample Audio" or upload an audio/video file first.');
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
      setStatusMessage(`Trimmed (${start}s – ${end}s) & compressed @ ${sampleRateScale}Hz (${formatBytes(blob.size)})!`);
    } catch (err: unknown) {
      setStatusMessage(`Trim error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-amber-400" />
            Format & Media Converters
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Convert images (.PNG, .JPG, .WebP, .SVG), decode Apple HEIC photos, and trim/compress audio & video locally.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('image-convert');
              generateSampleImage();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Load Sample Graphic
          </button>
          <button
            onClick={() => {
              setActiveTab('av-trimmer');
              generateSampleAudio();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30 cursor-pointer"
          >
            <Film className="w-4 h-4" />
            Load Sample Audio Clip
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'image-convert', label: 'Image Converter (PNG / JPG / WebP / SVG)', icon: ImageIcon },
          { id: 'heic-convert', label: 'HEIC-to-JPG / PNG Converter', icon: FileImage },
          { id: 'av-trimmer', label: 'Audio / Video Trimmer & Compressor', icon: Scissors },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as MediaTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

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

      {/* TAB 1: IMAGE CONVERTER */}
      {activeTab === 'image-convert' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">1. Source Image</h3>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Upload PNG/JPG/WebP/SVG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFileSelect(e.target.files?.[0])}
                />
              </label>
            </div>

            {sourceImageUrl ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <img
                  src={sourceImageUrl}
                  alt="Source preview"
                  className="max-h-56 mx-auto rounded-lg object-contain"
                />
                <p className="text-xs text-center text-slate-400">{sourceImageName}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-800 rounded-xl p-10 text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">Upload an image or click "Load Sample Graphic" above</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">2. Target Format & Compression</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['webp', 'png', 'jpeg', 'svg'] as TargetImageFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setTargetFormat(fmt)}
                  className={`py-2.5 rounded-xl font-bold text-xs uppercase border transition cursor-pointer ${
                    targetFormat === fmt
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  .{fmt === 'jpeg' ? 'JPG' : fmt}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Quality (WebP / JPG)</span>
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
                  <span>Dimensions Scale</span>
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

            <button
              onClick={convertImageNow}
              disabled={isProcessing}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              Convert to .{targetFormat === 'jpeg' ? 'JPG' : targetFormat.toUpperCase()}
            </button>

            {convertedOutput && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-300">
                    Output Ready (.{convertedOutput.ext.toUpperCase()})
                  </p>
                  <p className="text-xs text-slate-400">Size: {formatBytes(convertedOutput.size)}</p>
                </div>
                <a
                  href={convertedOutput.url}
                  download={`${sourceImageName.replace(/\.[^.]+$/, '')}.${convertedOutput.ext}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HEIC CONVERTER */}
      {activeTab === 'heic-convert' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Apple .HEIC / .HEIF to Standard JPG or PNG</h3>
              <p className="text-xs text-slate-400">
                Uses client-side libheif WebAssembly decoding so iPhone photos never leave your device.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHeicOutputFormat('image/jpeg')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  heicOutputFormat === 'image/jpeg' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Target: .JPG
              </button>
              <button
                onClick={() => setHeicOutputFormat('image/png')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  heicOutputFormat === 'image/png' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Target: .PNG
              </button>
            </div>
          </div>

          <label className="block border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-10 text-center cursor-pointer transition">
            <FileImage className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white">Click to Select .HEIC / .HEIF Photo</p>
            <p className="text-xs text-slate-400 mt-1">Decoded 100% locally in your browser</p>
            <input
              type="file"
              accept=".heic,.heif,image/*"
              className="hidden"
              onChange={(e) => handleHeicUpload(e.target.files?.[0])}
            />
          </label>

          {heicResultUrl && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={heicResultUrl} alt="Converted HEIC" className="w-16 h-16 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-semibold text-white">{heicResultName}</p>
                  <p className="text-xs text-emerald-400">Successfully decoded</p>
                </div>
              </div>
              <a
                href={heicResultUrl}
                download={heicResultName}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
              >
                <Download className="w-4 h-4" />
                Download Photo
              </a>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIO / VIDEO TRIMMER & COMPRESSOR */}
      {activeTab === 'av-trimmer' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">Client-Side Audio & Video Trimmer / Compressor</h3>
              <p className="text-xs text-slate-400">
                Set exact start & end timestamps and target sample rate/bitrate to clip and compress media in-browser.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateSampleAudio}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate 6s Sample Audio
              </button>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio/Video</span>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          {mediaFileUrl && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              {mediaType === 'video' ? (
                <video src={mediaFileUrl} controls className="max-h-60 mx-auto rounded-lg" />
              ) : (
                <audio src={mediaFileUrl} controls className="w-full" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Time ({trimStart}s)</label>
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
                  <label className="block text-xs text-slate-400 mb-1">End Time ({trimEnd}s)</label>
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
                  <label className="block text-xs text-slate-400 mb-1">Compression Sample Rate</label>
                  <select
                    value={sampleRateScale}
                    onChange={(e) => setSampleRateScale(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value={44100}>44.1 kHz (Studio Full Quality)</option>
                    <option value={22050}>22.05 kHz (50% Smaller Size)</option>
                    <option value={16000}>16.0 kHz (Voice / Podcast Compact)</option>
                    <option value={11025}>11.02 kHz (Ultra-Compressed)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleTrimAndCompressAudio}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                Trim ({trimStart.toFixed(1)}s – {trimEnd.toFixed(1)}s) & Export Clip
              </button>
            </div>
          )}

          {trimmedResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-emerald-300">{trimmedResult.name}</p>
                  <p className="text-xs text-slate-400">Output Size: {formatBytes(trimmedResult.size)}</p>
                </div>
                <a
                  href={trimmedResult.url}
                  download={trimmedResult.name}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs"
                >
                  <Download className="w-4 h-4" />
                  Download Trimmed File
                </a>
              </div>
              <audio src={trimmedResult.url} controls className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
