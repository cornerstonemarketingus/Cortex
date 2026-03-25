"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CortexTopTabs from "@/components/navigation/CortexTopTabs";
import BuilderCopilotPanel from "@/components/copilot/BuilderCopilotPanel";

type MarketPricingResponse = {
  compiledEstimate?: {
    recommendedUnitCost?: number;
    guardrailLow?: number;
    guardrailHigh?: number;
  };
  sourceInsights?: Array<{
    source: string;
    observedLow: number;
    observedHigh: number;
    confidence: string;
  }>;
  error?: string;
};

type BidEstimateResponse = {
  estimate?: {
    totals?: {
      grandTotal?: number;
    };
    timeline?: {
      estimatedDays?: number;
    };
  };
  error?: string;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ConstructionSolutionsPage() {
  const [audience, setAudience] = useState<"contractor" | "homeowner">("homeowner");
  const [zipCode, setZipCode] = useState("55123");
  const [projectCategory, setProjectCategory] = useState("roof-replacement");
  const [scope, setScope] = useState("Replace 2200 sq ft roof with architectural shingles and basic flashing updates.");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketPricingResponse | null>(null);
  const [bid, setBid] = useState<BidEstimateResponse["estimate"] | null>(null);

  const runBallpark = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const [marketRes, bidRes] = await Promise.all([
        fetch("/api/construction/market-pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zipCode, projectCategory, scopeDescription: scope }),
        }),
        fetch("/api/estimating/bid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: scope, zipCode, projectCategory }),
        }),
      ]);

      const marketData = (await marketRes.json().catch(() => ({}))) as MarketPricingResponse;
      const bidData = (await bidRes.json().catch(() => ({}))) as BidEstimateResponse;

      if (!marketRes.ok || !marketData.compiledEstimate) {
        throw new Error(marketData.error || `Market pricing failed (${marketRes.status})`);
      }
      if (!bidRes.ok || !bidData.estimate) {
        throw new Error(bidData.error || `Estimate generation failed (${bidRes.status})`);
      }

      setMarket(marketData);
      setBid(bidData.estimate);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run estimate right now.");
    } finally {
      setLoading(false);
    }
  };

  const sourceCount = useMemo(() => market?.sourceInsights?.length ?? 0, [market]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0e2021] via-[#1b2a2b] to-[#141a21] text-slate-100">
      <CortexTopTabs />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="glass rise-in rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">Bid Build Estimator</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Free ballpark estimates for everyone</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
            Homeowners and contractors can run fast estimate ranges inspired by Homewyse-style budgeting, with pricing
            references from sources like Home Depot, Menards, Angi, and Thumbtack.
          </p>
        </header>

        <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/12 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">Estimator Inputs</h2>

            <label className="mt-3 block text-xs text-cyan-50">
              Audience
              <select
                value={audience}
                onChange={(event) => setAudience(event.target.value as "contractor" | "homeowner")}
                className="mt-1 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
              >
                <option value="homeowner">Homeowner</option>
                <option value="contractor">Contractor</option>
              </select>
            </label>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-cyan-50">
                ZIP code
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-cyan-50">
                Project category
                <input
                  value={projectCategory}
                  onChange={(event) => setProjectCategory(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="mt-3 block text-xs text-cyan-50">
              Scope description
              <textarea
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => void runBallpark()}
              disabled={loading}
              className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? "Calculating..." : "Get Free Ballpark Estimate"}
            </button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-amber-100">Results</h2>
            {!market || !bid ? (
              <p className="mt-3 text-sm text-slate-300">Run the estimator to see pricing guardrails and source-based ranges.</p>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Ballpark Range</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {money(market.compiledEstimate?.guardrailLow || 0)} - {money(market.compiledEstimate?.guardrailHigh || 0)}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">Audience preset: {audience}</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Detailed Estimate</p>
                  <p className="mt-1">Estimated project total: {money(bid.totals?.grandTotal || 0)}</p>
                  <p className="mt-1 text-xs text-slate-300">Estimated timeline: {bid.timeline?.estimatedDays || "n/a"} days</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Source Signals ({sourceCount})</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {(market.sourceInsights || []).slice(0, 6).map((source) => (
                      <li key={source.source}>
                        {source.source}: {money(source.observedLow)} - {money(source.observedHigh)} ({source.confidence})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
          Need contractor CRM and close automation too? Continue to <Link href="/builder-copilot" className="text-cyan-200 underline">Builder Copilot</Link> or
          launch capture pages from <Link href="/website-builder" className="text-emerald-200 underline">Cortex Builder</Link>.
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <BuilderCopilotPanel
            title="Estimator Builder Copilot"
            subtitle="Generate exact follow-up copy, pricing assumptions, and implementation-ready CRM actions from this estimate context."
            defaultPrompt="Build a precise post-estimate sequence with SMS, voicemail receptionist fallback, and email follow-up tailored to this project scope."
            contextLabel="construction-solutions"
            showProvisioning
          />

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">Next step links</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/builder-copilot" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/15">
                Open Builder Copilot CRM + automations
              </Link>
              <Link href="/ai-automation-solutions" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/15">
                Open AI receptionist workspace
              </Link>
              <Link href="/website-builder" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/15">
                Build lead-gen website
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
