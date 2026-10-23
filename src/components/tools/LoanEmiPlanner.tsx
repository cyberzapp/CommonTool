import React, { useState } from 'react';
import {
  Landmark,
  Briefcase,
  Download,
} from 'lucide-react';

export const LoanEmiPlanner: React.FC = () => {
  const [mode, setMode] = useState<'emi' | 'freelance'>('emi');

  // Loan / Mortgage EMI State
  const [loanAmount, setLoanAmount] = useState(250000);
  const [interestRate, setInterestRate] = useState(6.75);
  const [tenureYears, setTenureYears] = useState(15);

  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = Math.max(1, tenureYears * 12);
  const emi =
    monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)
      : loanAmount / totalMonths;
  const totalPayable = emi * totalMonths;
  const totalInterest = Math.max(0, totalPayable - loanAmount);

  // Build Yearly Amortization Summary
  const yearlySchedule = (() => {
    let balance = loanAmount;
    const rows: Array<{ year: number; principalPaid: number; interestPaid: number; endingBalance: number }> = [];
    for (let y = 1; y <= tenureYears; y++) {
      let pYear = 0;
      let iYear = 0;
      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break;
        const iMonth = balance * monthlyRate;
        const pMonth = Math.min(balance, emi - iMonth);
        balance = Math.max(0, balance - pMonth);
        pYear += pMonth;
        iYear += iMonth;
      }
      rows.push({
        year: y,
        principalPaid: Math.round(pYear),
        interestPaid: Math.round(iYear),
        endingBalance: Math.round(balance),
      });
    }
    return rows;
  })();

  const exportScheduleCsv = () => {
    const header = 'Year,Principal Paid,Interest Paid,Ending Balance\n';
    const body = yearlySchedule
      .map((r) => `${r.year},${r.principalPaid},${r.interestPaid},${r.endingBalance}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Loan-Amortization-Schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Freelance Hourly Rate Planner
  const [targetSalary, setTargetSalary] = useState(120000);
  const [annualExpenses, setAnnualExpenses] = useState(15000);
  const [taxBufferPercent, setTaxBufferPercent] = useState(28);
  const [billableHoursPerWeek, setBillableHoursPerWeek] = useState(25);
  const [vacationWeeks, setVacationWeeks] = useState(4);

  const workingWeeks = Math.max(1, 52 - vacationWeeks);
  const totalBillableHours = workingWeeks * billableHoursPerWeek;
  const grossRequiredRevenue = (targetSalary + annualExpenses) / Math.max(0.1, 1 - taxBufferPercent / 100);
  const hourlyRate = Math.ceil(grossRequiredRevenue / totalBillableHours);
  const dailyRate = hourlyRate * 8;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-teal-400" />
            Loan EMI Amortization & Consulting Rate Planner
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Calculate mortgage/business loan EMIs with yearly amortization schedules or determine your freelance billable rate.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('emi')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              mode === 'emi' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Loan & Mortgage EMI
          </button>
          <button
            onClick={() => setMode('freelance')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              mode === 'freelance' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            Freelance Hourly Rate
          </button>
        </div>
      </div>

      {mode === 'emi' ? (
        <div className="space-y-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Loan Principal ($)</label>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Annual Interest Rate (%)</label>
              <input
                type="number"
                step="0.05"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Loan Tenure ({tenureYears} Years)</label>
              <input
                type="range"
                min={1}
                max={30}
                value={tenureYears}
                onChange={(e) => setTenureYears(parseInt(e.target.value, 10))}
                className="w-full mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Monthly Payment (EMI)</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${Math.round(emi).toLocaleString()}/mo</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Total Interest Payable</p>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">${Math.round(totalInterest).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Total Repayment</p>
              <p className="text-2xl font-extrabold text-white mt-1">${Math.round(totalPayable).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase text-slate-400">Yearly Amortization Schedule</h3>
              <button
                onClick={exportScheduleCsv}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Schedule (.CSV)
              </button>
            </div>
            <div className="max-h-60 overflow-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Year</th>
                    <th className="py-2 px-3">Principal Paid</th>
                    <th className="py-2 px-3">Interest Paid</th>
                    <th className="py-2 px-3">Ending Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-code">
                  {yearlySchedule.map((row) => (
                    <tr key={row.year}>
                      <td className="py-2 px-3">Year {row.year}</td>
                      <td className="py-2 px-3 text-emerald-400">${row.principalPaid.toLocaleString()}</td>
                      <td className="py-2 px-3 text-amber-400">${row.interestPaid.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-300">${row.endingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Annual Income & Billable Capacity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Take-Home ($)</label>
                <input
                  type="number"
                  value={targetSalary}
                  onChange={(e) => setTargetSalary(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Annual Overhead ($)</label>
                <input
                  type="number"
                  value={annualExpenses}
                  onChange={(e) => setAnnualExpenses(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tax Reserve (%)</label>
                <input
                  type="number"
                  value={taxBufferPercent}
                  onChange={(e) => setTaxBufferPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Billable Hrs / Week</label>
                <input
                  type="number"
                  value={billableHoursPerWeek}
                  onChange={(e) => setBillableHoursPerWeek(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vacation / Time Off ({vacationWeeks} weeks/yr)</label>
              <input
                type="range"
                min={0}
                max={12}
                value={vacationWeeks}
                onChange={(e) => setVacationWeeks(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Minimum Hourly Rate</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">${hourlyRate}/hr</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Full-Day Rate (8 hrs)</p>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">${dailyRate}/day</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Gross Annual Revenue</p>
              <p className="text-lg font-bold text-white mt-1">${Math.round(grossRequiredRevenue).toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400">Annual Billable Hours</p>
              <p className="text-lg font-bold text-slate-300 mt-1">{totalBillableHours} hrs/yr</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
