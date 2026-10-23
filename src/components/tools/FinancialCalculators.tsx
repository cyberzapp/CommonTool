import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Percent,
  Target,
  Landmark,
  Info,
} from 'lucide-react';

type CalcTab = 'margin' | 'compound' | 'breakeven' | 'gst';

export const FinancialCalculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CalcTab>('margin');
  const [showInfo, setShowInfo] = useState(false);

  // 1. Profit Margin & Markup
  const [cost, setCost] = useState<number>(65);
  const [revenue, setRevenue] = useState<number>(110);

  const grossProfit = revenue - cost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const markupPercent = cost > 0 ? (grossProfit / cost) * 100 : 0;

  // 2. Compound Interest
  const [principal, setPrincipal] = useState<number>(10000);
  const [monthlyContrib, setMonthlyContrib] = useState<number>(500);
  const [annualRate, setAnnualRate] = useState<number>(8.5);
  const [years, setYears] = useState<number>(10);
  const [compoundFreq, setCompoundFreq] = useState<number>(12);

  const buildCompoundSchedule = () => {
    const r = annualRate / 100;
    const rows: Array<{ year: number; invested: number; balance: number; interest: number }> = [];
    let currentBalance = principal;
    let totalInvested = principal;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        currentBalance += monthlyContrib;
        totalInvested += monthlyContrib;
        currentBalance *= 1 + r / compoundFreq / (12 / compoundFreq);
      }
      rows.push({
        year: y,
        invested: Math.round(totalInvested),
        balance: Math.round(currentBalance),
        interest: Math.round(currentBalance - totalInvested),
      });
    }
    return rows;
  };

  const schedule = buildCompoundSchedule();
  const finalCompound = schedule[schedule.length - 1] || {
    year: 0,
    invested: principal,
    balance: principal,
    interest: 0,
  };

  // 3. Break-Even Point
  const [fixedCosts, setFixedCosts] = useState<number>(24000);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState<number>(18);
  const [pricePerUnit, setPricePerUnit] = useState<number>(50);

  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const contributionRatio = pricePerUnit > 0 ? (contributionMargin / pricePerUnit) * 100 : 0;
  const breakEvenUnits = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : 0;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  // 4. GST / VAT Calculator
  const [gstAmount, setGstAmount] = useState<number>(1000);
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstMode, setGstMode] = useState<'exclusive' | 'inclusive'>('exclusive');

  const netAmount =
    gstMode === 'exclusive' ? gstAmount : gstAmount / (1 + gstRate / 100);
  const gstTaxValue =
    gstMode === 'exclusive' ? (gstAmount * gstRate) / 100 : gstAmount - netAmount;
  const grossWithGst =
    gstMode === 'exclusive' ? gstAmount + gstTaxValue : gstAmount;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <Calculator className="w-5 h-5 text-teal-400 shrink-0" />
          <h2 className="text-lg font-bold text-white">Financial Calculators Suite</h2>
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
            Profit margin & markup, compound interest growth visualizer, break-even analysis, and GST/VAT tax split calculator.
          </p>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'margin', label: 'Profit Margin & Markup', icon: Percent },
          { id: 'compound', label: 'Compound Interest & Growth', icon: TrendingUp },
          { id: 'breakeven', label: 'Break-Even Point', icon: Target },
          { id: 'gst', label: 'GST / VAT Tax Calculator', icon: Landmark },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as CalcTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                active
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. PROFIT MARGIN & MARKUP */}
      {activeTab === 'margin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white">Unit Cost & Selling Price</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cost of Goods / Service ($)</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Selling Price / Revenue ($)</label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Gross Profit</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${grossProfit.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Net Profit Margin</p>
              <p className="text-2xl font-extrabold text-teal-300 mt-1">{profitMargin.toFixed(2)}%</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <p className="text-xs text-slate-400">Markup %</p>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">{markupPercent.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. COMPOUND INTEREST */}
      {activeTab === 'compound' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Initial Principal ($)</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monthly Contribution ($)</label>
              <input
                type="number"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Annual Return (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Time Horizon ({years} yrs)</label>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value, 10))}
                  className="w-full mt-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Compounding Frequency</label>
              <select
                value={compoundFreq}
                onChange={(e) => setCompoundFreq(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              >
                <option value={12}>Monthly (12x/yr)</option>
                <option value={4}>Quarterly (4x/yr)</option>
                <option value={1}>Annually (1x/yr)</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400">Future Value</p>
                <p className="text-lg font-extrabold text-emerald-400">${finalCompound.balance.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400">Total Principal</p>
                <p className="text-lg font-bold text-slate-200">${finalCompound.invested.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-xs text-slate-400">Compound Interest</p>
                <p className="text-lg font-bold text-teal-300">+${finalCompound.interest.toLocaleString()}</p>
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400 mb-3">Growth Trajectory (Principal vs Compound Interest)</p>
              <div className="h-36 flex items-end gap-1.5">
                {schedule.map((row) => {
                  const maxVal = Math.max(1, finalCompound.balance);
                  const totalH = Math.max(6, Math.round((row.balance / maxVal) * 130));
                  const invH = Math.max(3, Math.round((row.invested / maxVal) * 130));
                  return (
                    <div key={row.year} className="flex-1 flex flex-col items-center justify-end group relative">
                      <div
                        className="w-full rounded-t bg-teal-400/80 transition-all"
                        style={{ height: `${totalH}px` }}
                        title={`Year ${row.year}: $${row.balance.toLocaleString()}`}
                      >
                        <div
                          className="w-full bg-indigo-500/80 bottom-0"
                          style={{ height: `${invH}px` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1">Y{row.year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BREAK-EVEN POINT */}
      {activeTab === 'breakeven' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Fixed Costs ($)</label>
              <input
                type="number"
                value={fixedCosts}
                onChange={(e) => setFixedCosts(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Variable Cost Per Unit ($)</label>
              <input
                type="number"
                value={variableCostPerUnit}
                onChange={(e) => setVariableCostPerUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Selling Price Per Unit ($)</label>
              <input
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Break-Even Units</p>
              <p className="text-2xl font-extrabold text-teal-300 mt-1">{breakEvenUnits.toLocaleString()} units</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Break-Even Revenue</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${breakEvenRevenue.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Contribution Margin / Unit</p>
              <p className="text-xl font-bold text-white mt-1">${contributionMargin.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Contribution Margin Ratio</p>
              <p className="text-xl font-bold text-indigo-400 mt-1">{contributionRatio.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. GST / VAT CALCULATOR */}
      {activeTab === 'gst' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setGstMode('exclusive')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  gstMode === 'exclusive' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Add GST/VAT (Tax Exclusive)
              </button>
              <button
                onClick={() => setGstMode('inclusive')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  gstMode === 'inclusive' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                Remove GST/VAT (Tax Inclusive)
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount</label>
              <input
                type="number"
                value={gstAmount}
                onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Quick Tax Slab (%)</label>
              <div className="flex flex-wrap gap-2">
                {[5, 8, 12, 18, 20, 28].map((slab) => (
                  <button
                    key={slab}
                    onClick={() => setGstRate(slab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      gstRate === slab ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {slab}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Net Pre-Tax Amount</p>
              <p className="text-xl font-bold text-white mt-1">${netAmount.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Total GST / VAT ({gstRate}%)</p>
              <p className="text-xl font-bold text-teal-400 mt-1">${gstTaxValue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">CGST / SGST Split ({(gstRate / 2).toFixed(1)}% each)</p>
              <p className="text-base font-semibold text-slate-300 mt-1">
                ${(gstTaxValue / 2).toFixed(2)} + ${(gstTaxValue / 2).toFixed(2)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Gross Final Price</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${grossWithGst.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
