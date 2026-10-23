import React, { useState, useMemo } from 'react';
import {
  Terminal,
  KeySquare,
  Regex,
  Clock,
  Fingerprint,
  Copy,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

type DevTab = 'jwt' | 'regex' | 'cron' | 'uuid';

const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzA5NDEiLCJuYW1lIjoiRWxlbmEgVmFuY2UiLCJyb2xlIjoiarchitectIiwiaWF0IjoxNzYxMjA0MDAwLCJleHAiOjE4OTM0NTYwMDB9.signature_placeholder';

export const DevDiagnostics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DevTab>('jwt');

  // 1. JWT Decoder
  const [jwtToken, setJwtToken] = useState(SAMPLE_JWT);
  const decodedJwt = useMemo(() => {
    try {
      const parts = jwtToken.trim().split('.');
      if (parts.length < 2) return { error: 'JWT must have at least Header and Payload segments' };
      const decodeSegment = (seg: string) => {
        const base64 = seg.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
      };
      const header = decodeSegment(parts[0]);
      const payload = decodeSegment(parts[1]);
      return { header, payload, error: null };
    } catch {
      return { header: null, payload: null, error: 'Malformed Base64URL JSON segment' };
    }
  }, [jwtToken]);

  // 2. Regex Lab
  const [regexPattern, setRegexPattern] = useState('([A-Z]{3}-\\d{3})');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexTestStr, setRegexTestStr] = useState(
    'Invoice INV-204 and Receipt REC-891 were processed alongside ORD-550.'
  );

  const regexMatches = useMemo(() => {
    try {
      const re = new RegExp(regexPattern, regexFlags.includes('g') ? regexFlags : regexFlags + 'g');
      return Array.from(regexTestStr.matchAll(re)).map((m) => ({
        fullMatch: m[0],
        index: m.index ?? 0,
        groups: m.slice(1),
      }));
    } catch {
      return [];
    }
  }, [regexPattern, regexFlags, regexTestStr]);

  // 3. Cron Explainer
  const [cronExpr, setCronExpr] = useState('*/15 9-17 * * 1-5');
  const explainCron = (expr: string): string => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return 'Standard Cron requires 5 fields: [Minute] [Hour] [Day-of-Month] [Month] [Day-of-Week]';
    const [min, hr, dom, mon, dow] = parts;
    const minDesc =
      min === '*'
        ? 'every minute'
        : min.startsWith('*/')
        ? `every ${min.slice(2)} minutes`
        : `at minute ${min}`;
    const hrDesc =
      hr === '*'
        ? 'of every hour'
        : hr.includes('-')
        ? `between hours ${hr} (24h)`
        : `at hour ${hr}:00`;
    const dowDesc =
      dow === '*'
        ? 'every day of the week'
        : dow === '1-5'
        ? 'Monday through Friday'
        : `on day-of-week ${dow}`;
    return `Runs ${minDesc}, ${hrDesc}, ${dom === '*' ? 'every day of month' : `on day ${dom}`}, ${
      mon === '*' ? 'every month' : `in month ${mon}`
    }, ${dowDesc}.`;
  };

  // 4. Bulk UUID v4 Generator
  const [uuidCount, setUuidCount] = useState(8);
  const [uuids, setUuids] = useState<string[]>(() =>
    Array.from({ length: 8 }, () => crypto.randomUUID())
  );
  const [copiedUuid, setCopiedUuid] = useState(false);

  const regenerateUuids = (count = uuidCount) => {
    setUuids(Array.from({ length: Math.min(50, Math.max(1, count)) }, () => crypto.randomUUID()));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-indigo-400" />
            Developer & Web Diagnostics Suite
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Inspect JWT tokens offline, test Regular Expressions with capture groups, translate Cron schedules, and generate bulk UUIDs.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'jwt', label: 'JWT Token Inspector', icon: KeySquare },
          { id: 'regex', label: 'Regex Tester & Groups', icon: Regex },
          { id: 'cron', label: 'Cron Schedule Explainer', icon: Clock },
          { id: 'uuid', label: 'Bulk UUID v4 Generator', icon: Fingerprint },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as DevTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'jwt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Encoded JWT Token (Never leaves browser)
            </label>
            <textarea
              rows={8}
              value={jwtToken}
              onChange={(e) => setJwtToken(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 font-mono-code break-all"
            />
          </div>
          <div className="space-y-3">
            {decodedJwt.error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
                {decodedJwt.error}
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Header (Algorithm & Type)</p>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-400 font-mono-code overflow-auto">
                    {JSON.stringify(decodedJwt.header, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-1">Payload Claims</p>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono-code overflow-auto">
                    {JSON.stringify(decodedJwt.payload, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'regex' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Regular Expression Pattern</label>
              <input
                type="text"
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Flags</label>
              <input
                type="text"
                value={regexFlags}
                onChange={(e) => setRegexFlags(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono-code"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Test Subject String</label>
            <textarea
              rows={3}
              value={regexTestStr}
              onChange={(e) => setRegexTestStr(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 font-mono-code"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400">
              Matched Tokens ({regexMatches.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {regexMatches.map((m, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code"
                >
                  <span className="font-bold text-emerald-400">{m.fullMatch}</span>
                  <span className="text-slate-500 ml-2">@idx {m.index}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cron' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">5-Field Cron Expression</label>
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono-code"
            />
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm font-medium text-emerald-400">
            {explainCron(cronExpr)}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Every 15m Business Hours', val: '*/15 9-17 * * 1-5' },
              { label: 'Midnight Daily', val: '0 0 * * *' },
              { label: 'Every Monday 8 AM', val: '0 8 * * 1' },
              { label: '1st of Month', val: '0 0 1 * *' },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setCronExpr(p.val)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'uuid' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Quantity:</label>
              <input
                type="number"
                min={1}
                max={50}
                value={uuidCount}
                onChange={(e) => {
                  const c = parseInt(e.target.value, 10) || 1;
                  setUuidCount(c);
                  regenerateUuids(c);
                }}
                className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => regenerateUuids()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(uuids.join('\n'));
                  setCopiedUuid(true);
                  setTimeout(() => setCopiedUuid(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
              >
                {copiedUuid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedUuid ? 'Copied All' : 'Copy All UUIDs'}
              </button>
            </div>
          </div>
          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-200 max-h-64 overflow-auto leading-relaxed">
            {uuids.join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};
