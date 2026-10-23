import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Binary,
  Braces,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

type SecTab = 'password' | 'base64' | 'json';

export const PrivacySecurity: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SecTab>('password');
  const [showInfo, setShowInfo] = useState(false);

  // 1. Cryptographic Password Generator
  const [pwLength, setPwLength] = useState(20);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [generatedPw, setGeneratedPw] = useState('');
  const [copiedPw, setCopiedPw] = useState(false);

  const generatePassword = () => {
    let pool = '';
    if (useUpper) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (useLower) pool += 'abcdefghijkmnopqrstuvwxyz';
    if (useNumbers) pool += '23456789';
    if (useSymbols) pool += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!pool) pool = 'abcdefghijkmnopqrstuvwxyz23456789';

    const rand = new Uint32Array(pwLength);
    crypto.getRandomValues(rand);
    let out = '';
    for (let i = 0; i < pwLength; i++) {
      out += pool[rand[i] % pool.length];
    }
    setGeneratedPw(out);
  };

  useEffect(() => {
    generatePassword();
  }, [pwLength, useUpper, useLower, useNumbers, useSymbols]);

  const poolSize =
    (useUpper ? 24 : 0) + (useLower ? 25 : 0) + (useNumbers ? 8 : 0) + (useSymbols ? 26 : 0) || 33;
  const entropyBits = Math.round(pwLength * Math.log2(poolSize));

  // 2. UTF-8 Safe Base64 Encoder/Decoder & SHA-256 Hash
  const [b64Plain, setB64Plain] = useState('CommonTool Zero-Upload Privacy Payload 🔒');
  const [b64Encoded, setB64Encoded] = useState('');
  const [sha256Hex, setSha256Hex] = useState('');
  const [b64Error, setB64Error] = useState<string | null>(null);

  const encodeUtf8Base64 = (str: string) => {
    try {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      bytes.forEach((b) => (bin += String.fromCharCode(b)));
      return btoa(bin);
    } catch {
      return '';
    }
  };

  const decodeUtf8Base64 = (b64: string) => {
    const bin = atob(b64.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  useEffect(() => {
    setB64Encoded(encodeUtf8Base64(b64Plain));
    setB64Error(null);
    const computeHash = async () => {
      const buf = new TextEncoder().encode(b64Plain);
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setSha256Hex(hex);
    };
    computeHash();
  }, [b64Plain]);

  // 3. JSON Formatter & Validator
  const [jsonInput, setJsonInput] = useState(
    '{"app":"CommonTool","zeroUpload":true,"modules":["PDF","OCR","Invoicing","Math","Security"],"serverCost":0}'
  );
  const [jsonIndent, setJsonIndent] = useState(2);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonFormatted, setJsonFormatted] = useState('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonFormatted(
        jsonIndent === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, jsonIndent)
      );
      setJsonError(null);
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  }, [jsonInput, jsonIndent]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <h2 className="text-lg font-bold text-white">Privacy & Security Utilities</h2>
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
            Web Crypto CSPRNG password generator, UTF-8 Base64 & SHA-256 encoder/decoder, and JSON validator/formatter.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'password', label: 'Strong Password Generator', icon: KeyRound },
          { id: 'base64', label: 'Base64 & SHA-256 Encoder/Decoder', icon: Binary },
          { id: 'json', label: 'JSON Formatter & Validator', icon: Braces },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SecTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. PASSWORD GENERATOR */}
      {activeTab === 'password' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <code className="text-lg sm:text-xl font-bold text-emerald-400 font-mono-code break-all">
              {generatedPw}
            </code>
            <div className="flex gap-2">
              <button
                onClick={generatePassword}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPw);
                  setCopiedPw(true);
                  setTimeout(() => setCopiedPw(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {copiedPw ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedPw ? 'Copied!' : 'Copy Password'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Password Length: {pwLength} characters</span>
                <span className="text-emerald-400 font-bold">{entropyBits} bits of entropy</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={pwLength}
                onChange={(e) => setPwLength(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" checked={useUpper} onChange={(e) => setUseUpper(e.target.checked)} />
                Uppercase (A–Z)
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" checked={useLower} onChange={(e) => setUseLower(e.target.checked)} />
                Lowercase (a–z)
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} />
                Digits (2–9)
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input type="checkbox" checked={useSymbols} onChange={(e) => setUseSymbols(e.target.checked)} />
                Symbols (!@#$...)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 2. BASE64 & SHA-256 */}
      {activeTab === 'base64' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">UTF-8 Plaintext Input</label>
              <textarea
                rows={5}
                value={b64Plain}
                onChange={(e) => setB64Plain(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Base64 Output (Editable to Decode)</label>
              <textarea
                rows={5}
                value={b64Encoded}
                onChange={(e) => {
                  const val = e.target.value;
                  setB64Encoded(val);
                  try {
                    setB64Plain(decodeUtf8Base64(val));
                    setB64Error(null);
                  } catch {
                    setB64Error('Invalid Base64 string');
                  }
                }}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-emerald-300 font-mono-code"
              />
              {b64Error && <p className="text-xs text-rose-400 mt-1">{b64Error}</p>}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 font-semibold">SHA-256 Digest:</span>
            <code className="text-cyan-300 font-mono-code break-all">{sha256Hex}</code>
          </div>
        </div>
      )}

      {/* 3. JSON FORMATTER / VALIDATOR */}
      {activeTab === 'json' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {jsonError ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {jsonError}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid RFC 8259 JSON
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {[
                { label: '2 Spaces', v: 2 },
                { label: '4 Spaces', v: 4 },
                { label: 'Minify', v: 0 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setJsonIndent(opt.v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    jsonIndent === opt.v ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Raw JSON Input</label>
              <textarea
                rows={10}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Formatted / Minified Output</label>
              <textarea
                rows={10}
                readOnly
                value={jsonFormatted}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-emerald-300 font-mono-code"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
