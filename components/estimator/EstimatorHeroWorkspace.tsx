"use client";

import { useState } from "react";
import { useBuilderDispatch } from '@/components/ai/BuilderStateProvider';
import { useRouter } from 'next/navigation';
import { buildFromTemplate, type TemplateId } from "@/lib/estimator/templates";
import { calculateEstimate } from "@/lib/estimator/engine";

const QUICK_TRADES: Array<{ id: TemplateId; label: string }> = [
  { id: "residential-framing", label: "Framing" },
  { id: "roofing-shingle",     label: "Roofing" },
  { id: "drywall-finish",      label: "Drywall" },
  { id: "painting-interior",   label: "Painting" },
  { id: "electrical-rough",    label: "Electrical" },
  { id: "plumbing-rough",      label: "Plumbing" },
];

function locationFactor(zip: number): number {
  const pre = Math.floor(zip / 1000);
  if (pre >= 900) return 1.15;
  if (pre <= 9)   return 1.10;
  return 1.0;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function EstimatorHeroWorkspace() {
  const dispatch = useBuilderDispatch();
  const router = useRouter();

  const [sqft, setSqft] = useState(1_200);
  const [zip, setZip] = useState(55401);
  const [trade, setTrade] = useState<TemplateId>("roofing-shingle");
  const [description, setDescription] = useState("Residential re-roof with new underlayment");
  const [quickResult, setQuickResult] = useState<{ total: number; low: number; high: number } | null>(null);

  const runQuick = () => {
    try {
      const loc = locationFactor(zip);
      const raw = buildFromTemplate(trade, sqft);
      const bd = calculateEstimate({
        ...raw,
        materials: raw.materials.map((m) => ({ ...m, unitCost: m.unitCost * loc })),
        labor: raw.labor.map((l) => ({ ...l, hourlyRate: l.hourlyRate * loc })),
      });
      setQuickResult({ total: bd.total, low: Math.round(bd.total * 0.88), high: Math.round(bd.total * 1.15) });
    } catch { /* ignore */ }
  };

  const startEstimate = () => {
    dispatch({ type: "CREATE_ESTIMATE", payload: { sqft, zip, trade, description, source: "hero" } });
    router.push(`/estimate?prefill=1&zip=${zip}&sqft=${sqft}`);
  };

  return (
    <section className="mt-6 rounded-3xl border border-[#0b4a73]/30 bg-gradient-to-br from-[#0d1e2e] via-[#0f2038] to-[#0b1220] p-6 md:p-8">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent-500, #C69C6D)" }}>Estimator Workspace</p>
      <h2 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Get a quick estimate</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Fill in a few details for an instant ballpark — then open the full estimator for a detailed breakdown.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Inputs */}
        <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
          {/* Trade selector */}
          <div className="mb-4 flex flex-wrap gap-2">
            {QUICK_TRADES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrade(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  trade === t.id
                    ? "bg-blue-600 text-white"
                    : "border border-white/15 bg-white/5 text-slate-400 hover:border-white/30"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-400">
              Square footage
              <input
                type="number"
                value={sqft}
                min={100}
                onChange={(e) => { setSqft(Number(e.target.value)); setQuickResult(null); }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              ZIP code
              <input
                type="number"
                value={zip}
                onChange={(e) => { setZip(Number(e.target.value)); setQuickResult(null); }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-400">
            Description (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runQuick}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              Quick Estimate
            </button>
            <button
              type="button"
              onClick={startEstimate}
              className="rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/15 transition"
            >
              Full Estimator →
            </button>
          </div>
        </div>

        {/* Quick result */}
        <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
          {!quickResult ? (
            <>
              <p className="text-xs uppercase tracking-widest text-slate-500">Instant estimate</p>
              <p className="mt-3 text-sm text-slate-400">Click Quick Estimate to see a ballpark range — computed instantly from current cost data.</p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                <li>· Location-adjusted pricing by ZIP</li>
                <li>· Accurate material + labor breakdown</li>
                <li>· Low / best / high range</li>
              </ul>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-slate-400">Instant estimate</p>
              <p className="mt-3 text-4xl font-bold text-emerald-300">{fmt(quickResult.total)}</p>
              <div className="mt-2 flex gap-6 text-xs text-slate-400">
                <span>Low: <span className="text-slate-200">{fmt(quickResult.low)}</span></span>
                <span>High: <span className="text-slate-200">{fmt(quickResult.high)}</span></span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {sqft.toLocaleString()} sq ft · ZIP {zip}
              </p>
              <button
                type="button"
                onClick={startEstimate}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
              >
                Open Full Breakdown →
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

