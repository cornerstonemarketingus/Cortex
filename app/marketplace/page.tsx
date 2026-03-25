"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import { useAdminSession } from '@/components/auth/useAdminSession';

type AssignmentMode = 'claim' | 'auto-assign';

type IntegrationStatus = {
  id: string;
  label: string;
  configured: boolean;
  requiredForPhaseOne: boolean;
  envVars: string[];
  nextStep: string;
};

type RankedContractor = {
  id: string;
  name: string;
  tier: 'starter' | 'pro' | 'premium';
  responseTimeMinutes: number;
  winRate: number;
  rating: number;
  verified: boolean;
  autoAssignEnabled: boolean;
  routingScore: number;
  reasons: string[];
};

type MarketplaceRouting = {
  intent: {
    score: number;
    band: 'high-intent' | 'medium-intent' | 'low-intent';
    premiumLeadPriceUsd: number;
    components: {
      budget: number;
      urgency: number;
      projectComplexity: number;
      dataQuality: number;
    };
  };
  assignment: {
    status: 'assigned' | 'claim-window-open';
    assignedContractorId?: string;
    assignedContractorName?: string;
    claimWindowMinutes?: number;
    claimQueue?: Array<{ contractorId: string; contractorName: string; routingScore: number }>;
  };
  rankedContractors: RankedContractor[];
  speedAdvantage: {
    benchmarkFirstResponseMinutes: number;
    expectedBestResponseMinutes: number;
    notes: string[];
  };
  monetization: {
    recommendedLeadPriceUsd: number;
    premiumPlacementAvailable: boolean;
    subscriptionUpsell: string;
  };
};

type PhaseRoadmap = Array<{ phase: string; focus: string[] }>;

type MarketplaceApiResponse = {
  integrations: IntegrationStatus[];
  routing?: MarketplaceRouting;
  phaseRoadmap?: PhaseRoadmap;
  error?: string;
};

const websiteBuilderMustHaves = [
  'One-click contractor site generation from business name + services + location',
  'Pre-built conversion blocks: quote form, click-to-call, trust badges, before/after gallery',
  'Direct marketplace + CRM integration with auto follow-up and attribution tracking',
  'Domain buy + auto-connect + one-click publish via GoDaddy and Namecheap integrations',
];

const appBuilderNarrowFocus = [
  'Template system by industry: contractors, cleaning, landscaping',
  'Automation presets: missed call to text, lead to follow-up, estimate to reminder',
  'Modular generator outputs: CRM module, automation module, website module, marketplace module',
  'Business system generation instead of generic no-code app building',
];

const launchFlow = [
  'User signs up and chooses business type',
  'AI generates website, copy, and lead form',
  'User buys domain and auto-connects DNS',
  'User clicks Launch and site + lead engine go live',
];

export default function MarketplacePage() {
  const [serviceType, setServiceType] = useState('roofing');
  const [projectType, setProjectType] = useState('roof-replacement');
  const [budgetUsd, setBudgetUsd] = useState(18000);
  const [timelineDays, setTimelineDays] = useState(7);
  const [zipCode, setZipCode] = useState('55123');
  const [homeownerName, setHomeownerName] = useState('Alex Martin');
  const [notes, setNotes] = useState('Need full tear-off and upgraded warranty package.');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('claim');
  const [claimWindowMinutes, setClaimWindowMinutes] = useState(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [routing, setRouting] = useState<MarketplaceRouting | null>(null);
  const [phaseRoadmap, setPhaseRoadmap] = useState<PhaseRoadmap>([]);
  const { isAdmin } = useAdminSession();

  const missingPhaseOneIntegrations = useMemo(
    () => integrations.filter((item) => item.requiredForPhaseOne && !item.configured),
    [integrations]
  );

  const loadIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/marketplace');
      const parsed = (await response.json().catch(() => ({}))) as MarketplaceApiResponse;

      if (!response.ok) {
        throw new Error(parsed.error || `Failed to load marketplace status (${response.status})`);
      }

      setIntegrations(parsed.integrations || []);
      setPhaseRoadmap(parsed.phaseRoadmap || []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load integrations';
      setError(message);
    }
  };

  useEffect(() => {
    void loadIntegrationStatus();
  }, []);

  const runRoutingSimulation = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score-route',
          assignmentMode,
          claimWindowMinutes,
          lead: {
            serviceType,
            projectType,
            budgetUsd,
            timelineDays,
            zipCode,
            homeownerName,
            notes,
          },
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as MarketplaceApiResponse;
      if (!response.ok || !parsed.routing) {
        throw new Error(parsed.error || `Routing simulation failed (${response.status})`);
      }

      setIntegrations(parsed.integrations || []);
      setPhaseRoadmap(parsed.phaseRoadmap || []);
      setRouting(parsed.routing);
    } catch (simulationError) {
      const message = simulationError instanceof Error ? simulationError.message : 'Failed to run simulation';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#04122f] via-[#081f52] to-[#061330] text-white">
      <CortexTopTabs />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Revenue Marketplace</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Cortex Contractor Marketplace</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            High-ROI marketplace engine: Stripe payments, Twilio speed advantage, Maps-based routing, SendGrid lifecycle messaging,
            and trust-layer scoring for verified contractor placement.
          </p>
        </header>

        <section className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-5 mb-6">
          <h2 className="text-lg font-semibold text-cyan-100 mb-3">Phase 1 Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {integrations.map((integration) => (
              <article key={integration.id} className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
                <p className="font-semibold text-slate-100">{integration.label}</p>
                <p className="text-xs mt-1 text-slate-300">{integration.nextStep}</p>
                <p className="mt-2 text-xs">
                  Status:{' '}
                  <span className={integration.configured ? 'text-emerald-300' : 'text-amber-300'}>
                    {integration.configured ? 'configured' : 'needs setup'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Env: {integration.envVars.join(' | ')}</p>
              </article>
            ))}
          </div>
          {missingPhaseOneIntegrations.length > 0 ? (
            <p className="text-xs text-amber-200 mt-3">
              Phase 1 blockers: {missingPhaseOneIntegrations.map((item) => item.id).join(', ')}
            </p>
          ) : (
            <p className="text-xs text-emerald-200 mt-3">All Phase 1 integrations are configured.</p>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-5">
            <h2 className="text-lg font-semibold text-indigo-100 mb-3">Live Lead Scoring + Smart Routing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-indigo-100 block">
                Service type
                <input
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-indigo-100 block">
                Project type
                <input
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-indigo-100 block">
                Budget (USD)
                <input
                  type="number"
                  value={budgetUsd}
                  onChange={(event) => setBudgetUsd(Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-indigo-100 block">
                Timeline (days)
                <input
                  type="number"
                  value={timelineDays}
                  onChange={(event) => setTimelineDays(Number(event.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-indigo-100 block">
                ZIP code
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-indigo-100 block">
                Homeowner name
                <input
                  value={homeownerName}
                  onChange={(event) => setHomeownerName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-xs text-indigo-100 block mt-2">
              Request notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full min-h-20 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <label className="text-xs text-indigo-100 block">
                Assignment mode
                <select
                  value={assignmentMode}
                  onChange={(event) => setAssignmentMode(event.target.value as AssignmentMode)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                >
                  <option value="claim">Pay-per-lead claim</option>
                  <option value="auto-assign">Auto-assign premium tier</option>
                </select>
              </label>
              <label className="text-xs text-indigo-100 block">
                Claim window (minutes)
                <input
                  type="number"
                  value={claimWindowMinutes}
                  onChange={(event) => setClaimWindowMinutes(Number(event.target.value) || 15)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void runRoutingSimulation()}
              disabled={loading}
              className="mt-3 rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
            >
              {loading ? 'Running routing engine...' : 'Run Lead Marketplace Simulation'}
            </button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">Routing Output</h2>
            {!routing ? (
              <p className="text-sm text-slate-300">Run a simulation to view lead score, premium pricing, and contractor assignment.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Lead intent</p>
                  <p className="mt-1">
                    Score: <span className="font-semibold text-slate-100">{routing.intent.score}</span> ({routing.intent.band})
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Premium lead price: ${routing.intent.premiumLeadPriceUsd}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Assignment</p>
                  {routing.assignment.status === 'assigned' ? (
                    <p className="mt-1 text-emerald-200">Auto-assigned to {routing.assignment.assignedContractorName}</p>
                  ) : (
                    <p className="mt-1 text-amber-200">
                      Claim window open ({routing.assignment.claimWindowMinutes} minutes)
                    </p>
                  )}
                  <p className="mt-1 text-xs">{routing.monetization.subscriptionUpsell}</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Speed advantage system</p>
                  <p className="mt-1 text-xs">
                    Best-response benchmark: {routing.speedAdvantage.expectedBestResponseMinutes} min (target {routing.speedAdvantage.benchmarkFirstResponseMinutes} min)
                  </p>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-blue-300/25 bg-blue-500/10 p-5 mb-6">
          <h2 className="text-lg font-semibold text-blue-100 mb-3">Contractor Ranking Board</h2>
          {!routing || routing.rankedContractors.length === 0 ? (
            <p className="text-sm text-slate-300">No contractor rankings yet. Run simulation first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-slate-300 border-b border-white/10">
                    <th className="py-2 pr-3">Contractor</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Response</th>
                    <th className="py-2 pr-3">Win Rate</th>
                    <th className="py-2 pr-3">Rating</th>
                    <th className="py-2 pr-3">Verified</th>
                    <th className="py-2 pr-3">Auto-Assign</th>
                    <th className="py-2 pr-3">Routing Score</th>
                  </tr>
                </thead>
                <tbody>
                  {routing.rankedContractors.map((contractor) => (
                    <tr key={contractor.id} className="border-b border-white/5 text-slate-100">
                      <td className="py-2 pr-3">{contractor.name}</td>
                      <td className="py-2 pr-3 uppercase">{contractor.tier}</td>
                      <td className="py-2 pr-3">{contractor.responseTimeMinutes} min</td>
                      <td className="py-2 pr-3">{Math.round(contractor.winRate * 100)}%</td>
                      <td className="py-2 pr-3">{contractor.rating.toFixed(1)}</td>
                      <td className="py-2 pr-3">{contractor.verified ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-3">{contractor.autoAssignEnabled ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-3 font-semibold text-cyan-200">{contractor.routingScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
            <h2 className="text-lg font-semibold text-emerald-100 mb-2">Website Builder: Verticalized Strategy</h2>
            <p className="text-sm text-emerald-50 mb-3">
              Compete with vertical outcomes, not generic website editing. Focus on contractor lead generation systems.
            </p>
            <ul className="space-y-2 text-xs text-slate-100">
              {websiteBuilderMustHaves.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">{item}</li>
              ))}
            </ul>
            <Link href="/website-builder" className="mt-3 inline-flex rounded-lg border border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2 text-xs font-semibold">
              Open Verticalized Website Builder
            </Link>
          </article>

          <article className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-5">
            <h2 className="text-lg font-semibold text-fuchsia-100 mb-2">App Builder: Keep It Narrow</h2>
            <p className="text-sm text-fuchsia-50 mb-3">
              Build business system generators, not general-purpose app builders.
            </p>
            <ul className="space-y-2 text-xs text-slate-100">
              {appBuilderNarrowFocus.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">{item}</li>
              ))}
            </ul>
            <Link href="/app-builder" className="mt-3 inline-flex rounded-lg border border-fuchsia-300/40 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 px-4 py-2 text-xs font-semibold">
              Open Business System App Builder
            </Link>
          </article>
        </section>

        <section className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5 mb-6">
          <h2 className="text-lg font-semibold text-amber-100 mb-2">Idea To Live Business In 10 Minutes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-amber-200 mb-2">Launch flow</p>
              <ul className="space-y-1 text-xs text-slate-100">
                {launchFlow.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-amber-200 mb-2">Differentiator</p>
              <p className="text-xs text-slate-100">
                Cortex does not stop at site generation. It launches a revenue-ready operating system with lead capture,
                routing, follow-up, and payment logic active from day one.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-black/25 p-5 mb-6">
          <h2 className="text-lg font-semibold text-cyan-100 mb-3">Priority Roadmap</h2>
          {phaseRoadmap.length === 0 ? (
            <p className="text-sm text-slate-300">Roadmap will appear after marketplace status loads.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {phaseRoadmap.map((phase) => (
                <article key={phase.phase} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="font-semibold text-slate-100">{phase.phase}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {phase.focus.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-200">Focused actions for this week</p>
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <Link href="/devboard?tab=marketplace" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-xs font-semibold">
                  Open Marketplace Control Tab
                </Link>
              ) : null}
              <Link href="/business-builder" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-semibold">
                Open Business Builder
              </Link>
              <Link href="/construction-solutions" className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2 text-xs font-semibold">
                Open Construction Workflow
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
