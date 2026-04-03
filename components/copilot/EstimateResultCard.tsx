'use client';

import Link from 'next/link';

interface MaterialItem { key: string; cost: number }
interface LaborItem { key: string; cost: number }

interface EstimateBreakdown {
  templateName: string;
  sqft: number;
  materialsTotal: number;
  laborTotal: number;
  subtotal: number;
  overheadAmount: number;
  taxAmount: number;
  profitAmount: number;
  total: number;
  materialItems?: MaterialItem[];
  laborItems?: LaborItem[];
}

interface EstimateResultCardProps {
  breakdown: EstimateBreakdown;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function EstimateResultCard({ breakdown }: EstimateResultCardProps) {
  const rows = [
    { label: 'Materials', value: breakdown.materialsTotal, color: 'bg-blue-500' },
    { label: 'Labor', value: breakdown.laborTotal, color: 'bg-violet-500' },
    { label: 'Overhead', value: breakdown.overheadAmount, color: 'bg-amber-500' },
    { label: 'Tax', value: breakdown.taxAmount, color: 'bg-slate-500' },
    { label: 'Profit', value: breakdown.profitAmount, color: 'bg-emerald-500' },
  ];

  return (
    <div className="mt-3 rounded-xl border border-[#C69C6D]/30 bg-[#0d1826] overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1E3A5F]/60 border-b border-[#C69C6D]/20">
        <div>
          <p className="text-xs text-[#C69C6D] uppercase tracking-widest font-semibold">Estimate</p>
          <p className="text-sm font-semibold text-white mt-0.5">{breakdown.templateName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{breakdown.sqft.toLocaleString()} sqft</p>
          <p className="text-lg font-bold text-[#C69C6D]">{fmt(breakdown.total)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex rounded-full overflow-hidden h-2 gap-px">
          {rows.map((r) => (
            <div
              key={r.label}
              className={`${r.color} transition-all`}
              style={{ width: `${pct(r.value, breakdown.total)}%` }}
              title={`${r.label}: ${fmt(r.value)}`}
            />
          ))}
        </div>
      </div>

      {/* Cost rows */}
      <div className="px-4 pb-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${r.color}`} />
              <span className="text-slate-400">{r.label}</span>
            </div>
            <span className="text-slate-200 tabular-nums">{fmt(r.value)}</span>
          </div>
        ))}
        <div className="border-t border-white/10 pt-1.5 flex justify-between text-xs font-semibold">
          <span className="text-slate-300">Total</span>
          <span className="text-[#C69C6D]">{fmt(breakdown.total)}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-3 pt-1 flex gap-2">
        <Link
          href="/estimates"
          className="flex-1 text-center rounded-lg py-2 text-xs font-semibold bg-[#1E3A5F] text-white border border-[#1E3A5F] hover:bg-[#1E3A5F]/80 transition"
        >
          View Full Estimate
        </Link>
        <button
          onClick={() => {
            const csv = `Trade,Amount\n${rows.map((r) => `${r.label},${r.value.toFixed(2)}`).join('\n')}\nTotal,${breakdown.total.toFixed(2)}`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estimate-${breakdown.templateName.replace(/\s/g, '-').toLowerCase()}.csv`;
            a.click();
          }}
          className="rounded-lg py-2 px-3 text-xs font-semibold bg-transparent text-slate-400 border border-white/10 hover:border-white/20 transition"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
