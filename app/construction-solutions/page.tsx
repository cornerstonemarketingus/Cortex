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

type Audience = "homeowner" | "contractor";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const AUDIENCE_CONTENT: Record<
  Audience,
  {
    kicker: string;
    title: string;
    subtitle: string;
    inputsHeading: string;
    scopeLabel: string;
    ctaLabel: string;
    resultsHeading: string;
    rangeLabel: string;
    nextStepsHeading: string;
    nextLinks: Array<{ href: string; label: string }>;
  }
> = {
  homeowner: {
    kicker: "For Homeowners",
    title: "Know a fair price before you talk to a contractor",
    subtitle:
      "Get an unbiased ballpark range for your project, sourced from real pricing data, so you can walk into contractor conversations informed — not guessing.",
    inputsHeading: "Tell us about your project",
    scopeLabel: "What do you want done?",
    ctaLabel: "Get My Fair Price Range",
    resultsHeading: "What you should expect to pay",
    rangeLabel: "Fair Price Range",
    nextStepsHeading: "Ready to hire?",
    nextLinks: [
      { href: "/homeowner-estimate", label: "Get a detailed project readiness checklist" },
      { href: "/contact", label: "Talk to our team about matching with a contractor" },
    ],
  },
  contractor: {
    kicker: "For Contractors",
    title: "Price competitively and win more bids",
    subtitle:
      "Run the same market-pricing engine your customers use, then see exactly where your bid lands against real regional pricing signals before you send it.",
    inputsHeading: "Scope the job",
    scopeLabel: "Project scope",
    ctaLabel: "Get My Bid Range",
    resultsHeading: "Market positioning",
    rangeLabel: "Market Guardrail Range",
    nextStepsHeading: "Turn this into a job",
    nextLinks: [
      { href: "/builder-copilot", label: "Open Builder Copilot CRM + automations" },
      { href: "/ai-automation-solutions", label: "Open AI receptionist workspace" },
      { href: "/website-builder", label: "Build a lead-gen website" },
    ],
  },
};

const HOMEOWNER_HIRING_TIPS = [
  "Get at least 3 quotes so you can spot outliers before you commit.",
  "Verify the contractor is licensed, bonded, and insured in your state.",
  "Get the full scope, materials, and payment schedule in writing before work starts.",
];

export default function ConstructionSolutionsPage() {
  const [audience, setAudience] = useState<Audience>("homeowner");
  const [zipCode, setZipCode] = useState("55123");
  const [projectCategory, setProjectCategory] = useState("roof-replacement");
  const [scope, setScope] = useState("Replace 2200 sq ft roof with architectural shingles and basic flashing updates.");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [market, setMarket] = useState<MarketPricingResponse | null>(null);
  const [bid, setBid] = useState<BidEstimateResponse["estimate"] | null>(null);

  const content = AUDIENCE_CONTENT[audience];

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

  const marketPosition = useMemo(() => {
    if (audience !== "contractor" || !market?.compiledEstimate || !bid?.totals?.grandTotal) return null;
    const { guardrailLow, guardrailHigh } = market.compiledEstimate;
    const total = bid.totals.grandTotal;
    if (guardrailLow == null || guardrailHigh == null) return null;

    if (total < guardrailLow) {
      const under = Math.round(((guardrailLow - total) / guardrailLow) * 100);
      return { verdict: "Below market", detail: `Your bid is about ${under}% under the regional low. You may be leaving margin on the table.`, tone: "amber" as const };
    }
    if (total > guardrailHigh) {
      const over = Math.round(((total - guardrailHigh) / guardrailHigh) * 100);
      return { verdict: "Above market", detail: `Your bid is about ${over}% above the regional high. Be ready to justify the premium.`, tone: "amber" as const };
    }
    return { verdict: "Within market range", detail: "Your bid lands inside the regional guardrail range — competitive and defensible.", tone: "emerald" as const };
  }, [audience, market, bid]);

  return (
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <CortexTopTabs />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="glass rise-in rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100">{content.kicker}</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">{content.title}</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">{content.subtitle}</p>
        </header>

        <div className="mt-6 inline-flex rounded-xl border border-white/15 bg-white/5 p-1">
          {(["homeowner", "contractor"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAudience(option)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                audience === option ? "bg-[#C69C6D] text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              I&apos;m a {option === "homeowner" ? "Homeowner" : "Contractor"}
            </button>
          ))}
        </div>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/12 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">{content.inputsHeading}</h2>

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
              {content.scopeLabel}
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
              {loading ? "Calculating..." : content.ctaLabel}
            </button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-amber-100">{content.resultsHeading}</h2>
            {!market || !bid ? (
              <p className="mt-3 text-sm text-slate-300">
                {audience === "homeowner"
                  ? "Run the calculator to see a fair price range for your project before you get quotes."
                  : "Run the estimator to see pricing guardrails and where your bid lands against the market."}
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">{content.rangeLabel}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {money(market.compiledEstimate?.guardrailLow || 0)} - {money(market.compiledEstimate?.guardrailHigh || 0)}
                  </p>
                </div>

                {audience === "contractor" && marketPosition ? (
                  <div
                    className={`rounded-xl border p-3 ${
                      marketPosition.tone === "emerald" ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-400/30 bg-amber-500/10"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-[0.16em] ${marketPosition.tone === "emerald" ? "text-emerald-200" : "text-amber-200"}`}>
                      Your bid: {money(bid.totals?.grandTotal || 0)} — {marketPosition.verdict}
                    </p>
                    <p className="mt-1 text-xs text-slate-200">{marketPosition.detail}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Detailed Estimate</p>
                    <p className="mt-1">Estimated project total: {money(bid.totals?.grandTotal || 0)}</p>
                    <p className="mt-1 text-xs text-slate-300">Estimated timeline: {bid.timeline?.estimatedDays || "n/a"} days</p>
                  </div>
                )}

                {audience === "homeowner" ? (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">Before You Hire</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {HOMEOWNER_HIRING_TIPS.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

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

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{content.nextStepsHeading}</h2>
          <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap">
            {content.nextLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 hover:bg-white/15"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {audience === "contractor" ? (
          <section className="mt-6">
            <BuilderCopilotPanel
              title="Estimator Builder Copilot"
              subtitle="Generate exact follow-up copy, pricing assumptions, and implementation-ready CRM actions from this estimate context."
              defaultPrompt="Build a precise post-estimate sequence with SMS, voicemail receptionist fallback, and email follow-up tailored to this project scope."
              contextLabel="construction-solutions"
              showProvisioning
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
