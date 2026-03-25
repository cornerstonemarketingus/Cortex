"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

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
    sourceUrl?: string;
  }>;
  scrape?: {
    enabled?: boolean;
    sourcesRequested?: number;
    sourcesResolved?: number;
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

type ChatResponse = {
  responses?: string[];
  teamDecision?: string;
  error?: string;
};

const AUTOMATION_LIBRARY = [
  'AI voice receptionist and missed call text-back',
  'Orchestrated AI chatbot support',
  'Lead capture to close CRM pipeline automations',
  'Homeowner estimate follow-up and nurture',
  'Contractor bid reminder and proposal close flow',
  'Abandoned estimate recovery with SMS and email sequences',
  'No-show rescue and rebooking workflows',
  'Review generation, response drafting, and reputation monitoring',
  'Referral and loyalty automations with milestone rewards',
  'Seasonal campaign automation by service line and geography',
  'Lead scoring and priority routing for high-intent requests',
  'Google Business Profile optimization agent checks',
  'Directory and listing sweep optimization agent',
  'Autonomous business and revenue stream workflows',
] as const;

const PORTAL_FLOW = [
  {
    title: '1) Capture demand with estimator + local intent',
    detail: 'Use homeowner and contractor pricing workflows to turn search traffic into qualified leads.',
  },
  {
    title: '2) Build assets in one sprint',
    detail: 'Generate website, app, and landing pages with live previews and instant publish options.',
  },
  {
    title: '3) Activate CRM + AI automation',
    detail: 'Connect lead capture, call handling, follow-ups, reviews, and close workflows end to end.',
  },
  {
    title: '4) Deploy SEO/GEO + content engine',
    detail: 'Publish city and service clusters, optimize GBP and directories, then scale regional visibility.',
  },
  {
    title: '5) Operate with AI strategy council',
    detail: 'Run strategic decisions, launch planning, and weekly optimization with one coordinated AI team.',
  },
] as const;

const AI_BLOG_POOL = [
  {
    title: 'AI bid accuracy improvements for deck, roofing, and remodel scopes',
    summary: 'How generated line items and markup logic can tighten proposal confidence.',
    category: 'Estimating',
  },
  {
    title: 'Contractor CRM handoff playbook from estimate to signed work',
    summary: 'A practical operational sequence for converting estimates into won jobs.',
    category: 'CRM',
  },
  {
    title: 'Daily logs and maintenance workflows that protect margin',
    summary: 'Why field documentation and maintenance flows directly impact close rate and retention.',
    category: 'Operations',
  },
  {
    title: 'AI receptionist scripts that increase booked callbacks',
    summary: 'Voice and text orchestration tactics for reducing missed opportunities.',
    category: 'AI Automations',
  },
  {
    title: 'Cost database hygiene for faster, cleaner estimating',
    summary: 'How teams maintain line-item consistency and improve bid confidence over time.',
    category: 'Cost DB',
  },
  {
    title: 'From blueprint upload to scoped estimate: AI takeoff readiness',
    summary: 'What to prepare so plan-based estimating runs with fewer revisions.',
    category: 'AI Takeoff',
  },
] as const;

const ILLUSTRATIVE_TESTIMONIALS = [
  {
    quote:
      'Within two weeks we moved from scattered tools to one estimator, one CRM flow, and one dashboard our team actually uses daily.',
    name: 'Operations Lead, HVAC Team (Illustrative)',
  },
  {
    quote:
      'The 12-agent council gave us a clear launch plan for our landing pages and follow-up automations, and our response times improved fast.',
    name: 'Owner, Regional Remodeling Brand (Illustrative)',
  },
  {
    quote:
      'The biggest win was continuity: website updates, chat responses, and voice receptionist scripts now move together instead of breaking apart.',
    name: 'Growth Manager, Home Services Group (Illustrative)',
  },
] as const;

const CORE_OS_FEATURES = [
  'AI Bid Generator',
  'Proposals and Bids',
  'Change Orders',
  'Invoicing',
  'Client CRM',
  'Daily Logs',
  'Maintenance Jobs',
  'Cost Database',
  'AI Plan Takeoff',
  'Lead Marketplace',
] as const;

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CortexUnifiedWorkspacePage() {
  const [showVaultEntrance, setShowVaultEntrance] = useState(true);
  const [zipCode, setZipCode] = useState('55123');
  const [city, setCity] = useState('Eagan');
  const [projectCategory, setProjectCategory] = useState('roof-replacement');
  const [scope, setScope] = useState('Replace 2200 sq ft roof with architectural shingles and flashing updates.');
  const [scrapeWithoutApi, setScrapeWithoutApi] = useState(true);
  const [sourceUrlsRaw, setSourceUrlsRaw] = useState(
    'https://www.homewyse.com/services/cost_to_replace_roof.html, https://www.rsmeans.com'
  );

  const [estimatorLoading, setEstimatorLoading] = useState(false);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [estimatorError, setEstimatorError] = useState<string | null>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [marketData, setMarketData] = useState<MarketPricingResponse | null>(null);
  const [bidData, setBidData] = useState<BidEstimateResponse['estimate'] | null>(null);
  const [automationDraft, setAutomationDraft] = useState<string | null>(null);
  const [visibilityAudit, setVisibilityAudit] = useState<string | null>(null);
  const [strategicPlan, setStrategicPlan] = useState<string | null>(null);
  const [strategicLoading, setStrategicLoading] = useState(false);
  const [strategicError, setStrategicError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowVaultEntrance(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const sourceUrls = useMemo(
    () => sourceUrlsRaw.split(',').map((item) => item.trim()).filter((item) => item.length > 0),
    [sourceUrlsRaw]
  );

  const kpiStrip = useMemo(() => {
    const pipelineValue = bidData?.totals?.grandTotal || 0;

    return [
      {
        label: 'Conversion Performance',
        value: 'Optimized',
        note: 'Estimator-first funnel aligned for high-intent lead capture',
      },
      {
        label: 'Projected Pipeline Value',
        value: pipelineValue > 0 ? money(pipelineValue) : '$0',
        note: 'From current contractor bid scenario',
      },
      {
        label: 'Voice Receptionist Status',
        value: 'Instant Routing Enabled',
        note: 'Calls, missed-call recovery, and CRM handoff are connected',
      },
      {
        label: 'Automation Coverage',
        value: `${AUTOMATION_LIBRARY.length} workflows`,
        note: 'Configured service automations available',
      },
    ] as const;
  }, [bidData?.totals?.grandTotal]);

  const featuredArticles = useMemo(
    () => [...AI_BLOG_POOL].sort(() => Math.random() - 0.5).slice(0, 3),
    []
  );

  const runEstimator = async () => {
    if (estimatorLoading) return;
    setEstimatorLoading(true);
    setEstimatorError(null);

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
            scrapeWithoutApi,
            sourceUrls,
          }),
        }),
        fetch('/api/estimating/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: scope, zipCode, projectCategory }),
        }),
      ]);

      const marketParsed = (await marketRes.json().catch(() => ({}))) as MarketPricingResponse;
      const bidParsed = (await bidRes.json().catch(() => ({}))) as BidEstimateResponse;

      if (!marketRes.ok || !marketParsed.compiledEstimate) {
        throw new Error(marketParsed.error || `Estimator source lookup failed (${marketRes.status})`);
      }
      if (!bidRes.ok || !bidParsed.estimate) {
        throw new Error(bidParsed.error || `Detailed estimate failed (${bidRes.status})`);
      }

      setMarketData(marketParsed);
      setBidData(bidParsed.estimate);
    } catch (runError) {
      setEstimatorError(runError instanceof Error ? runError.message : 'Unable to run estimator.');
    } finally {
      setEstimatorLoading(false);
    }
  };

  const runAutomationDraft = async () => {
    if (automationLoading) return;
    setAutomationLoading(true);
    setAutomationError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bots',
          botIds: Array.from({ length: 12 }, (_, idx) => idx + 1),
          includeTeamDecision: true,
          learnFromMemory: true,
          tone: 'sales',
          message: `Create a production-ready CRM and AI automation implementation for ${projectCategory} in ${city}, ${zipCode}. Include voice receptionist, chat support, lifecycle messaging, and close workflows.`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || (!parsed.teamDecision && !parsed.responses?.[0])) {
        throw new Error(parsed.error || `Automation generation failed (${response.status})`);
      }

      setAutomationDraft(parsed.teamDecision || parsed.responses?.[0] || null);
    } catch (runError) {
      setAutomationError(runError instanceof Error ? runError.message : 'Unable to generate automation blueprint.');
    } finally {
      setAutomationLoading(false);
    }
  };

  const runVisibilityAudit = async () => {
    if (auditLoading) return;
    setAuditLoading(true);
    setAuditError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bots',
          botIds: Array.from({ length: 12 }, (_, idx) => idx + 1),
          includeTeamDecision: true,
          tone: 'support',
          message: `Run a Google Business Profile and directory optimization sweep for a ${projectCategory} service company in ${city}, ${zipCode}. Return top optimization actions, listing fixes, category improvements, photo/review recommendations, and conversion opportunities.`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || (!parsed.teamDecision && !parsed.responses?.[0])) {
        throw new Error(parsed.error || `Visibility audit failed (${response.status})`);
      }

      setVisibilityAudit(parsed.teamDecision || parsed.responses?.[0] || null);
    } catch (runError) {
      setAuditError(runError instanceof Error ? runError.message : 'Unable to run visibility audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  const runStrategicPlan = async () => {
    if (strategicLoading) return;
    setStrategicLoading(true);
    setStrategicError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bots',
          botIds: Array.from({ length: 12 }, (_, idx) => idx + 1),
          includeTeamDecision: true,
          learnFromMemory: true,
          tone: 'support',
          message: `Create one strategic business plan and launch plan for a ${projectCategory} company in ${city}, ${zipCode}. Include SEO/GEO roadmap, content cadence, app/website publish sequence, CRM automations, KPIs, and first 90-day revenue milestones.`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || (!parsed.teamDecision && !parsed.responses?.[0])) {
        throw new Error(parsed.error || `Strategic plan failed (${response.status})`);
      }

      setStrategicPlan(parsed.teamDecision || parsed.responses?.[0] || null);
    } catch (runError) {
      setStrategicError(runError instanceof Error ? runError.message : 'Unable to generate strategic plan right now.');
    } finally {
      setStrategicLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />

      {showVaultEntrance ? (
        <section className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[radial-gradient(circle_at_center,#1d4ed8_0%,#0a1a42_45%,#040915_100%)]">
          <div className="rounded-3xl border border-cyan-300/45 bg-cyan-500/10 px-8 py-6 text-center shadow-2xl shadow-blue-950/60 animate-pulse">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Vault Access</p>
            <h2 className="mt-2 text-3xl font-semibold text-cyan-50">Entering Bid Build</h2>
            <p className="mt-2 text-sm text-cyan-100/90">Estimator, builder, and automation systems online.</p>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <section className="mt-6 rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">AI Bid Generator</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Describe the Job. Get a Full Bid.</h1>
          <p className="mt-2 text-sm text-slate-200">
            Type a plain-English job description. AI generates your materials list, labor breakdown, margin guidance, and client-ready proposal in seconds.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-cyan-50">Describe the job
              <textarea value={scope} onChange={(event) => setScope(event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-cyan-50">ZIP code (optional)
              <input value={zipCode} onChange={(event) => setZipCode(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {[
              '16x16 treated lumber deck with composite railing and stairs',
              'Master bath remodel with tile, vanity, and updated plumbing',
              'Kitchen gut with cabinets, counters, appliances, and electrical',
              'Asphalt shingle roof replacement, 2400 sq ft',
              'Basement finish 800 sq ft with drywall and flooring',
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setScope(example)}
                className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-left text-xs text-cyan-50 hover:bg-cyan-500/25"
              >
                {example}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-xs text-cyan-50">Project category
            <input value={projectCategory} onChange={(event) => setProjectCategory(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          </label>

          <label className="mt-3 block text-xs text-cyan-50">City
            <input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm" />
          </label>

          <button type="button" onClick={() => void runEstimator()} disabled={estimatorLoading} className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60">
            {estimatorLoading ? 'Generating bid...' : 'Generate Bid'}
          </button>

          {estimatorError ? <p className="mt-3 text-sm text-red-300">{estimatorError}</p> : null}

          {marketData && bidData ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 text-sm text-slate-200">
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/80">Homeowner ballpark</p>
                <p className="mt-1 text-lg font-semibold">{money(marketData.compiledEstimate?.guardrailLow || 0)} - {money(marketData.compiledEstimate?.guardrailHigh || 0)}</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/80">Contractor bid detail</p>
                <p>Estimate total: {money(bidData.totals?.grandTotal || 0)}</p>
                <p className="mt-1 text-xs text-slate-300">Timeline: {bidData.timeline?.estimatedDays || 'n/a'} days</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-orange-300/35 bg-orange-500/10 p-5">
          <h2 className="text-2xl font-semibold text-orange-100">Primary Modules (2/2)</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-amber-300/35 bg-amber-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Module 1</p>
              <h3 className="mt-1 text-xl font-semibold text-amber-100">Open Page Builder (Website + App)</h3>
              <p className="mt-2 text-sm text-slate-200">
                Build both website and app assets in one connected workflow with landing pages, live previews, SEO/GEO setup, and publish controls.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/builder" className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Open Page Builder</Link>
                <Link href="/website-builder" className="rounded-lg bg-orange-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-200">Open Website Builder</Link>
                <Link href="/app-builder" className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold hover:bg-amber-500/30">Open App Builder</Link>
              </div>
            </article>

            <article className="rounded-2xl border border-rose-300/35 bg-rose-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-rose-200">Module 2</p>
              <h3 className="mt-1 text-xl font-semibold text-rose-100">AI Automations</h3>
              <p className="mt-2 text-sm text-slate-200">
                Activate CRM, voice receptionist, SEO/GEO operations, and autonomous growth workflows with direct actions and linked execution tools.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {AUTOMATION_LIBRARY.map((item) => (
                  <div key={item} className="rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void runAutomationDraft()} disabled={automationLoading} className="rounded-xl bg-rose-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-rose-200 disabled:opacity-60">
                  {automationLoading ? 'Generating...' : 'Generate Automation Blueprint'}
                </button>
                <button type="button" onClick={() => void runVisibilityAudit()} disabled={auditLoading} className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15 disabled:opacity-60">
                  {auditLoading ? 'Auditing...' : 'Run GBP + Directory Sweep'}
                </button>
                <Link href="/blog" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">Open Blog Operations</Link>
              </div>

              {automationError ? <p className="mt-3 text-sm text-red-300">{automationError}</p> : null}
              {automationDraft ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">{automationDraft}</pre> : null}
              {auditError ? <p className="mt-3 text-sm text-red-300">{auditError}</p> : null}
              {visibilityAudit ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">{visibilityAudit}</pre> : null}
            </article>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpiStrip.map((kpi) => (
            <article key={kpi.label} className="rounded-xl border border-white/15 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-200">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{kpi.value}</p>
              <p className="mt-1 text-xs text-slate-400">{kpi.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-yellow-300/35 bg-yellow-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-yellow-200">The complete operating system for contractors</p>
          <h2 className="mt-2 text-3xl font-semibold text-yellow-100 md:text-4xl">Run your entire business from one app</h2>
          <p className="mt-2 text-sm text-slate-200">
            Estimate, bid, invoice, manage clients, log jobsite progress, and close more work in one connected operating system built for contractors.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            {CORE_OS_FEATURES.map((feature) => (
              <div key={feature} className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-xs font-semibold text-slate-100">
                {feature}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-cyan-100">Seamless build to launch flow</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/website-builder" className="rounded-lg bg-orange-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-200">Build Website</Link>
              <Link href="/app-builder" className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold hover:bg-amber-500/30">Build App</Link>
              <Link href="/builder" className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Build Landing Page</Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {PORTAL_FLOW.map((step) => (
              <article key={step.title} className="rounded-xl border border-white/15 bg-black/20 p-3">
                <h3 className="text-sm font-semibold text-cyan-100">{step.title}</h3>
                <p className="mt-1 text-xs text-slate-300">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        

        <section className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-amber-100">AI strategic business and launch planner</h2>
            <button
              type="button"
              onClick={() => void runStrategicPlan()}
              disabled={strategicLoading}
              className="rounded-lg bg-orange-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-200 disabled:opacity-60"
            >
              {strategicLoading ? 'Generating plan...' : 'Generate 90-Day Plan'}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-50/90">
            This creates one consolidated plan covering SEO/GEO strategy, business model, launch sequence, automation setup, and operating KPIs.
          </p>
          {strategicError ? <p className="mt-3 text-sm text-red-300">{strategicError}</p> : null}
          {strategicPlan ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">{strategicPlan}</pre> : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-cyan-100">Our Featured Blog</h2>
            <Link href="/blog" className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Open company blog</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {featuredArticles.map((item) => (
              <article key={item.title} className="rounded-xl border border-white/15 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">{item.category}</p>
                <h3 className="mt-1 text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-xs text-slate-300">{item.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">Contractor Dashboard Snapshot</h2>
            <p className="mt-2 text-sm text-slate-300">Track pipeline, bids, and engagement in one control panel.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/15 bg-black/25 p-3"><p className="text-xs text-slate-400">Revenue Pipeline</p><p className="mt-1 text-lg font-semibold">$0</p><p className="text-xs text-slate-400">0 active bids</p></div>
              <div className="rounded-lg border border-white/15 bg-black/25 p-3"><p className="text-xs text-slate-400">Won Revenue</p><p className="mt-1 text-lg font-semibold">$0</p><p className="text-xs text-slate-400">0 accepted</p></div>
              <div className="rounded-lg border border-white/15 bg-black/25 p-3"><p className="text-xs text-slate-400">Bids Viewed</p><p className="mt-1 text-lg font-semibold">0</p><p className="text-xs text-slate-400">clients engaged</p></div>
              <div className="rounded-lg border border-white/15 bg-black/25 p-3"><p className="text-xs text-slate-400">Win Rate</p><p className="mt-1 text-lg font-semibold">0%</p><p className="text-xs text-slate-400">0 of 0 sent</p></div>
            </div>
          </article>

          <article className="rounded-2xl border border-yellow-300/35 bg-yellow-500/10 p-5">
            <h2 className="text-xl font-semibold text-yellow-100">Pipeline and Lead Capture</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-200">
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Estimate: 0</div>
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Proposal Sent: 0</div>
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Client Viewed: 0</div>
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Client Accepted: 0</div>
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Project Won: $0</div>
              <div className="rounded-lg border border-white/15 bg-black/25 px-3 py-2">Email List: 0</div>
            </div>
            <div className="mt-4 rounded-xl border border-white/15 bg-black/25 p-3 text-sm text-slate-300">
              Your lead capture page is ready to share on Google, Facebook, and Nextdoor.
              <div className="mt-2 flex gap-2">
                <button type="button" className="rounded-md bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Copy Link</button>
                <button type="button" className="rounded-md border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15">Share Lead Form</button>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-orange-100">Client voice preview</h2>
          <p className="mt-2 text-xs text-slate-300">
            These are illustrative testimonial examples for demo presentation. Replace with verified customer feedback before production marketing use.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {ILLUSTRATIVE_TESTIMONIALS.map((item) => (
              <article key={item.name} className="rounded-xl border border-white/15 bg-black/20 p-4">
                <p className="text-sm text-slate-200">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-3 text-xs font-semibold text-amber-200">{item.name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-4">
          <article>
            <h2 className="text-lg font-semibold text-cyan-100">Visit our Eagan office</h2>
            <p className="mt-2 text-sm text-slate-300">1236 Carlson Lake Ln, Eagan, MN 55123</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/15">
              <iframe
                title="Cortex office map"
                src="https://www.google.com/maps?q=1236+Carlson+Lake+Ln,+Eagan,+MN+55123&output=embed"
                className="h-64 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
          <h2 className="text-lg font-semibold text-cyan-100">Builder Studio</h2>
          <p className="mt-2 text-sm text-slate-300">Launch website and app assets from one connected builder workflow.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/website-builder" className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Website Builder</Link>
            <Link href="/app-builder" className="rounded-lg border border-yellow-300/40 bg-yellow-500/20 px-3 py-2 text-xs font-semibold hover:bg-yellow-500/30">App Builder</Link>
          </div>
        </section>

        <footer className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
            <h2 className="text-lg font-semibold text-cyan-100">Bid Build contact and trust center</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>Address: 1236 Carlson Lake Ln, Eagan, MN 55123</p>
              <p>Email: hello@bidbuild.ai</p>
              <p>Sales: +1 (612) 556-5408</p>
              <p>Support Hours: Mon-Fri, 8:00 AM - 6:00 PM CT</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <Link href="/pricing" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Pricing</Link>
              <Link href="/blog" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Blog</Link>
              <Link href="/website-builder" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Website Builder</Link>
              <Link href="/app-builder" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">App Builder</Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">© 2026 Bid Build. All rights reserved. Terms of Service.</p>
          </footer>
      </div>
    </main>
  );
}
