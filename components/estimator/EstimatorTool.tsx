"use client";

import { useState } from "react";
import { buildFromTemplate, type TemplateId } from "@/lib/estimator/templates";
import { calculateEstimate, type EstimateBreakdown } from "@/lib/estimator/engine";

// ─── Config ──────────────────────────────────────────────────────────────────
const PROJECT_OPTIONS: Array<{ value: TemplateId; label: string; description: string }> = [
  { value: "residential-framing",  label: "Residential Framing",  description: "New wood-frame build or addition" },
  { value: "commercial-framing",   label: "Commercial Framing",   description: "Steel stud or heavy timber" },
  { value: "roofing-shingle",      label: "Asphalt Shingle Roof", description: "30-yr architectural shingles" },
  { value: "roofing-metal",        label: "Metal Roof",           description: "Standing seam or corrugated" },
  { value: "drywall-finish",       label: "Drywall & Finish",     description: "Hang, tape, mud, texture" },
  { value: "concrete-foundation",  label: "Concrete / Foundation",description: "Slab, footings, foundation walls" },
  { value: "electrical-rough",     label: "Electrical Rough-in",  description: "Panel, wiring, outlets" },
  { value: "plumbing-rough",       label: "Plumbing Rough-in",    description: "Supply lines, drain, fixtures" },
  { value: "painting-interior",    label: "Interior Painting",    description: "Walls, ceilings, trim" },
  { value: "flooring-hardwood",    label: "Hardwood Flooring",    description: "Engineered or solid hardwood" },
];

function locationFactor(zip: string): number {
  if (!/^\d{5}$/.test(zip)) return 1.0;
  const pre = parseInt(zip.slice(0, 2), 10);
  if (pre >= 90) return 1.15;
  if (pre <= 9)  return 1.10;
  return 1.0;
}

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function EstimatorTool() {
  const [projectType, setProjectType] = useState<TemplateId | "">("");
  const [sqft, setSqft] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ breakdown: EstimateBreakdown; label: string; sqft: number } | null>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!projectType)              e.projectType = "Select a project type.";
    const n = parseInt(sqft, 10);
    if (!sqft || isNaN(n) || n < 100) e.sqft = "Enter at least 100 sq ft.";
    if (sqft && n > 100_000)       e.sqft = "Maximum 100,000 sq ft.";
    if (zipCode && !/^\d{5}$/.test(zipCode)) e.zipCode = "Enter a valid 5-digit ZIP.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const compute = () => {
    if (!validate() || !projectType) return;

    const n = parseInt(sqft, 10);
    const loc = locationFactor(zipCode);
    const raw = buildFromTemplate(projectType, n);

    const scaledInput = {
      ...raw,
      materials: raw.materials.map((m) => ({ ...m, unitCost: m.unitCost * loc })),
      labor: raw.labor.map((l) => ({ ...l, hourlyRate: l.hourlyRate * loc })),
    };

    const breakdown = calculateEstimate(scaledInput);
    const label = PROJECT_OPTIONS.find((p) => p.value === projectType)?.label ?? projectType;
    setResult({ breakdown, label, sqft: n });
  };

  if (result) {
    const { breakdown: bd, label, sqft: s } = result;
    return <ResultsView bd={bd} label={label} sqft={s} onReset={() => setResult(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1117] to-[#0b0d12] py-12 text-slate-100">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Construction Cost Estimator</h1>
          <p className="mt-2 text-slate-400">Get an instant cost breakdown — no signup required.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 p-8 backdrop-blur">
          {/* Project type */}
          <fieldset className="mb-8">
            <legend className="mb-4 text-sm font-semibold text-slate-200">1. What are you building?</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PROJECT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setProjectType(opt.value); setErrors((e) => ({ ...e, projectType: "" })); }}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    projectType === opt.value
                      ? "border-blue-500 bg-blue-500/15"
                      : "border-white/15 bg-white/4 hover:border-white/30"
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{opt.description}</p>
                </button>
              ))}
            </div>
            {errors.projectType && <p className="mt-2 text-xs text-red-400">{errors.projectType}</p>}
          </fieldset>

          {/* Sqft */}
          <div className="mb-8">
            <label className="mb-3 block text-sm font-semibold text-slate-200">2. Square footage?</label>
            <div className="relative">
              <input
                type="number"
                value={sqft}
                onChange={(e) => { setSqft(e.target.value); setErrors((ev) => ({ ...ev, sqft: "" })); }}
                placeholder="e.g. 2,500"
                min={100}
                max={100000}
                className="w-full rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">sq ft</span>
            </div>
            {errors.sqft && <p className="mt-2 text-xs text-red-400">{errors.sqft}</p>}
          </div>

          {/* ZIP */}
          <div className="mb-8">
            <label className="mb-3 block text-sm font-semibold text-slate-200">3. ZIP code <span className="font-normal text-slate-500">(optional — for regional adjustment)</span></label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => { setZipCode(e.target.value); setErrors((ev) => ({ ...ev, zipCode: "" })); }}
              placeholder="55123"
              maxLength={5}
              className="w-full rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
            />
            {errors.zipCode && <p className="mt-2 text-xs text-red-400">{errors.zipCode}</p>}
          </div>

          <button
            type="button"
            onClick={compute}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-500"
          >
            Calculate Estimate
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Ballpark figures for planning purposes. Actual costs vary with site conditions and local markets.
        </p>
      </div>
    </div>
  );
}

// ─── Results ─────────────────────────────────────────────────────────────────
function ResultsView({ bd, label, sqft, onReset }: {
  bd: EstimateBreakdown;
  label: string;
  sqft: number;
  onReset: () => void;
}) {
  const low  = Math.round(bd.total * 0.88);
  const high = Math.round(bd.total * 1.15);

  const phases = [
    { name: "Mobilization & Site Prep",   pct: 10 },
    { name: "Structural / Core Work",     pct: 45 },
    { name: "Finishes & Details",         pct: 35 },
    { name: "Punch-list & Closeout",      pct: 10 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1117] to-[#0b0d12] py-12 text-slate-100">
      <div className="mx-auto max-w-2xl px-6">
        <button
          type="button"
          onClick={onReset}
          className="mb-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition"
        >
          ← New Estimate
        </button>

        <div className="space-y-4">
          {/* Headline card */}
          <div className="rounded-2xl border border-white/10 bg-[#131c2e] p-8">
            <p className="text-xs uppercase tracking-widest text-slate-400">{label} · {sqft.toLocaleString()} sq ft</p>
            <p className="mt-4 text-5xl font-bold text-blue-300">{fmt(bd.total)}</p>
            <div className="mt-3 flex gap-8 text-sm">
              <div>
                <p className="text-xs text-slate-500">LOW END</p>
                <p className="font-semibold text-slate-200">{fmt(low)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">HIGH END</p>
                <p className="font-semibold text-slate-200">{fmt(high)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">SPREAD</p>
                <p className="font-semibold text-slate-200">±15%</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-[#131c2e] p-6">
            <h3 className="mb-4 font-semibold text-slate-100">Cost Breakdown</h3>
            <div className="space-y-2">
              {[
                { label: "Materials",      value: bd.materialsTotal,  color: "bg-blue-500" },
                { label: "Labor",          value: bd.laborTotal,      color: "bg-emerald-500" },
                { label: "Overhead",       value: bd.overheadAmount,  color: "bg-amber-500" },
                { label: "Profit Margin",  value: bd.profitAmount,    color: "bg-purple-500" },
                ...(bd.taxAmount > 0 ? [{ label: "Tax", value: bd.taxAmount, color: "bg-slate-500" }] : []),
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className={`inline-block h-2 w-2 rounded-full ${row.color}`} />
                    {row.label}
                  </div>
                  <span className="font-semibold text-white">{fmt(row.value)}</span>
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="font-bold text-slate-100">Total</span>
                <span className="font-bold text-blue-300 text-lg">{fmt(bd.total)}</span>
              </div>
            </div>
          </div>

          {/* Top material items */}
          {bd.details.materials.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#131c2e] p-6">
              <h3 className="mb-4 font-semibold text-slate-100">Key Material Line Items</h3>
              <div className="space-y-2">
                {bd.details.materials.slice(0, 5).map((item) => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span className="text-slate-300">{item.key}</span>
                    <span className="font-semibold text-white">{fmt(item.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Build phases */}
          <div className="rounded-2xl border border-white/10 bg-[#131c2e] p-6">
            <h3 className="mb-4 font-semibold text-slate-100">Typical Build Phases</h3>
            <div className="space-y-3">
              {phases.map((phase) => (
                <div key={phase.name}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{phase.name}</span>
                    <span>{phase.pct}% of budget</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${phase.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div className="rounded-2xl border border-blue-500/25 bg-blue-500/8 p-6">
            <h3 className="mb-3 font-semibold text-blue-200">Next Steps</h3>
            <ul className="space-y-1.5 text-sm text-blue-100">
              <li>✓ Share this estimate with your contractor for validation</li>
              <li>✓ Obtain 3–5 formal bids before committing</li>
              <li>✓ Confirm permit requirements with your local building department</li>
              <li>✓ Add 10–20% contingency for unforeseen conditions</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-xl border border-white/15 bg-white/8 py-3 font-semibold transition hover:bg-white/15"
          >
            Create Another Estimate
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          Estimates are computed from current material and labor cost databases. Always validate with formal contractor bids.
        </p>
      </div>
    </div>
  );
}


type ProjectType = "custom_home" | "spec_home" | "multi_unit" | "addition" | "remodel";
type FramingType = "wood_frame" | "steel_frame" | "concrete";
type FoundationType = "concrete_slab" | "crawl_space" | "basement" | "pier_post";

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: "custom_home", label: "Custom Home", description: "New construction from ground up" },
  { value: "spec_home", label: "Spec Home", description: "Builder-standard new build" },
  { value: "multi_unit", label: "Multi-Unit", description: "Duplex, triplex, or apartment" },
  { value: "addition", label: "Addition", description: "Expansion to existing home" },
  { value: "remodel", label: "Remodel", description: "Interior or exterior renovation" },
];

const FRAMING_TYPES: { value: FramingType; label: string }[] = [
  { value: "wood_frame", label: "Wood Frame" },
  { value: "steel_frame", label: "Steel Frame" },
  { value: "concrete", label: "Concrete" },
];

const FOUNDATION_TYPES: { value: FoundationType; label: string }[] = [
  { value: "concrete_slab", label: "Concrete Slab" },
  { value: "crawl_space", label: "Crawl Space" },
  { value: "basement", label: "Full Basement" },
  { value: "pier_post", label: "Pier & Post" },
];

interface EstimatorState {
  step: "input" | "results";
  projectType?: ProjectType;
  sqft?: number;
  framingType?: FramingType;
  foundationType?: FoundationType;
  zipCode?: string;
  estimate?: any;
}
