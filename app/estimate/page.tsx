"use client";

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import EstimatorChatbotPanel from '@/components/estimator/EstimatorChatbotPanel';

type PublicEstimateResponse = {
  mode?: 'preview' | 'full';
  projectType?: string;
  estimateRange?: {
    low: number;
    average: number;
    high: number;
    spreadPercent: number;
  };
  instantSummary?: string;
  aiInsights?: {
    scopeAdjustments: string[];
    costSavingIdeas: string[];
    qualification: {
      budgetSignal: 'strong' | 'moderate' | 'weak';
      timelineSignal: 'urgent' | 'normal' | 'flexible';
      recommendation: string;
    };
  };
  estimate?: {
    estimateId: string;
    categoryLabel: string;
    totals: {
      materials: number;
      labor: number;
      overhead: number;
      profit: number;
      grandTotal: number;
    };
    timeline: {
      estimatedDays: number;
      crewSize: number;
    };
    materials: Array<{ item: string; quantity: number; unit: string; unitCost: number }>;
    labor: Array<{ trade: string; hours: number; hourlyRate: number }>;
    assumptions: string[];
  };
  lead?: {
    id: string;
    firstName: string;
    email?: string | null;
    phone?: string | null;
    stage: string;
  };
  delivery?: {
    channel: string;
    provider: string;
    status: string;
    detail: string;
    outboundMessageId?: string | null;
    error?: string;
  } | null;
  error?: string;
};

type TakeoffResponse = {
  estimate?: {
    estimateId?: string;
    totals?: {
      grandTotal?: number;
    };
    materials?: Array<{ item: string; quantity: number; unit: string }>;
  };
  code?: string;
  error?: string;
};

type SubscriptionStatusResponse = {
  active?: boolean;
  tier?: string | null;
  includedCredits?: number;
  usedCredits?: number;
  remainingCredits?: number;
  error?: string;
};

const projectTypes = [
  'roof-replacement',
  'deck',
  'kitchen-gut',
  'bathroom-remodel',
  'basement-finish',
  'general-construction',
] as const;

export default function EstimatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0d12] text-slate-100">
          <PublicMarketingNav />
          <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
            <header className="rounded-2xl border border-white/10 bg-[#11151d] p-6 mb-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Public Cost Calculator</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Get A Ballpark Estimate In Under 60 Seconds</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300">Loading estimator...</p>
            </header>
          </div>
        </main>
      }
    >
      <EstimatePageContent />
    </Suspense>
  );
}

function EstimatePageContent() {
  const searchParams = useSearchParams();
  const [projectType, setProjectType] = useState<(typeof projectTypes)[number]>('roof-replacement');
  const [zipCode, setZipCode] = useState('55123');
  const [squareFootage, setSquareFootage] = useState('2100');
  const [description, setDescription] = useState(
    'Need full roof replacement with architectural shingles and updated gutter scope.'
  );
  const [budget, setBudget] = useState('$20,000');
  const [timeline, setTimeline] = useState('Within 30 days');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [heroHeadline, setHeroHeadline] = useState('Get A Ballpark Estimate In Under 60 Seconds');

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicEstimateResponse | null>(null);
  const [takeoffResult, setTakeoffResult] = useState<TakeoffResponse['estimate'] | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  useEffect(() => {
    const projectTypeParam = searchParams.get('projectType');
    if (projectTypeParam && (projectTypes as readonly string[]).includes(projectTypeParam)) {
      setProjectType(projectTypeParam as (typeof projectTypes)[number]);
    }

    const headlineParam = searchParams.get('headline');
    if (headlineParam && headlineParam.trim()) {
      setHeroHeadline(headlineParam.trim().slice(0, 90));
    }

  }, [searchParams]);

  useEffect(() => {
    if (!email.trim()) {
      setSubscriptionActive(false);
      return;
    }

    let active = true;

    const loadSubscriptionStatus = async () => {
      try {
        const response = await fetch(`/api/subscription/status?email=${encodeURIComponent(email.trim())}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const parsed = (await response.json().catch(() => ({}))) as SubscriptionStatusResponse;
        if (active) {
          setSubscriptionActive(Boolean(parsed.active));
        }
      } catch {
        // Ignore status lookup failures and fail closed when launching takeoff.
      }
    };

    void loadSubscriptionStatus();

    return () => {
      active = false;
    };
  }, [email]);

  const runPreview = async () => {
    if (loadingPreview) return;

    setLoadingPreview(true);
    setError(null);

    try {
      const response = await fetch('/api/estimating/public-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          zipCode,
          squareFootage: Number(squareFootage),
          description,
          budget,
          timeline,
          unlockFullResult: false,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as PublicEstimateResponse;
      if (!response.ok || !parsed.estimateRange) {
        throw new Error(parsed.error || `Estimate preview failed (${response.status})`);
      }

      setResult(parsed);
    } catch (previewError) {
      const message = previewError instanceof Error ? previewError.message : 'Failed to run estimate preview';
      setError(message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const unlockFullEstimate = async () => {
    if (loadingUnlock) return;

    setLoadingUnlock(true);
    setError(null);

    try {
      const response = await fetch('/api/estimating/public-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          zipCode,
          squareFootage: Number(squareFootage),
          description,
          budget,
          timeline,
          firstName,
          lastName,
          email,
          phone,
          unlockFullResult: true,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as PublicEstimateResponse;
      if (!response.ok || !parsed.estimate || !parsed.lead) {
        throw new Error(parsed.error || `Unlock estimate failed (${response.status})`);
      }

      setResult(parsed);

      if (planFiles.length > 0) {
        if (!email.trim()) {
          throw new Error('Billing email is required before running AI estimate reader on uploaded plans.');
        }

        if (!subscriptionActive) {
          throw new Error('Subscription required before launching AI estimate reader results. Visit /signup to continue.');
        }

        const formData = new FormData();
        formData.set('description', description);
        formData.set('projectCategory', projectType);
        formData.set('zipCode', zipCode);
        formData.set('subscriberEmail', email.trim().toLowerCase());
        planFiles.forEach((file) => {
          formData.append('files', file);
        });

        const takeoffRes = await fetch('/api/estimating/takeoff', {
          method: 'POST',
          body: formData,
        });

        const takeoffParsed = (await takeoffRes.json().catch(() => ({}))) as TakeoffResponse;
        if (takeoffRes.status === 402 || takeoffParsed.code === 'SUBSCRIPTION_REQUIRED') {
          throw new Error('Subscription required before launching AI estimate reader results. Visit /signup to continue.');
        }
        if (takeoffRes.ok && takeoffParsed.estimate) {
          setTakeoffResult(takeoffParsed.estimate);
        }
      }
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : 'Failed to unlock estimate';
      setError(message);
    } finally {
      setLoadingUnlock(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <header className="rounded-2xl border border-white/10 bg-[#11151d] p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Public Cost Calculator</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{heroHeadline}</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Enter your project info for a low/average/high cost range. Unlock full labor + material detail by sharing contact info.
          </p>
        </header>

        <section className="mb-6">
          <EstimatorChatbotPanel
            projectType={projectType}
            zipCode={zipCode}
            description={description}
            onZipCodeChange={setZipCode}
            onDescriptionChange={setDescription}
          />
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <article className="h-fit rounded-2xl border border-white/10 bg-[#11151d] p-5 xl:sticky xl:top-24">
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Estimator Tools</h2>
            <p className="mb-3 text-xs text-slate-400">Configure scope and pricing inputs.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="text-xs text-slate-300 block">
                Project type
                <select
                  value={projectType}
                  onChange={(event) => setProjectType(event.target.value as (typeof projectTypes)[number])}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                >
                  {projectTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-300 block">
                ZIP code
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <label className="text-xs text-slate-300 block">
                Square footage (optional)
                <input
                  value={squareFootage}
                  onChange={(event) => setSquareFootage(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-xs text-slate-300 block">
                Budget target
                <input
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-xs text-slate-300 block mt-2">
              Timeline target
              <input
                value={timeline}
                onChange={(event) => setTimeline(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300 block mt-2">
              Project description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300 block mt-2">
              Upload plans (optional)
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple
                onChange={(event) => setPlanFiles(Array.from(event.target.files || []))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            {planFiles.length > 0 && !subscriptionActive ? (
              <p className="mt-2 text-xs text-amber-200">
                AI estimate reader results require an active subscription. Sign up at{' '}
                <Link
                  href={`/signup?next=/estimate${email.trim() ? `&email=${encodeURIComponent(email.trim())}` : ''}`}
                  className="underline"
                >
                  /signup
                </Link>
                .
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void runPreview()}
              disabled={loadingPreview}
              className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60"
            >
              {loadingPreview ? 'Calculating...' : 'Get Instant Ballpark'}
            </button>

            <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-slate-300 mb-2">Unlock full result</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => void unlockFullEstimate()}
                disabled={loadingUnlock}
                className="mt-3 rounded-lg border border-emerald-300/40 bg-emerald-500/25 px-4 py-2 text-sm font-semibold hover:bg-emerald-500/35 disabled:opacity-60"
              >
                {loadingUnlock ? 'Unlocking...' : 'Unlock Full Estimate + Lead Follow-Up'}
              </button>
            </div>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-[#11151d] p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">Estimate Output</h2>
            {!result?.estimateRange ? (
              <p className="text-sm text-slate-300">Run the calculator to see your low/average/high project range.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Estimated range</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-200">
                    ${result.estimateRange.low.toLocaleString('en-US')} - ${result.estimateRange.high.toLocaleString('en-US')}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">Average: ${result.estimateRange.average.toLocaleString('en-US')}</p>
                </div>

                {result.mode === 'preview' ? (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                    Assistant notes: this preview is optimized for quick qualification. Unlock to view full labor/material detail.
                  </div>
                ) : null}

                {result.aiInsights ? (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">AI suggestions</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {result.aiInsights.scopeAdjustments.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-400">Cost-saving ideas</p>
                    <ul className="mt-1 space-y-1 text-xs">
                      {result.aiInsights.costSavingIdeas.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-emerald-200">Lead qualification: {result.aiInsights.qualification.recommendation}</p>
                  </div>
                ) : null}

                {result.estimate ? (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Detailed estimate unlocked</p>
                    <p className="mt-1 text-xs">
                      Materials: ${Math.round(result.estimate.totals.materials).toLocaleString('en-US')} | Labor: ${Math.round(result.estimate.totals.labor).toLocaleString('en-US')}
                    </p>
                    <p className="mt-1 text-xs">
                      Timeline: {result.estimate.timeline.estimatedDays} days (crew {result.estimate.timeline.crewSize})
                    </p>
                  </div>
                ) : null}

                {takeoffResult ? (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-400">Plan upload takeoff</p>
                    <p className="mt-1 text-xs">Takeoff estimate ID: {takeoffResult.estimateId}</p>
                    <p className="mt-1 text-xs">Takeoff total: ${Math.round(takeoffResult.totals?.grandTotal || 0).toLocaleString('en-US')}</p>
                  </div>
                ) : null}

                {result.lead ? (
                  <div className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    Lead captured: {result.lead.id} | Stage: {result.lead.stage}. Your request is now in CRM follow-up workflow.
                  </div>
                ) : null}

                {result.delivery ? (
                  <div className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    Delivery: {result.delivery.channel} via {result.delivery.provider} ({result.delivery.status})
                    <p className="mt-1 text-emerald-50/90">{result.delivery.detail}</p>
                    {result.delivery.error ? <p className="mt-1 text-red-300">{result.delivery.error}</p> : null}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/contact"
                    className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold hover:bg-cyan-500/30"
                  >
                    Get Exact Quote
                  </Link>
                  <Link
                    href="/construction-solutions"
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
                  >
                    Connect With Contractor
                  </Link>
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
