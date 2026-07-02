"use client";

import { useState, useCallback } from "react";
import { buildFromTemplate, listTemplates, type TemplateId } from "@/lib/estimator/templates";
import { calculateEstimate, type EstimateBreakdown } from "@/lib/estimator/engine";

const TRADE_IDS: TemplateId[] = [
  "residential-framing",
  "commercial-framing",
  "roofing-shingle",
  "roofing-metal",
  "drywall-finish",
  "concrete-foundation",
  "electrical-rough",
  "plumbing-rough",
  "painting-interior",
  "flooring-hardwood",
];

function locationFactor(zip: string): number {
  if (!/^\d{5}$/.test(zip)) return 1.0;
  const pre = parseInt(zip.slice(0, 2), 10);
  if (pre >= 90) return 1.15;
  if (pre <= 9) return 1.10;
  return 1.0;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function compute(tradeId: TemplateId, sqft: number, zip: string, laborAdj: number): EstimateBreakdown {
  const loc = locationFactor(zip);
  const la = 1 + laborAdj / 100;
  const raw = buildFromTemplate(tradeId, sqft);
  return calculateEstimate({
    ...raw,
    materials: raw.materials.map((m) => ({ ...m, unitCost: m.unitCost * loc })),
    labor: raw.labor.map((l) => ({ ...l, hourlyRate: l.hourlyRate * loc * la })),
  });
}

export default function EstimatorTwoPanel({
  initialProjectType = "residential-framing",
  initialZip = "55123",
  initialSqft = 1500,
}: {
  initialProjectType?: string;
  initialZip?: string;
  initialSqft?: number;
}) {
  const [tradeId, setTradeId] = useState<TemplateId>(
    TRADE_IDS.includes(initialProjectType as TemplateId) ? (initialProjectType as TemplateId) : "residential-framing",
  );
  const [sqft, setSqft] = useState(initialSqft.toString());
  const [zip, setZip] = useState(initialZip);
  const [laborAdj, setLaborAdj] = useState(0);
  const [breakdown, setBreakdown] = useState<EstimateBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = listTemplates();

  const run = useCallback(() => {
    setError(null);
    const n = parseInt(sqft, 10);
    if (!n || n < 100) { setError("Enter at least 100 sq ft."); return; }
    try {
      setBreakdown(compute(tradeId, n, zip, laborAdj));
    } catch {
      setError("Computation failed. Check your inputs.");
    }
  }, [tradeId, sqft, zip, laborAdj]);

  const bd = breakdown;
  const n = parseInt(sqft, 10) || 0;
  const tradeName = templates.find((t) => t.id === tradeId)?.name ?? tradeId;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* ── Left panel: inputs ── */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-5">
        <p className="text-xs uppercase tracking-widest text-slate-400">Project Inputs</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-100">Configure estimate</h3>

        <div className="mt-4 space-y-4">
          <label className="block text-xs text-slate-400">
            Trade / work type
            <select
              value={tradeId}
              onChange={(e) => setTradeId(e.target.value as TemplateId)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-slate-100"
            >
              {TRADE_IDS.map((id) => {
                const t = templates.find((t) => t.id === id);
                return <option key={id} value={id}>{t?.name ?? id}</option>;
              })}
            </select>
          </label>

          <label className="block text-xs text-slate-400">
            Square footage
            <input
              type="number"
              value={sqft}
              min={100}
              max={100000}
              onChange={(e) => setSqft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="block text-xs text-slate-400">
            ZIP code
            <input
              value={zip}
              maxLength={5}
              onChange={(e) => setZip(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm text-slate-100"
              placeholder="55123"
            />
          </label>

          <div>
            <p className="text-xs text-slate-400">Labor rate adjustment: <span className="text-slate-200">{laborAdj > 0 ? "+" : ""}{laborAdj}%</span></p>
            <input
              type="range"
              min={-20}
              max={40}
              step={5}
              value={laborAdj}
              onChange={(e) => setLaborAdj(Number(e.target.value))}
              className="mt-1 w-full accent-blue-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={run}
          className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
        >
          Calculate
        </button>
      </div>

      {/* ── Right panel: live estimate ── */}
      <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-5">
        <p className="text-xs uppercase tracking-widest text-slate-400">Live Estimate</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-100">Results</h3>

        {!bd ? (
          <p className="mt-6 text-sm text-slate-500">Fill in the inputs and click Calculate to see your estimate.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/4 p-4">
              <p className="text-xs text-slate-400">{tradeName} · {n.toLocaleString()} sq ft</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">{fmt(bd.total)}</p>
              <div className="mt-2 flex gap-6 text-xs text-slate-400">
                <span>Low: <span className="text-slate-200">{fmt(Math.round(bd.total * 0.88))}</span></span>
                <span>High: <span className="text-slate-200">{fmt(Math.round(bd.total * 1.15))}</span></span>
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/4 p-4 text-sm">
              {[
                { label: "Materials",     value: bd.materialsTotal },
                { label: "Labor",         value: bd.laborTotal },
                { label: "Overhead",      value: bd.overheadAmount },
                { label: "Profit",        value: bd.profitAmount },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="font-semibold text-slate-100">{fmt(row.value)}</span>
                </div>
              ))}
            </div>

            {bd.details.materials.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/4 p-4 text-xs">
                <p className="mb-2 font-semibold text-slate-300">Top materials</p>
                {bd.details.materials.slice(0, 4).map((item) => (
                  <div key={item.key} className="flex justify-between text-slate-400">
                    <span>{item.key}</span><span className="text-slate-200">{fmt(item.cost)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">Generate Proposal</button>
              <button type="button" onClick={run} className="rounded-lg border border-white/15 bg-white/8 px-4 py-2 text-xs hover:bg-white/15">Recalculate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


type StructuredFields = {
  scope: string[];
  framingSqFt?: number;
  windowsCount?: number;
  laborTier?: "budget" | "standard" | "premium";
  materialGrade?: "low" | "mid" | "high";
};
