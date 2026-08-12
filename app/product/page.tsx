"use client";

import Link from 'next/link';
import { useState } from 'react';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
    icon: '🌐',
    title: 'Website + Landing Page Builder',
    detail: 'Generate SEO and GEO pages, render previews, then publish with domain setup.',
    href: '/website-builder',
    cta: 'Open Website Builder',
  },
  {
    icon: '📱',
    title: 'App Builder',
    detail: 'Build and publish client-facing or internal business apps with launch checklists.',
    href: '/app-builder',
    cta: 'Open App Builder',
  },
  {
    icon: '⚡',
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
    <PageShell>
      <PageHero
        align="left"
        kicker="Features"
        title="Estimator-first business growth platform"
        subtitle="Start with pricing intelligence, then move directly into CRM automations, SEO/GEO content, and launch-ready website or app builds in one seamless flow."
      />

      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-8">
        <Card>
          <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Quick Estimator</p>
          <h2 className="mt-2 text-xl font-bold text-white">Run a live pricing check</h2>
          <p className="mt-2 text-sm text-slate-400">Run homeowner ballpark and contractor bid signals without leaving this page.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-400">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>
            <label className="text-xs text-slate-400">
              City
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-400">
            Project category
            <input
              value={projectCategory}
              onChange={(event) => setProjectCategory(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
          </label>

          <label className="mt-3 block text-xs text-slate-400">
            Scope
            <textarea
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
          </label>

          <Button type="button" onClick={() => void runEstimator()} disabled={loading} className="mt-4 disabled:opacity-60">
            {loading ? 'Running estimator...' : 'Run Estimator'}
          </Button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {ballparkLow !== null && ballparkHigh !== null ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C69C6D] font-semibold">Homeowner ballpark</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {money(ballparkLow)} - {money(ballparkHigh)}
              </p>
            </div>
          ) : null}

          {bidTotal !== null ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C69C6D] font-semibold">Contractor bid view</p>
              <p className="mt-1">Detailed estimate total: {money(bidTotal)}</p>
              <p className="mt-1 text-xs text-slate-400">Estimated timeline: {timelineDays ?? 'n/a'} days</p>
            </div>
          ) : null}
        </Card>

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Connected Execution Modules</p>
          <h2 className="mt-2 text-xl font-bold text-white">Estimator outcomes feed directly into build and automation workflows</h2>
          <p className="mt-2 text-sm text-slate-400">So your team can move from idea to launch without tool switching.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {CONNECTED_MODULES.map((module) => (
              <Card key={module.title}>
                <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/60 flex items-center justify-center text-xl mb-4">{module.icon}</div>
                <h3 className="text-lg font-bold text-white">{module.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{module.detail}</p>
                <Link href={module.href} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C69C6D]">
                  {module.cta} <span>→</span>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
