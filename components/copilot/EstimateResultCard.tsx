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
  onRevise?: (text: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

const REVISION_CHIPS = [
  { label: 'Adjust sqft', text: 'Adjust the estimate to ' },
  { label: 'Upgrade materials', text: 'Upgrade to premium materials for this estimate' },
  { label: 'Add a trade', text: 'Add ' },
  { label: 'Generate proposal', text: 'Generate a client proposal for this estimate' },
];

export default function EstimateResultCard({ breakdown, onRevise }: EstimateResultCardProps) {
  const bars = [
    { label: 'Materials', value: breakdown.materialsTotal, color: '#3B82F6' },
    { label: 'Labor',     value: breakdown.laborTotal,     color: '#8B5CF6' },
    { label: 'Overhead',  value: breakdown.overheadAmount, color: '#F59E0B' },
    { label: 'Tax',       value: breakdown.taxAmount,      color: '#475569' },
    { label: 'Profit',    value: breakdown.profitAmount,   color: '#10B981' },
  ];

  const rows = [
    { label: 'Materials', value: breakdown.materialsTotal, dot: '#3B82F6' },
    { label: 'Labor',     value: breakdown.laborTotal,     dot: '#8B5CF6' },
    { label: 'Overhead',  value: breakdown.overheadAmount, dot: '#F59E0B' },
    { label: 'Tax',       value: breakdown.taxAmount,      dot: '#475569' },
    { label: 'Profit',    value: breakdown.profitAmount,   dot: '#10B981' },
  ];

  function handleChip(chip: typeof REVISION_CHIPS[number]) {
    if (!onRevise) return;
    // Adjust sqft and Add a trade need user to complete the prompt
    if (chip.text.endsWith(' ')) {
      onRevise(chip.text);
    } else {
      onRevise(chip.text);
    }
  }

  return (
    <div className="mt-2 rounded-2xl overflow-hidden w-full max-w-xl" style={{
      background: 'linear-gradient(180deg, #0e1929 0%, #0b1420 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: '#C69C6D' }}>
              Estimate
            </p>
            <p className="text-base font-semibold text-white">{breakdown.templateName}</p>
            <p className="text-sm mt-0.5" style={{ color: '#8B9CB5' }}>
              {breakdown.sqft.toLocaleString()} sqft
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#8B9CB5' }}>Total</p>
            <p className="text-2xl font-bold" style={{ color: '#C69C6D' }}>{fmt(breakdown.total)}</p>
          </div>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="px-5 py-4">
        <div className="flex rounded-full overflow-hidden h-1.5 gap-px mb-4">
          {bars.map((b) => (
            <div
              key={b.label}
              style={{ width: `${pct(b.value, breakdown.total)}%`, background: b.color }}
              title={`${b.label}: ${fmt(b.value)}`}
            />
          ))}
        </div>

        {/* Breakdown grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.dot }} />
                <span className="text-xs" style={{ color: '#8B9CB5' }}>{r.label}</span>
              </div>
              <span className="text-xs font-medium tabular-nums" style={{ color: '#D1D9E6' }}>{fmt(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Subtotal line */}
        <div className="mt-3 pt-3 flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs font-semibold" style={{ color: '#8B9CB5' }}>Total</span>
          <span className="text-sm font-bold" style={{ color: '#C69C6D' }}>{fmt(breakdown.total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-2">
        <Link
          href="/estimates"
          className="flex-1 text-center rounded-lg py-2 text-xs font-semibold transition"
          style={{
            background: 'rgba(30,58,95,0.6)',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#93C5FD',
          }}
        >
          View Full Estimate
        </Link>
        <button
          onClick={() => {
            const csv = `Category,Amount\n${rows.map((r) => `${r.label},$${r.value.toFixed(2)}`).join('\n')}\nTotal,$${breakdown.total.toFixed(2)}`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `estimate-${breakdown.templateName.replace(/\s+/g, '-').toLowerCase()}.csv`;
            a.click();
          }}
          className="rounded-lg py-2 px-3 text-xs font-semibold transition"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8B9CB5',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Revision chips */}
      {onRevise && (
        <div className="px-5 pb-5 flex flex-wrap gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="w-full text-[10px] uppercase tracking-widest pt-3 pb-1" style={{ color: '#4A5568' }}>Revise this estimate</p>
          {REVISION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChip(chip)}
              className="text-[11px] px-3 py-1.5 rounded-full transition"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#8B9CB5',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(198,156,109,0.4)';
                (e.currentTarget as HTMLButtonElement).style.color = '#C69C6D';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLButtonElement).style.color = '#8B9CB5';
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

