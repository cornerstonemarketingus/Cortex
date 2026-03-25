"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';

type BidEstimateResponse = {
  estimate?: {
    estimateId?: string;
    categoryLabel?: string;
    totals?: {
      grandTotal?: number;
    };
    timeline?: {
      estimatedDays?: number;
    };
    assumptions?: string[];
  };
  error?: string;
};

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

const readinessChecklist = [
  'Upload plan files or rough dimensions for faster AI takeoff.',
  'Define preferred material tier and finish expectations.',
  'Share timeline and budget preference for realistic proposal options.',
  'Confirm permit or HOA constraints before final bid acceptance.',
];

export default function HomeownerEstimatePage() {
  const [projectCategory, setProjectCategory] = useState('roof-replacement');
  const [zipCode, setZipCode] = useState('55123');
  const [description, setDescription] = useState('Need full roof replacement for 2,100 sq ft home with improved shingle warranty and gutter updates.');
  const [budget, setBudget] = useState('$15,000 - $25,000');
  const [timeline, setTimeline] = useState('Within the next 30 days');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bidResult, setBidResult] = useState<BidEstimateResponse['estimate'] | null>(null);
  const [marketResult, setMarketResult] = useState<MarketPricingResponse | null>(null);

  const homeownerAssistantSummary = useMemo(() => {
    if (!bidResult || !marketResult?.compiledEstimate) return null;

    const total = Math.round(bidResult.totals?.grandTotal || 0);
    const timelineDays = bidResult.timeline?.estimatedDays || 0;

    return {
      total,
      timelineDays,
      guardrailLow: marketResult.compiledEstimate.guardrailLow || 0,
      guardrailHigh: marketResult.compiledEstimate.guardrailHigh || 0,
    };
  }, [bidResult, marketResult]);

  const runEstimateAssistant = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const [bidRes, marketRes] = await Promise.all([
        fetch('/api/estimating/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            projectCategory,
            zipCode,
          }),
        }),
        fetch('/api/construction/market-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCode,
            projectCategory,
            scopeDescription: description,
          }),
        }),
      ]);

      const bidData = (await bidRes.json().catch(() => ({}))) as BidEstimateResponse;
      const marketData = (await marketRes.json().catch(() => ({}))) as MarketPricingResponse;

      if (!bidRes.ok || !bidData.estimate) {
        throw new Error(bidData.error || `Bid estimate failed (${bidRes.status})`);
      }

      if (!marketRes.ok || !marketData.compiledEstimate) {
        throw new Error(marketData.error || `Market pricing failed (${marketRes.status})`);
      }

      setBidResult(bidData.estimate);
      setMarketResult(marketData);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run homeowner assistant';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#05143c] via-[#102c72] to-[#071638] text-slate-100">
      <CortexTopTabs />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Cortex Assistant Surface</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Homeowner Estimate Assistant</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Homeowner-side AI assistant for quick project scoping, market pricing guardrails, and contractor-ready estimate preparation.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/construction-solutions" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-sm">
              Open Contractor Construction Suite
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-5">
            <h2 className="text-lg font-semibold text-indigo-100 mb-3">Project Intake</h2>

            <label className="text-xs text-indigo-100 block mb-2">
              Project category
              <input
                value={projectCategory}
                onChange={(event) => setProjectCategory(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-indigo-100 block mb-2">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-indigo-100 block mb-2">
              Budget preference
              <input
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-indigo-100 block mb-2">
              Timeline preference
              <input
                value={timeline}
                onChange={(event) => setTimeline(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-indigo-100 block">
              Project description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full min-h-24 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => void runEstimateAssistant()}
              disabled={loading}
              className="mt-3 rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
            >
              {loading ? 'Analyzing project...' : 'Run Homeowner Assistant'}
            </button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">Assistant Output</h2>
            {!homeownerAssistantSummary ? (
              <p className="text-sm text-slate-300">Run the assistant to see a recommended estimate range and readiness guidance.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Estimated total project cost</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    ${homeownerAssistantSummary.total.toLocaleString('en-US')}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">Expected completion: about {homeownerAssistantSummary.timelineDays} days</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Local market guardrails</p>
                  <p className="mt-1">
                    ${homeownerAssistantSummary.guardrailLow} - ${homeownerAssistantSummary.guardrailHigh}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Homeowner assistant recommendation</p>
                  <p className="mt-1 text-xs">
                    Based on your ZIP, scope, budget ({budget}), and timeline ({timeline}), request a contractor proposal packet with itemized labor/material lines and an e-sign link for acceptance.
                  </p>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
          <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">Pricing Sources</h2>
            {!marketResult?.sourceInsights ? (
              <p className="text-sm text-slate-300">Market source comparisons will appear after assistant run.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-200">
                {marketResult.sourceInsights.map((source) => (
                  <li key={source.source} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="font-semibold text-slate-100">{source.source}</p>
                    <p className="mt-1">Range: ${source.observedLow} - ${source.observedHigh}</p>
                    <p className="mt-1">Confidence: {source.confidence}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-indigo-100 mb-3">Homeowner Readiness Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-200">
              {readinessChecklist.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-300">
              This assistant provides planning estimates only. Final bids require contractor site verification and signed proposal terms.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
