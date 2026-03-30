"use client";

import { useEffect, useState } from "react";
import { useBuilderDispatch } from '@/components/ai/BuilderStateProvider';
import { generateEstimateFromStructured } from '@/lib/estimator';

type StructuredFields = {
  scope: string[];
  framingSqFt?: number;
  windowsCount?: number;
  laborTier?: "budget" | "standard" | "premium";
  materialGrade?: "low" | "mid" | "high";
};

export default function EstimatorTwoPanel({
  initialProjectType = "roof-replacement",
  initialZip = "55123",
  initialSqft = 1200,
  initialDescription = "",
}: {
  initialProjectType?: string;
  initialZip?: string;
  initialSqft?: number;
  initialDescription?: string;
}) {
  const [zip, setZip] = useState(initialZip);
  const [projectType, setProjectType] = useState(initialProjectType);
  const [sqft, setSqft] = useState(initialSqft.toString());
  const [description, setDescription] = useState(initialDescription || "Describe your project, e.g. framing + windows for a 2-story addition.");

  const [structured, setStructured] = useState<StructuredFields>({ scope: [] });
  const [estimateRange, setEstimateRange] = useState<{ low: number; avg: number; high: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [laborAdj, setLaborAdj] = useState(0); // percent
  const [quality, setQuality] = useState<"low" | "mid" | "high">("mid");
  const dispatch = useBuilderDispatch();

  useEffect(() => {
    // always show a baseline preview so UI never feels empty
    void runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simpleParse = (text: string): StructuredFields => {
    const lower = text.toLowerCase();
    const scope: string[] = [];
    if (/(frame|framing|roof|roofing)/.test(lower)) scope.push("framing");
    if (/(window|windows)/.test(lower)) scope.push("windows");
    if (/(demo|demolition|remove)/.test(lower)) scope.push("demo");

    const windowsMatch = lower.match(/(\d+)\s*(windows|window)/);
    const sqftMatch = lower.match(/(\d{3,6})\s*(sqft|sq ft|square feet|square foot)/);

    return {
      scope,
      framingSqFt: sqftMatch ? Number(sqftMatch[1]) : undefined,
      windowsCount: windowsMatch ? Number(windowsMatch[1]) : undefined,
      laborTier: /premium/.test(lower) ? "premium" : /budget/.test(lower) ? "budget" : "standard",
      materialGrade: /high|premium/.test(lower) ? "high" : /low|budget/.test(lower) ? "low" : "mid",
    };
  };

  const enhanceWithCopilot = async () => {
    // quick local parse now; if server AI is configured, we can extend to call /api/copilot
    const parsed = simpleParse(description);
    if (!parsed.scope.length) {
      // ensure at least the project type is present
      parsed.scope.push(projectType.includes("roof") ? "framing" : "framing");
    }
    if (!parsed.framingSqFt) parsed.framingSqFt = Number(sqft) || undefined;
    setStructured(parsed);
    await runPreview(parsed);
  };

  const unitPrices = {
    framing: { material: 4.5, labor: 6.5 }, // per sqft
    windows: { material: 600, labor: 500 }, // per unit
  } as const;

  const locationMultiplier = (zipCode: string) => {
    // simple placeholder: urban zips slightly higher, default 1.0
    if (!zipCode) return 1;
    if (zipCode.startsWith("55")) return 1.0;
    if (zipCode.startsWith("90") || zipCode.startsWith("94")) return 1.15;
    return 1.05;
  };

  const computeEstimate = (fields: StructuredFields) => {
    const res = generateEstimateFromStructured({
      ...fields,
      zip,
      laborTier: fields.laborTier || 'standard',
      materialGrade: fields.materialGrade || quality,
    });

    // Apply labor adjustment slider as a percent modifier to labor before totals
    const laborMultiplier = 1 + laborAdj / 100;
    const adjustedLabor = Math.round(res.totals.labor * laborMultiplier);
    const adjustedMaterials = res.totals.materials;
    const adjustedOverhead = Math.round((adjustedMaterials + adjustedLabor) * 0.08);
    const adjustedProfit = Math.round((adjustedMaterials + adjustedLabor) * 0.12);
    const adjustedGrand = adjustedMaterials + adjustedLabor + adjustedOverhead + adjustedProfit;

    return {
      low: Math.round(adjustedGrand * 0.9),
      avg: adjustedGrand,
      high: Math.round(adjustedGrand * 1.15),
      breakdown: { materials: adjustedMaterials, labor: adjustedLabor },
    };
  };

  const runPreview = async (override?: StructuredFields) => {
    setLoading(true);
    try {
      const fields = override || structured || simpleParse(description);
      const estimate = computeEstimate(fields);
      setEstimateRange({ low: estimate.low, avg: estimate.avg, high: estimate.high });
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // chat-like quick commands: allow users to type "estimate 2400 zip 55123" or similar
  const [chatCmd, setChatCmd] = useState('');

  const handleChatCommand = async () => {
    if (!chatCmd.trim()) return;
    const txt = chatCmd.toLowerCase();
    // extract sqft
    const sqftMatch = txt.match(/(\d{3,6})\s*(sqft|sq ft|square feet|square foot)/);
    const zipMatch = txt.match(/\b(\d{5})\b/);
    const windowsMatch = txt.match(/(\d+)\s*(windows|window)/);

    if (sqftMatch) setSqft(sqftMatch[1]);
    if (zipMatch) setZip(zipMatch[1]);
    if (windowsMatch) setStructured((s) => ({ ...s, windowsCount: Number(windowsMatch[1]) }));

    // run preview after applying parsed values
    await runPreview();

    // Emit structured CREATE_ESTIMATE into global builder state so Copilot and Builder UI can prefill
    try {
      const parsedFields = simpleParse(description);
      const payload = {
        scope: parsedFields.scope,
        framingSqFt: sqftMatch ? Number(sqftMatch[1]) : parsedFields.framingSqFt,
        windowsCount: windowsMatch ? Number(windowsMatch[1]) : parsedFields.windowsCount,
        zip: zipMatch ? zipMatch[1] : zip,
        materialGrade: parsedFields.materialGrade,
        laborTier: parsedFields.laborTier,
      };
      dispatch({ type: 'CREATE_ESTIMATE', payload });
    } catch (e) {
      // ignore if dispatch fails in weird contexts
    }

    setChatCmd('');
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-[#0f1720] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Guided Inputs</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-100">Step-based estimator input</h3>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <label className="text-xs text-slate-300">ZIP Code
            <input value={zip} onChange={(e) => setZip(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          </label>

          <label className="text-xs text-slate-300">Project Type
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
              <option value="roof-replacement">Roof replacement</option>
              <option value="kitchen-gut">Kitchen remodel</option>
              <option value="deck">Deck</option>
              <option value="bathroom-remodel">Bathroom remodel</option>
            </select>
          </label>

          <label className="text-xs text-slate-300">Project size (sq ft)
            <input value={sqft} onChange={(e) => setSqft(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          </label>

          <label className="text-xs text-slate-300">Project description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          </label>

          <div className="mt-2 flex gap-2">
            <button onClick={() => void enhanceWithCopilot()} className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-900">✨ Enhance with Copilot</button>
            <button onClick={() => void runPreview()} className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs">Get Instant Ballpark</button>
          </div>

          <div className="mt-3 text-xs text-slate-300">
            <p className="font-semibold text-slate-100">Detected scope</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {(structured.scope.length ? structured.scope : simpleParse(description).scope).map((s) => (
                <span key={s} className="rounded-full bg-white/5 px-3 py-1 text-xs">{s}</span>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <label className="text-slate-300">Labor tier
              <select value={structured.laborTier || "standard"} onChange={(e) => setStructured((c) => ({ ...c, laborTier: e.target.value as any }))} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm">
                <option value="budget">Budget</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </label>

            <label className="text-slate-300">Material quality
              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm">
                <option value="low">Low</option>
                <option value="mid">Mid</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div className="mt-3 text-xs">
            <p className="text-slate-300">Labor adjustment: {laborAdj}%</p>
            <input type="range" min={-20} max={40} value={laborAdj} onChange={(e) => setLaborAdj(Number(e.target.value))} className="w-full" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Live Estimate</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-100">Instant summary</h3>

        <div className="mt-3">
          {loading ? (
            <p className="text-sm text-slate-400">Calculating...</p>
          ) : !estimateRange ? (
            <p className="text-sm text-slate-300">Run the estimator to see your low/average/high range.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Estimated total</p>
                <p className="mt-1 text-2xl font-bold text-emerald-200">${estimateRange.avg.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-300">Range: ${estimateRange.low.toLocaleString()} — ${estimateRange.high.toLocaleString()}</p>
              </div>

              <div className="mt-3">
                <p className="text-xs text-slate-400">Quick command</p>
                <div className="mt-1 flex gap-2">
                  <input value={chatCmd} onChange={(e) => setChatCmd(e.target.value)} placeholder="e.g. 2400 sqft zip 55123" className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm" />
                  <button onClick={() => void handleChatCommand()} className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold">Run</button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <p className="text-xs text-slate-400">Breakdown</p>
                <p className="mt-1">Materials & Labor split shown in totals above.</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                <p className="font-semibold">Why this estimate?</p>
                <p className="mt-1">Based on ZIP: {zip} | Project size: {sqft} sq ft | Quality: {quality}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-900">Generate Proposal</button>
                <button className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs">Export PDF</button>
                <button className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs">Save to Project</button>
                <button className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs">Send to Client</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
