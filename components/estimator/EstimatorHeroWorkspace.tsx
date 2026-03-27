"use client";

import { useMemo, useState } from "react";

type HeroMode = "EXECUTE" | "DISCUSS" | "CONFIRM";

export default function EstimatorHeroWorkspace() {
  const [materials, setMaterials] = useState(8500);
  const [labor, setLabor] = useState(6200);
  const [margin, setMargin] = useState(28);
  const [mode, setMode] = useState<HeroMode>("EXECUTE");

  const subtotal = materials + labor;
  const total = useMemo(() => subtotal * (1 + margin / 100), [subtotal, margin]);
  const confidence = total > 20000 ? "High confidence" : total > 12000 ? "Medium confidence" : "Low confidence";

  const suggestions = [
    "Add decking materials?",
    "Margin is slightly below local average.",
    "Offer two-package estimate for faster close.",
  ];

  return (
    <section className="mt-6 rounded-3xl border border-amber-300/35 bg-gradient-to-br from-[#2f1200]/95 via-[#1d0d04]/95 to-[#0f0703]/95 p-6 shadow-[0_26px_60px_rgba(0,0,0,0.35)] md:p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Above-The-Fold Estimator Workspace</p>
      <h2 className="mt-2 text-3xl font-semibold text-amber-50 md:text-5xl">Build your estimate instantly</h2>
      <p className="mt-3 max-w-3xl text-sm text-amber-100/90 md:text-base">
        AI-powered pricing and project planning ready in seconds for your construction projects.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-amber-300/25 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Estimator Tool</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-200">
              Materials (${materials.toLocaleString("en-US")})
              <input
                type="range"
                min={1500}
                max={30000}
                step={250}
                value={materials}
                onChange={(event) => setMaterials(Number(event.target.value))}
                className="mt-2 w-full accent-[#FFC107]"
              />
            </label>
            <label className="text-xs text-slate-200">
              Labor (${labor.toLocaleString("en-US")})
              <input
                type="range"
                min={1000}
                max={26000}
                step={250}
                value={labor}
                onChange={(event) => setLabor(Number(event.target.value))}
                className="mt-2 w-full accent-[#FF6D00]"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-200">
            Margin slider ({margin}%)
            <input
              type="range"
              min={8}
              max={55}
              step={1}
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
              className="mt-2 w-full accent-[#FFC107]"
            />
          </label>

          <div className="mt-3 rounded-xl border border-amber-300/20 bg-white/5 p-3 text-xs text-slate-200">
            <p>Subtotal: ${subtotal.toLocaleString("en-US")}</p>
            <p className="mt-1 text-lg font-semibold text-amber-100">Live total: ${Math.round(total).toLocaleString("en-US")}</p>
            <p className="mt-1 text-amber-200">{confidence}</p>
          </div>

          <button
            type="button"
            className="mt-4 rounded-xl bg-[#FFC107] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#ffcf4a]"
          >
            Start Your Free Estimate
          </button>
        </article>

        <article className="rounded-2xl border border-amber-300/25 bg-black/30 p-4">
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(["EXECUTE", "DISCUSS", "CONFIRM"] as HeroMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`rounded border px-2 py-1 font-semibold ${mode === item ? "border-[#FFC107]/70 bg-[#FF6D00]/35 text-amber-50" : "border-white/20 bg-white/5 text-slate-300"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-amber-200">Builder Copilot Assistant</p>
          <p className="mt-1 text-sm text-slate-200">
            {mode === "DISCUSS"
              ? "Planning mode: brainstorm layout, scope, and conversion strategy before execution."
              : mode === "CONFIRM"
                ? "Confirmation mode: preview staged actions before applying changes."
                : "Execution mode: apply estimate and workflow actions instantly."}
          </p>

          <div className="mt-3 space-y-2 text-xs text-slate-200">
            {suggestions.map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-50">
            Real-time tip: increasing margin from 28% to 32% improves contribution margin by ${Math.round(subtotal * 0.04).toLocaleString("en-US")}
            while staying in target range.
          </div>
        </article>
      </div>
    </section>
  );
}
