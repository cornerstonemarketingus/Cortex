"use client";

import Link from 'next/link';
import { useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type MarketPricingResponse = {
  compiledEstimate?: {
    guardrailLow?: number;
    guardrailHigh?: number;
  };
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

const CONNECTED_MODULES = [
  {
    title: 'Website + Landing Page Builder',
    detail: 'Generate SEO and GEO pages, render previews, then publish with domain setup.',
    href: '/website-builder',
    cta: 'Open Website Builder',
  },
  {
    title: 'App Builder',
    detail: 'Build and publish client-facing or internal business apps with launch checklists.',
    href: '/app-builder',
    cta: 'Open App Builder',
  },
  {
    title: 'CRM + AI Automation System',
    detail: 'Connect voice receptionist, lead nurture, review loops, and sales pipeline movement.',
    href: '/cortex',
    cta: 'Open Automation Workspace',
  },
] as const;

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductPage() {
  const [zipCode, setZipCode] = useState('55123');
  const [city, setCity] = useState('Eagan');
  const [projectCategory, setProjectCategory] = useState('roof-replacement');
  const [scope, setScope] = useState('Replace 2200 sq ft roof with architectural shingles and flashing updates.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ballparkLow, setBallparkLow] = useState<number | null>(null);
  const [ballparkHigh, setBallparkHigh] = useState<number | null>(null);
  const [bidTotal, setBidTotal] = useState<number | null>(null);
  const [timelineDays, setTimelineDays] = useState<number | null>(null);

  const runEstimator = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const [marketRes, bidRes] = await Promise.all([
        fetch('/api/construction/market-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCode,
            city,
            projectCategory,
            scopeDescription: scope,
            scrapeWithoutApi: true,
          }),
        }),
        fetch('/api/estimating/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: scope,
            zipCode,
            projectCategory,
          }),
        }),
      ]);

      const marketParsed = (await marketRes.json().catch(() => ({}))) as MarketPricingResponse;
      const bidParsed = (await bidRes.json().catch(() => ({}))) as BidEstimateResponse;

      if (!marketRes.ok || !marketParsed.compiledEstimate) {
        throw new Error(marketParsed.error || `Estimator failed (${marketRes.status})`);
      }

      if (!bidRes.ok || !bidParsed.estimate) {
        throw new Error(bidParsed.error || `Bid estimate failed (${bidRes.status})`);
      }

      setBallparkLow(marketParsed.compiledEstimate.guardrailLow ?? null);
      setBallparkHigh(marketParsed.compiledEstimate.guardrailHigh ?? null);
      setBidTotal(bidParsed.estimate.totals?.grandTotal ?? null);
      setTimelineDays(bidParsed.estimate.timeline?.estimatedDays ?? null);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run estimator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1f1613] via-[#2b1f1a] to-[#171313] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <header className="rounded-3xl border border-white/15 bg-white/5 p-7 md:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-orange-200">Features</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">Estimator-first business growth platform</h1>
          <p className="mt-3 max-w-4xl text-sm text-slate-300 md:text-base">
            Start with pricing intelligence, then move directly into CRM automations, SEO/GEO content, and launch-ready website or app builds in one seamless flow.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-5">
          <h2 className="text-2xl font-semibold text-amber-100">Quick estimator</h2>
          <p className="mt-2 text-sm text-slate-200">Run homeowner ballpark and contractor bid signals without leaving this page.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-amber-50">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-amber-50">
              City
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-amber-50">
            Project category
            <input
              value={projectCategory}
              onChange={(event) => setProjectCategory(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-3 block text-xs text-amber-50">
            Scope
            <textarea
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => void runEstimator()}
            disabled={loading}
            className="mt-4 rounded-xl bg-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-200 disabled:opacity-60"
          >
            {loading ? 'Running estimator...' : 'Run Estimator'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {ballparkLow !== null && ballparkHigh !== null ? (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-orange-100/80">Homeowner ballpark</p>
              <p className="mt-1 text-lg font-semibold">
                {money(ballparkLow)} - {money(ballparkHigh)}
              </p>
            </div>
          ) : null}

          {bidTotal !== null ? (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-orange-100/80">Contractor bid view</p>
              <p className="mt-1">Detailed estimate total: {money(bidTotal)}</p>
              <p className="mt-1 text-xs text-slate-300">Estimated timeline: {timelineDays ?? 'n/a'} days</p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-2xl font-semibold text-orange-100">Connected execution modules</h2>
          <p className="mt-2 text-sm text-slate-300">
            Estimator outcomes feed directly into build and automation workflows so your team can move from idea to launch without tool switching.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {CONNECTED_MODULES.map((module) => (
              <article key={module.title} className="rounded-xl border border-white/15 bg-black/20 p-4">
                <h3 className="text-lg font-semibold text-amber-100">{module.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{module.detail}</p>
                <Link
                  href={module.href}
                  className="mt-4 inline-flex rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold hover:bg-amber-500/30"
                >
                  {module.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
