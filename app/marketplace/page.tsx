"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import { useAdminSession } from '@/components/auth/useAdminSession';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
    <main className="min-h-screen bg-[#070b10] text-white">
      <CortexTopTabs />

      <PageHero
        align="left"
        kicker="Revenue Marketplace"
        title="Cortex Contractor Marketplace"
        subtitle="High-ROI marketplace engine: Stripe payments, Twilio speed advantage, Maps-based routing, SendGrid lifecycle messaging, and trust-layer scoring for verified contractor placement."
      />

      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-white mb-3">Phase 1 Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {integrations.map((integration) => (
              <article key={integration.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                <p className="font-semibold text-white">{integration.label}</p>
                <p className="text-xs mt-1 text-slate-400">{integration.nextStep}</p>
                <p className="mt-2 text-xs">
                  Status:{' '}
                  <span className={integration.configured ? 'text-emerald-300' : 'text-[#C69C6D]'}>
                    {integration.configured ? 'configured' : 'needs setup'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Env: {integration.envVars.join(' | ')}</p>
              </article>
            ))}
          </div>
          {missingPhaseOneIntegrations.length > 0 ? (
            <p className="text-xs text-[#C69C6D] mt-3">
              Phase 1 blockers: {missingPhaseOneIntegrations.map((item) => item.id).join(', ')}
            </p>
          ) : (
            <p className="text-xs text-emerald-300 mt-3">All Phase 1 integrations are configured.</p>
          )}
        </Card>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Live Lead Scoring + Smart Routing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-slate-400 block">
                Service type
                <input
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
              <label className="text-xs text-slate-400 block">
                Project type
                <input
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
              <label className="text-xs text-slate-400 block">
                Budget (USD)
                <input
                  type="number"
                  value={budgetUsd}
                  onChange={(event) => setBudgetUsd(Number(event.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
              <label className="text-xs text-slate-400 block">
                Timeline (days)
                <input
                  type="number"
                  value={timelineDays}
                  onChange={(event) => setTimelineDays(Number(event.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
              <label className="text-xs text-slate-400 block">
                ZIP code
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
              <label className="text-xs text-slate-400 block">
                Homeowner name
                <input
                  value={homeownerName}
                  onChange={(event) => setHomeownerName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
            </div>

            <label className="text-xs text-slate-400 block mt-2">
              Request notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full min-h-20 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <label className="text-xs text-slate-400 block">
                Assignment mode
                <select
                  value={assignmentMode}
                  onChange={(event) => setAssignmentMode(event.target.value as AssignmentMode)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                >
                  <option value="claim">Pay-per-lead claim</option>
                  <option value="auto-assign">Auto-assign premium tier</option>
                </select>
              </label>
              <label className="text-xs text-slate-400 block">
                Claim window (minutes)
                <input
                  type="number"
                  value={claimWindowMinutes}
                  onChange={(event) => setClaimWindowMinutes(Number(event.target.value) || 15)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>
            </div>

            <Button type="button" onClick={() => void runRoutingSimulation()} disabled={loading} className="mt-4 disabled:opacity-60">
              {loading ? 'Running routing engine...' : 'Run Lead Marketplace Simulation'}
            </Button>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-white mb-3">Routing Output</h2>
            {!routing ? (
              <p className="text-sm text-slate-400">Run a simulation to view lead score, premium pricing, and contractor assignment.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Lead intent</p>
                  <p className="mt-1">
                    Score: <span className="font-semibold text-white">{routing.intent.score}</span> ({routing.intent.band})
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Premium lead price: ${routing.intent.premiumLeadPriceUsd}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Assignment</p>
                  {routing.assignment.status === 'assigned' ? (
                    <p className="mt-1 text-emerald-300">Auto-assigned to {routing.assignment.assignedContractorName}</p>
                  ) : (
                    <p className="mt-1 text-[#C69C6D]">
                      Claim window open ({routing.assignment.claimWindowMinutes} minutes)
                    </p>
                  )}
                  <p className="mt-1 text-xs">{routing.monetization.subscriptionUpsell}</p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-slate-500">Speed advantage system</p>
                  <p className="mt-1 text-xs">
                    Best-response benchmark: {routing.speedAdvantage.expectedBestResponseMinutes} min (target {routing.speedAdvantage.benchmarkFirstResponseMinutes} min)
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>

        <Card>
          <h2 className="text-lg font-bold text-white mb-3">Contractor Ranking Board</h2>
          {!routing || routing.rankedContractors.length === 0 ? (
            <p className="text-sm text-slate-400">No contractor rankings yet. Run simulation first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-white/10">
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
                    <tr key={contractor.id} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 pr-3">{contractor.name}</td>
                      <td className="py-2 pr-3 uppercase">{contractor.tier}</td>
                      <td className="py-2 pr-3">{contractor.responseTimeMinutes} min</td>
                      <td className="py-2 pr-3">{Math.round(contractor.winRate * 100)}%</td>
                      <td className="py-2 pr-3">{contractor.rating.toFixed(1)}</td>
                      <td className="py-2 pr-3">{contractor.verified ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-3">{contractor.autoAssignEnabled ? 'yes' : 'no'}</td>
                      <td className="py-2 pr-3 font-semibold text-[#C69C6D]">{contractor.routingScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-bold text-white mb-2">Website Builder: Verticalized Strategy</h2>
            <p className="text-sm text-slate-400 mb-3">
              Compete with vertical outcomes, not generic website editing. Focus on contractor lead generation systems.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              {websiteBuilderMustHaves.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{item}</li>
              ))}
            </ul>
            <Link href="/website-builder" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C69C6D]">
              Open Verticalized Website Builder <span>→</span>
            </Link>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-white mb-2">App Builder: Keep It Narrow</h2>
            <p className="text-sm text-slate-400 mb-3">
              Build business system generators, not general-purpose app builders.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              {appBuilderNarrowFocus.map((item) => (
                <li key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{item}</li>
              ))}
            </ul>
            <Link href="/app-builder" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C69C6D]">
              Open Business System App Builder <span>→</span>
            </Link>
          </Card>
        </section>

        <Card>
          <h2 className="text-lg font-bold text-white mb-3">Idea To Live Business In 10 Minutes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-[#C69C6D] mb-2 font-semibold">Launch flow</p>
              <ul className="space-y-1 text-xs text-slate-300">
                {launchFlow.map((step) => (
                  <li key={step}>- {step}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs text-[#C69C6D] mb-2 font-semibold">Differentiator</p>
              <p className="text-xs text-slate-300">
                Cortex does not stop at site generation. It launches a revenue-ready operating system with lead capture,
                routing, follow-up, and payment logic active from day one.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-white mb-3">Priority Roadmap</h2>
          {phaseRoadmap.length === 0 ? (
            <p className="text-sm text-slate-400">Roadmap will appear after marketplace status loads.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {phaseRoadmap.map((phase) => (
                <article key={phase.phase} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-semibold text-white">{phase.phase}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {phase.focus.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">Focused actions for this week</p>
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <Link href="/devboard?tab=marketplace" className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition">
                  Open Marketplace Control Tab
                </Link>
              ) : null}
              <Link href="/business-builder" className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition">
                Open Business Builder
              </Link>
              <Link href="/construction-solutions" className="rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition">
                Open Construction Workflow
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
