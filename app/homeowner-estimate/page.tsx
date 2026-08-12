"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <CortexTopTabs />

      <PageHero
        align="left"
        kicker="Cortex Assistant Surface"
        title="Homeowner Estimate Assistant"
        subtitle="Homeowner-side AI assistant for quick project scoping, market pricing guardrails, and contractor-ready estimate preparation."
        actions={
          <Link href="/construction-solutions" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 transition">
            Open Contractor Construction Suite
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-6">
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Project Intake</h2>

            <label className="text-xs text-slate-400 block mb-2">
              Project category
              <input
                value={projectCategory}
                onChange={(event) => setProjectCategory(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400 block mb-2">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400 block mb-2">
              Budget preference
              <input
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400 block mb-2">
              Timeline preference
              <input
                value={timeline}
                onChange={(event) => setTimeline(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <label className="text-xs text-slate-400 block">
              Project description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full min-h-24 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <Button type="button" onClick={() => void runEstimateAssistant()} disabled={loading} className="mt-4 disabled:opacity-60">
              {loading ? 'Analyzing project...' : 'Run Homeowner Assistant'}
            </Button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Assistant Output</h2>
            {!homeownerAssistantSummary ? (
              <p className="text-sm text-slate-400">Run the assistant to see a recommended estimate range and readiness guidance.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Estimated total project cost</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    ${homeownerAssistantSummary.total.toLocaleString('en-US')}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Expected completion: about {homeownerAssistantSummary.timelineDays} days</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Local market guardrails</p>
                  <p className="mt-1">
                    ${homeownerAssistantSummary.guardrailLow} - ${homeownerAssistantSummary.guardrailHigh}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Homeowner assistant recommendation</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Based on your ZIP, scope, budget ({budget}), and timeline ({timeline}), request a contractor proposal packet with itemized labor/material lines and an e-sign link for acceptance.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Pricing Sources</h2>
            {!marketResult?.sourceInsights ? (
              <p className="text-sm text-slate-400">Market source comparisons will appear after assistant run.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-300">
                {marketResult.sourceInsights.map((source) => (
                  <li key={source.source} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-semibold text-white">{source.source}</p>
                    <p className="mt-1">Range: ${source.observedLow} - ${source.observedHigh}</p>
                    <p className="mt-1">Confidence: {source.confidence}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Homeowner Readiness Checklist</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              {readinessChecklist.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              This assistant provides planning estimates only. Final bids require contractor site verification and signed proposal terms.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}
