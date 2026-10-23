import React, { useState, useEffect, useRef } from 'react';
import { evaluate, derivative, det, inv, transpose, multiply } from 'mathjs';
import {
  Sigma,
  LineChart,
  Grid,
  ArrowLeftRight,
  Download,
  Info,
} from 'lucide-react';

type MathTab = 'grapher' | 'solver' | 'matrix' | 'units';

export const MathSolver: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MathTab>('grapher');
  const [showInfo, setShowInfo] = useState(false);

  // 1. Function Grapher State
  const [fn1, setFn1] = useState('sin(x) * x');
  const [fn2, setFn2] = useState('0.25 * x^2 - 3');
  const [xRange, setXRange] = useState(10);
  const [cursorInfo, setCursorInfo] = useState<string>('Hover over graph to inspect (x, y) coordinates');
  const graphCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (activeTab !== 'grapher' || !graphCanvasRef.current) return;
    const canvas = graphCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    const xMin = -xRange;
    const xMax = xRange;
    const yMin = -xRange * (H / W);
    const yMax = xRange * (H / W);

    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toScreenY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const step = xRange <= 5 ? 1 : xRange <= 15 ? 2 : 5;
    for (let gx = Math.ceil(xMin / step) * step; gx <= xMax; gx += step) {
      const sx = toScreenX(gx);
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, H);
      ctx.stroke();
    }
    for (let gy = Math.ceil(yMin / step) * step; gy <= yMax; gy += step) {
      const sy = toScreenY(gy);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8;
    const zeroX = toScreenX(0);
    const zeroY = toScreenY(0);
    ctx.beginPath();
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, H);
    ctx.moveTo(0, zeroY);
    ctx.lineTo(W, zeroY);
    ctx.stroke();

    const plotExpression = (expr: string, strokeColor: string) => {
      if (!expr.trim()) return;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= W; px += 2) {
        const xVal = xMin + (px / W) * (xMax - xMin);
        try {
          const yVal = Number(evaluate(expr, { x: xVal }));
          if (Number.isFinite(yVal) && Math.abs(yVal) < 1e4) {
            const py = toScreenY(yVal);
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            started = false;
          }
        } catch {
          started = false;
        }
      }
      ctx.stroke();
    };

    plotExpression(fn1, '#38bdf8');
    plotExpression(fn2, '#f43f5e');
  }, [activeTab, fn1, fn2, xRange]);

  const handleGraphMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const xVal = -xRange + rx * (2 * xRange);
    try {
      const y1 = Number(evaluate(fn1, { x: xVal }));
      const y2 = fn2.trim() ? Number(evaluate(fn2, { x: xVal })) : NaN;
      setCursorInfo(
        `x = ${xVal.toFixed(2)}  |  f(x) = ${Number.isFinite(y1) ? y1.toFixed(3) : 'undef'}${
          Number.isFinite(y2) ? `  |  g(x) = ${y2.toFixed(3)}` : ''
        }`
      );
    } catch {
      // ignore
    }
  };

  // 2. Equation Solver & Symbolic Calculus State
  const [quadA, setQuadA] = useState(1);
  const [quadB, setQuadB] = useState(-5);
  const [quadC, setQuadC] = useState(6);
  const [symbolicExpr, setSymbolicExpr] = useState('3*x^3 - 5*x^2 + 12*x - 7');
  const [evalPoint, setEvalPoint] = useState(2);

  const solveQuadratic = () => {
    if (quadA === 0) {
      return quadB !== 0 ? `Linear Root: x = ${(-quadC / quadB).toFixed(4)}` : 'Degenerate equation';
    }
    const disc = quadB * quadB - 4 * quadA * quadC;
    if (disc > 0) {
      const r1 = (-quadB + Math.sqrt(disc)) / (2 * quadA);
      const r2 = (-quadB - Math.sqrt(disc)) / (2 * quadA);
      return `Δ = ${disc.toFixed(2)} (> 0, Two Real Roots): x₁ = ${r1.toFixed(4)},  x₂ = ${r2.toFixed(4)}`;
    }
    if (disc === 0) {
      const r = -quadB / (2 * quadA);
      return `Δ = 0 (Repeated Real Root): x = ${r.toFixed(4)}`;
    }
    const realPart = (-quadB / (2 * quadA)).toFixed(3);
    const imagPart = (Math.sqrt(-disc) / (2 * quadA)).toFixed(3);
    return `Δ = ${disc.toFixed(2)} (< 0, Complex Conjugate Roots): x = ${realPart} ± ${imagPart}i`;
  };

  let symbolicDerivStr = '';
  let symbolicValueAtPoint = '';
  try {
    const d = derivative(symbolicExpr, 'x');
    symbolicDerivStr = d.toString();
    const fVal = evaluate(symbolicExpr, { x: evalPoint });
    const dVal = d.evaluate({ x: evalPoint });
    symbolicValueAtPoint = `f(${evalPoint}) = ${fVal},   f'(${evalPoint}) = ${dVal}`;
  } catch {
    symbolicDerivStr = 'Invalid expression syntax';
  }

  // 3. Matrix Calculator State (2x2)
  const [matA, setMatA] = useState<number[][]>([
    [4, 7],
    [2, 6],
  ]);
  const [matB, setMatB] = useState<number[][]>([
    [1, 3],
    [5, 2],
  ]);

  let detA = 0;
  let invA: number[][] | null = null;
  let prodAB: number[][] = [
    [0, 0],
    [0, 0],
  ];
  const transA = transpose(matA);
  try {
    detA = Number(det(matA));
    if (Math.abs(detA) > 1e-9) {
      invA = inv(matA) as number[][];
    }
    prodAB = multiply(matA, matB) as number[][];
  } catch {
    // ignore
  }

  // 4. Unit Converter State
  const [unitCategory, setUnitCategory] = useState<'length' | 'mass' | 'temperature' | 'data'>('length');
  const [unitValue, setUnitValue] = useState<number>(100);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <Sigma className="w-5 h-5 text-cyan-400 shrink-0" />
          <h2 className="text-lg font-bold text-white">Math & Scientific Solver / Grapher</h2>
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
            Interactive multi-function grapher, quadratic & symbolic calculus solver, matrix calculator, and unit converter.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'grapher', label: 'Interactive Function Grapher', icon: LineChart },
          { id: 'solver', label: 'Equation & Derivative Solver', icon: Sigma },
          { id: 'matrix', label: 'Matrix Operations', icon: Grid },
          { id: 'units', label: 'Scientific Unit Converter', icon: ArrowLeftRight },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as MathTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. FUNCTION GRAPHER */}
      {activeTab === 'grapher' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="lg:col-span-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-sky-400 mb-1">Function f(x) — Cyan Curve</label>
              <input
                type="text"
                value={fn1}
                onChange={(e) => setFn1(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-sky-500/40 text-sm text-white font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1">Function g(x) — Rose Curve</label>
              <input
                type="text"
                value={fn2}
                onChange={(e) => setFn2(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-500/40 text-sm text-white font-mono-code"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Domain Zoom ([-{xRange}, +{xRange}])</label>
              <input
                type="range"
                min={2}
                max={30}
                value={xRange}
                onChange={(e) => setXRange(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 pt-2">
              <p className="text-xs text-slate-400 font-semibold">Quick Function Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Damped Sine', f: 'sin(x) * exp(-0.15*abs(x))', g: 'cos(x)' },
                  { label: 'Parabola & Line', f: '0.3*x^2 - 4', g: '0.8*x + 1' },
                  { label: 'Cubic Wave', f: '0.1*x^3 - x', g: 'sin(2*x)*2' },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setFn1(p.f);
                      setFn2(p.g);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-cyan-500/40 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                if (!graphCanvasRef.current) return;
                const a = document.createElement('a');
                a.href = graphCanvasRef.current.toDataURL('image/png');
                a.download = 'CommonTool-Function-Graph.png';
                a.click();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Graph PNG
            </button>
          </div>

          <div className="lg:col-span-8 space-y-2">
            <canvas
              ref={graphCanvasRef}
              width={680}
              height={380}
              onMouseMove={handleGraphMouseMove}
              className="w-full rounded-xl border border-slate-800 cursor-crosshair"
            />
            <p className="text-xs font-mono-code text-cyan-300 text-center">{cursorInfo}</p>
          </div>
        </div>
      )}

      {/* 2. EQUATION & SYMBOLIC SOLVER */}
      {activeTab === 'solver' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Quadratic Solver (ax² + bx + c = 0)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">a</label>
                <input
                  type="number"
                  value={quadA}
                  onChange={(e) => setQuadA(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">b</label>
                <input
                  type="number"
                  value={quadB}
                  onChange={(e) => setQuadB(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">c</label>
                <input
                  type="number"
                  value={quadC}
                  onChange={(e) => setQuadC(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-cyan-300 font-mono-code">
              {solveQuadratic()}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Symbolic Derivative & Evaluator</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Expression f(x)</label>
                <input
                  type="text"
                  value={symbolicExpr}
                  onChange={(e) => setSymbolicExpr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono-code"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Evaluate at x =</label>
                <input
                  type="number"
                  value={evalPoint}
                  onChange={(e) => setEvalPoint(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono-code text-xs">
              <p className="text-slate-400">
                Symbolic Derivative d/dx: <span className="text-emerald-400 font-bold">{symbolicDerivStr}</span>
              </p>
              <p className="text-cyan-300">{symbolicValueAtPoint}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. MATRIX CALCULATOR */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Input 2×2 Matrices A & B</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-cyan-400 mb-2 font-bold">Matrix A</p>
                <div className="grid grid-cols-2 gap-2">
                  {matA.map((row, r) =>
                    row.map((val, c) => (
                      <input
                        key={`a-${r}-${c}`}
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const next = matA.map((rw) => [...rw]);
                          next[r][c] = parseFloat(e.target.value) || 0;
                          setMatA(next);
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-center text-white text-sm font-mono-code"
                      />
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-indigo-400 mb-2 font-bold">Matrix B</p>
                <div className="grid grid-cols-2 gap-2">
                  {matB.map((row, r) =>
                    row.map((val, c) => (
                      <input
                        key={`b-${r}-${c}`}
                        type="number"
                        value={val}
                        onChange={(e) => {
                          const next = matB.map((rw) => [...rw]);
                          next[r][c] = parseFloat(e.target.value) || 0;
                          setMatB(next);
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-center text-white text-sm font-mono-code"
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono-code">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 mb-1">det(A) & Trace(A)</p>
              <p className="text-base font-bold text-cyan-300">det(A) = {detA.toFixed(2)}</p>
              <p className="text-slate-300">tr(A) = {(matA[0][0] + matA[1][1]).toFixed(2)}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 mb-1">Transpose Aᵀ</p>
              <p className="text-white">
                [{transA[0][0]}, {transA[0][1]}]
              </p>
              <p className="text-white">
                [{transA[1][0]}, {transA[1][1]}]
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 mb-1">Product A × B</p>
              <p className="text-emerald-400">
                [{prodAB[0][0]}, {prodAB[0][1]}]
              </p>
              <p className="text-emerald-400">
                [{prodAB[1][0]}, {prodAB[1][1]}]
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 mb-1">Inverse A⁻¹</p>
              {invA ? (
                <>
                  <p className="text-indigo-300">
                    [{invA[0][0].toFixed(2)}, {invA[0][1].toFixed(2)}]
                  </p>
                  <p className="text-indigo-300">
                    [{invA[1][0].toFixed(2)}, {invA[1][1].toFixed(2)}]
                  </p>
                </>
              ) : (
                <p className="text-rose-400">Singular (det = 0)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SCIENTIFIC UNIT CONVERTER */}
      {activeTab === 'units' && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {(['length', 'mass', 'temperature', 'data'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setUnitCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase cursor-pointer ${
                  unitCategory === cat ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="max-w-xs">
            <label className="block text-xs text-slate-400 mb-1">
              Input Value ({unitCategory === 'length' ? 'Meters' : unitCategory === 'mass' ? 'Kilograms' : unitCategory === 'temperature' ? 'Celsius °C' : 'Megabytes MB'})
            </label>
            <input
              type="number"
              value={unitValue}
              onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {unitCategory === 'length' &&
              [
                { label: 'Kilometers (km)', v: (unitValue / 1000).toFixed(4) },
                { label: 'Feet (ft)', v: (unitValue * 3.28084).toFixed(3) },
                { label: 'Inches (in)', v: (unitValue * 39.3701).toFixed(2) },
                { label: 'Miles (mi)', v: (unitValue * 0.000621371).toFixed(5) },
              ].map((u) => (
                <div key={u.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">{u.label}</p>
                  <p className="text-lg font-bold text-cyan-300 font-mono-code mt-1">{u.v}</p>
                </div>
              ))}
            {unitCategory === 'mass' &&
              [
                { label: 'Grams (g)', v: (unitValue * 1000).toFixed(1) },
                { label: 'Pounds (lb)', v: (unitValue * 2.20462).toFixed(3) },
                { label: 'Ounces (oz)', v: (unitValue * 35.274).toFixed(2) },
                { label: 'Metric Tons (t)', v: (unitValue / 1000).toFixed(4) },
              ].map((u) => (
                <div key={u.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">{u.label}</p>
                  <p className="text-lg font-bold text-cyan-300 font-mono-code mt-1">{u.v}</p>
                </div>
              ))}
            {unitCategory === 'temperature' &&
              [
                { label: 'Fahrenheit (°F)', v: ((unitValue * 9) / 5 + 32).toFixed(2) },
                { label: 'Kelvin (K)', v: (unitValue + 273.15).toFixed(2) },
                { label: 'Rankine (°R)', v: (((unitValue + 273.15) * 9) / 5).toFixed(2) },
                { label: 'Celsius (°C)', v: unitValue.toFixed(2) },
              ].map((u) => (
                <div key={u.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">{u.label}</p>
                  <p className="text-lg font-bold text-cyan-300 font-mono-code mt-1">{u.v}</p>
                </div>
              ))}
            {unitCategory === 'data' &&
              [
                { label: 'Kilobytes (KB)', v: (unitValue * 1024).toFixed(0) },
                { label: 'Gigabytes (GB)', v: (unitValue / 1024).toFixed(4) },
                { label: 'Terabytes (TB)', v: (unitValue / (1024 * 1024)).toFixed(6) },
                { label: 'Megabits (Mb)', v: (unitValue * 8).toFixed(1) },
              ].map((u) => (
                <div key={u.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">{u.label}</p>
                  <p className="text-lg font-bold text-cyan-300 font-mono-code mt-1">{u.v}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
