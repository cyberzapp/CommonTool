import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Palette,
  Crop,
  Download,
  RefreshCw,
  Copy,
  CheckCircle2,
  Upload,
  Info,
} from 'lucide-react';

type BrandTab = 'qr' | 'palette' | 'cropper';

export const BrandingUtilities: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BrandTab>('qr');
  const [showInfo, setShowInfo] = useState(false);

  // 1. QR Code Generator State
  const [qrText, setQrText] = useState('https://commontool.app');
  const [qrFg, setQrFg] = useState('#1e1b4b');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [qrLogoText, setQrLogoText] = useState('CT');
  const [qrSvgMarkup, setQrSvgMarkup] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const renderQr = async () => {
      try {
        const val = qrText.trim() || 'https://commontool.app';
        if (qrCanvasRef.current) {
          await QRCode.toCanvas(qrCanvasRef.current, val, {
            width: 260,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark: qrFg, light: qrBg },
          });
          // Overlay center badge if provided
          if (qrLogoText.trim()) {
            const ctx = qrCanvasRef.current.getContext('2d')!;
            const s = 54;
            const cx = (260 - s) / 2;
            const cy = (260 - s) / 2;
            ctx.fillStyle = qrBg;
            ctx.fillRect(cx - 4, cy - 4, s + 8, s + 8);
            ctx.fillStyle = qrFg;
            ctx.fillRect(cx, cy, s, s);
            ctx.fillStyle = qrBg;
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(qrLogoText.slice(0, 3), 130, 130);
          }
        }
        const svgStr = await QRCode.toString(val, {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: qrFg, light: qrBg },
        });
        setQrSvgMarkup(svgStr);
      } catch {
        // ignore
      }
    };
    renderQr();
  }, [qrText, qrFg, qrBg, qrLogoText]);

  const downloadQrPng = () => {
    if (!qrCanvasRef.current) return;
    const url = qrCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CommonTool-QRCode.png';
    a.click();
  };

  const downloadQrSvg = () => {
    const blob = new Blob([qrSvgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CommonTool-QRCode.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Color Palette Generator State
  const [baseHue, setBaseHue] = useState(235);
  const [harmonyMode, setHarmonyMode] = useState<'analogous' | 'complementary' | 'triadic' | 'monochromatic'>('analogous');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const hslToHex = (h: number, s: number, l: number): string => {
    const normH = ((h % 360) + 360) % 360;
    const a = (s * Math.min(l, 100 - l)) / 10000;
    const f = (n: number) => {
      const k = (n + normH / 30) % 12;
      const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const generatePalette = (): Array<{ hex: string; name: string }> => {
    if (harmonyMode === 'analogous') {
      return [
        { hex: hslToHex(baseHue - 30, 78, 52), name: 'Primary Warm' },
        { hex: hslToHex(baseHue - 15, 82, 56), name: 'Secondary Accent' },
        { hex: hslToHex(baseHue, 85, 60), name: 'Core Brand' },
        { hex: hslToHex(baseHue + 15, 82, 56), name: 'Interactive Highlight' },
        { hex: hslToHex(baseHue + 30, 75, 45), name: 'Deep Contrast' },
      ];
    }
    if (harmonyMode === 'complementary') {
      return [
        { hex: hslToHex(baseHue, 85, 35), name: 'Brand Dark' },
        { hex: hslToHex(baseHue, 85, 58), name: 'Brand Primary' },
        { hex: hslToHex(baseHue, 65, 82), name: 'Brand Tint' },
        { hex: hslToHex(baseHue + 180, 85, 55), name: 'Complement Accent' },
        { hex: hslToHex(baseHue + 180, 75, 38), name: 'Complement Shade' },
      ];
    }
    if (harmonyMode === 'triadic') {
      return [
        { hex: hslToHex(baseHue, 82, 56), name: 'Triad Primary' },
        { hex: hslToHex(baseHue, 60, 78), name: 'Primary Soft' },
        { hex: hslToHex(baseHue + 120, 78, 50), name: 'Triad Secondary' },
        { hex: hslToHex(baseHue + 240, 82, 58), name: 'Triad Tertiary' },
        { hex: hslToHex(baseHue + 240, 70, 32), name: 'Deep Foundation' },
      ];
    }
    return [
      { hex: hslToHex(baseHue, 80, 22), name: '900 Shade' },
      { hex: hslToHex(baseHue, 82, 38), name: '700 Primary' },
      { hex: hslToHex(baseHue, 85, 55), name: '500 Base' },
      { hex: hslToHex(baseHue, 80, 72), name: '300 Light' },
      { hex: hslToHex(baseHue, 75, 90), name: '100 Surface' },
    ];
  };

  const palette = generatePalette();

  // 3. Social Media Aspect-Ratio Cropper State
  const [cropRatioLabel, setCropRatioLabel] = useState('1:1 Instagram Post');
  const [cropW, setCropW] = useState(1);
  const [cropH, setCropH] = useState(1);
  const [cropZoom, setCropZoom] = useState(100);
  const [cropOffsetX, setCropOffsetX] = useState(50);
  const [cropOffsetY, setCropOffsetY] = useState(50);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);

  const RATIO_PRESETS = [
    { label: '1:1 Instagram Post', w: 1, h: 1 },
    { label: '9:16 Story / Reel / TikTok', w: 9, h: 16 },
    { label: '16:9 YouTube Thumbnail', w: 16, h: 9 },
    { label: '4:5 Portrait Feed', w: 4, h: 5 },
    { label: '1.91:1 LinkedIn / X Card', w: 191, h: 100 },
  ];

  const exportCroppedSocialImage = async () => {
    const outCanvas = document.createElement('canvas');
    const baseHeight = 1080;
    const baseWidth = Math.round((baseHeight * cropW) / cropH);
    outCanvas.width = baseWidth;
    outCanvas.height = baseHeight;
    const ctx = outCanvas.getContext('2d')!;

    if (cropSourceUrl) {
      const img = new Image();
      await new Promise<void>((res) => {
        img.onload = () => res();
        img.src = cropSourceUrl;
      });
      const scale = Math.max(baseWidth / img.width, baseHeight / img.height) * (cropZoom / 100);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = ((baseWidth - drawW) * cropOffsetX) / 100;
      const dy = ((baseHeight - drawH) * cropOffsetY) / 100;
      ctx.drawImage(img, dx, dy, drawW, drawH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
      grad.addColorStop(0, '#6366f1');
      grad.addColorStop(0.5, '#ec4899');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, baseWidth, baseHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cropRatioLabel, baseWidth / 2, baseHeight / 2);
      ctx.font = '32px Inter, sans-serif';
      ctx.fillText(`${baseWidth} × ${baseHeight}px Export`, baseWidth / 2, baseHeight / 2 + 55);
    }

    const url = outCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `CommonTool-Crop-${cropW}x${cropH}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <QrCode className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <h2 className="text-lg font-bold text-white">Branding & Social Media Studio</h2>
          <button
            onClick={() => setShowInfo((v) => !v)}
            aria-label="Toggle tool info"
            className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="About this tool"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            SVG/PNG QR code builder with custom colors & center logo, color palette generator, and social aspect-ratio cropper with live preview.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'qr', label: 'SVG / PNG QR Code Generator', icon: QrCode },
          { id: 'palette', label: 'Color Palette Generator', icon: Palette },
          { id: 'cropper', label: 'Social Aspect-Ratio Cropper', icon: Crop },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as BrandTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. QR CODE GENERATOR */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">URL, vCard, Wi-Fi or Text Payload</label>
              <input
                type="text"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Foreground</label>
                <input
                  type="color"
                  value={qrFg}
                  onChange={(e) => setQrFg(e.target.value)}
                  className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Background</label>
                <input
                  type="color"
                  value={qrBg}
                  onChange={(e) => setQrBg(e.target.value)}
                  className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Center Monogram</label>
                <input
                  type="text"
                  maxLength={3}
                  value={qrLogoText}
                  onChange={(e) => setQrLogoText(e.target.value)}
                  placeholder="CT"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <canvas ref={qrCanvasRef} className="rounded-xl shadow-lg" />
            <div className="flex gap-3">
              <button
                onClick={downloadQrPng}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </button>
              <button
                onClick={downloadQrSvg}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Vector SVG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. COLOR PALETTE GENERATOR */}
      {activeTab === 'palette' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['analogous', 'complementary', 'triadic', 'monochromatic'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setHarmonyMode(m)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                    harmonyMode === m ? 'bg-fuchsia-500 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBaseHue(Math.floor(Math.random() * 360))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Randomize Hue ({baseHue}°)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {palette.map((swatch) => (
              <div
                key={swatch.name}
                onClick={() => {
                  navigator.clipboard.writeText(swatch.hex);
                  setCopiedHex(swatch.hex);
                  setTimeout(() => setCopiedHex(null), 1500);
                }}
                className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer group transition hover:-translate-y-0.5"
              >
                <div className="h-32 w-full" style={{ backgroundColor: swatch.hex }} />
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white font-mono-code">{swatch.hex}</p>
                    <p className="text-[11px] text-slate-400">{swatch.name}</p>
                  </div>
                  {copiedHex === swatch.hex ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SOCIAL MEDIA ASPECT-RATIO CROPPER */}
      {activeTab === 'cropper' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Select Social Preset Ratio</h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCropSourceUrl(URL.createObjectURL(f));
                  }}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setCropRatioLabel(preset.label);
                    setCropW(preset.w);
                    setCropH(preset.h);
                  }}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                    cropRatioLabel === preset.label
                      ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs text-slate-400">Zoom Scale ({cropZoom}%)</label>
              <input
                type="range"
                min={100}
                max={250}
                value={cropZoom}
                onChange={(e) => setCropZoom(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400">Pan X ({cropOffsetX}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cropOffsetX}
                    onChange={(e) => setCropOffsetX(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400">Pan Y ({cropOffsetY}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cropOffsetY}
                    onChange={(e) => setCropOffsetY(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={exportCroppedSocialImage}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export High-Res Cropped PNG
            </button>
          </div>

          <div className="flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-fuchsia-400 shadow-xl flex items-center justify-center"
              style={{
                aspectRatio: `${cropW} / ${cropH}`,
                maxHeight: '280px',
                width: cropW >= cropH ? '280px' : 'auto',
                height: cropH > cropW ? '280px' : 'auto',
                background: cropSourceUrl
                  ? `url(${cropSourceUrl}) ${cropOffsetX}% ${cropOffsetY}% / ${cropZoom}% no-repeat`
                  : 'linear-gradient(135deg, #6366f1, #ec4899, #f59e0b)',
              }}
            >
              {/* Rule of thirds overlay */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/20" />
                ))}
              </div>
              {!cropSourceUrl && (
                <span className="text-xs font-bold text-white bg-slate-950/60 px-3 py-1 rounded-full">
                  {cropRatioLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
