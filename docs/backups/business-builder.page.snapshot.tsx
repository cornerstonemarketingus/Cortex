"use client";

import Link from 'next/link';
import { useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';

type AutomationPlan = {
  summary: string;
  coreOffer?: {
    positioning?: string;
    secondary?: string;
  };
  pricingOptions?: Array<{
    name: string;
    setup: string;
    monthly: string;
    optional?: string;
    bestFor?: string;
  }>;
  clientAccountModel?: {
    accountIsolation?: string;
    provisioningFlow?: string[];
    roleModel?: string[];
    subscriptionBilling?: string[];
  };
  acquisitionChannels?: Array<{
    channel: string;
    tactics: string[];
    priority: 'primary' | 'secondary';
  }>;
  roadmap?: string[];
};

type BidEstimateResponse = {
  estimate?: {
    estimateId?: string;
    inputSummary?: string;
    totals?: {
      grandTotal?: number;
    };
    timeline?: {
      estimatedDays?: number;
      crewSize?: number;
    };
    assumptions?: string[];
  };
  error?: string;
};

type TakeoffResponse = {
  estimate?: {
    estimateId?: string;
    inputSummary?: string;
    materials?: Array<{ item: string; quantity: number; unit: string }>;
    totals?: {
      grandTotal?: number;
    };
  };
  code?: string;
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

type CommercialProjectsResponse = {
  projects?: Array<{
    id: string;
    title: string;
    city: string;
    scope: string;
    estimatedValue: string;
    bidDue: string;
    status: 'open' | 'closing-soon';
    source: string;
  }>;
  error?: string;
};

type SignatureWorkflowResponse = {
  workflow?: {
    action: 'send' | 'status' | 'reminder';
    envelope?: {
      envelopeId: string;
      bidSummary: string;
      recipientName: string;
      recipientEmail: string;
      contractValue: string;
      status: string;
      sentAt: string;
    };
    envelopeId?: string;
    status?: string;
    reminders?: Array<{ offsetHours: number; event: string; channel: string }>;
    reminder?: {
      channel: string;
      sentAt: string;
      messagePreview: string;
    };
    nextSteps?: string[];
  };
  error?: string;
};

const quickBusinessPrompts = [
  'Build a contractor operating system that runs AI takeoff, estimate delivery, e-sign proposal close, and open/sign reminders.',
  'Create a SaaS + service package with setup fee, monthly subscription, and optional performance upside for contractor clients.',
  'Design a multi-tenant CRM + automation platform where each client account has isolated data, workflows, and billing controls.',
];

export default function BusinessBuilderPage() {
  const [prompt, setPrompt] = useState(quickBusinessPrompts[0]);
  const [projectCategory, setProjectCategory] = useState('roof-replacement');
  const [zipCode, setZipCode] = useState('55123');
  const [description, setDescription] = useState('Roof replacement for a 2,100 sq ft home with upgraded shingles and gutter package.');
  const [recipientName, setRecipientName] = useState('Jordan Reeves');
  const [recipientEmail, setRecipientEmail] = useState('jordan@example.com');
  const [billingEmail, setBillingEmail] = useState('owner@example.com');

  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [automationPlan, setAutomationPlan] = useState<AutomationPlan | null>(null);
  const [bidResult, setBidResult] = useState<BidEstimateResponse['estimate'] | null>(null);
  const [takeoffResult, setTakeoffResult] = useState<TakeoffResponse['estimate'] | null>(null);
  const [marketPricing, setMarketPricing] = useState<MarketPricingResponse | null>(null);
  const [commercialFeed, setCommercialFeed] = useState<CommercialProjectsResponse['projects'] | null>(null);
  const [signatureWorkflow, setSignatureWorkflow] = useState<SignatureWorkflowResponse['workflow'] | null>(null);

  const runBusinessPlanner = async (overridePrompt?: string) => {
    const input = (overridePrompt ?? prompt).trim();
    if (!input || loadingPlanner) return;

    setLoadingPlanner(true);
    setError(null);

    try {
      const response = await fetch('/api/builder/automation-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          blueprint: 'business',
          selectedIntegrations: ['zapier', 'webhooks', 'stripe', 'twilio', 'custom-api'],
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as { plan?: AutomationPlan; error?: string };
      if (!response.ok || !parsed.plan) {
        throw new Error(parsed.error || `Business planner failed (${response.status})`);
      }

      setAutomationPlan(parsed.plan);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to generate business plan';
      setError(message);
    } finally {
      setLoadingPlanner(false);
    }
  };

  const runConstructionChain = async () => {
    if (loadingWorkflow) return;

    setLoadingWorkflow(true);
    setError(null);

    try {
      const [takeoffRes, bidRes, pricingRes, feedRes] = await Promise.all([
        fetch('/api/estimating/takeoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            projectCategory,
            zipCode,
            subscriberEmail: billingEmail,
            files: [{ name: 'project-plan.pdf', type: 'application/pdf', size: 68_000 }],
          }),
        }),
        fetch('/api/estimating/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description, projectCategory, zipCode }),
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
        fetch(`/api/construction/commercial-projects?zipCode=${encodeURIComponent(zipCode)}&limit=4`),
      ]);

      const takeoffData = (await takeoffRes.json().catch(() => ({}))) as TakeoffResponse;
      const bidData = (await bidRes.json().catch(() => ({}))) as BidEstimateResponse;
      const pricingData = (await pricingRes.json().catch(() => ({}))) as MarketPricingResponse;
      const feedData = (await feedRes.json().catch(() => ({}))) as CommercialProjectsResponse;

      if (!takeoffRes.ok || !takeoffData.estimate) {
        if (takeoffRes.status === 402 || takeoffData.code === 'SUBSCRIPTION_REQUIRED') {
          setTakeoffResult(null);
          setError('Subscription required before launching AI estimate reader results. Visit /signup to activate access.');
        } else {
          throw new Error(takeoffData.error || `AI takeoff failed (${takeoffRes.status})`);
        }
      } else {
        setTakeoffResult(takeoffData.estimate);
      }

      if (!bidRes.ok || !bidData.estimate) {
        throw new Error(bidData.error || `Bid generation failed (${bidRes.status})`);
      }

      if (!pricingRes.ok || !pricingData.compiledEstimate) {
        throw new Error(pricingData.error || `Market pricing failed (${pricingRes.status})`);
      }

      if (!feedRes.ok || !feedData.projects) {
        throw new Error(feedData.error || `Commercial feed failed (${feedRes.status})`);
      }

      setBidResult(bidData.estimate);
      setMarketPricing(pricingData);
      setCommercialFeed(feedData.projects);
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run workflow chain';
      setError(message);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const sendForSignature = async () => {
    if (loadingIntel || !bidResult) return;

    setLoadingIntel(true);
    setError(null);

    try {
      const response = await fetch('/api/construction/signature-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          bidSummary: bidResult.inputSummary || description,
          recipientName,
          recipientEmail,
          contractValue: bidResult.totals?.grandTotal || 0,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as SignatureWorkflowResponse;
      if (!response.ok || !parsed.workflow) {
        throw new Error(parsed.error || `Signature send failed (${response.status})`);
      }

      setSignatureWorkflow(parsed.workflow);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send signature packet';
      setError(message);
    } finally {
      setLoadingIntel(false);
    }
  };

  const sendReminder = async () => {
    const envelopeId = signatureWorkflow?.envelope?.envelopeId || signatureWorkflow?.envelopeId;
    if (!envelopeId || loadingIntel) return;

    setLoadingIntel(true);
    setError(null);

    try {
      const response = await fetch('/api/construction/signature-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reminder',
          envelopeId,
          reminderChannel: 'sms',
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as SignatureWorkflowResponse;
      if (!response.ok || !parsed.workflow) {
        throw new Error(parsed.error || `Reminder failed (${response.status})`);
      }

      setSignatureWorkflow(parsed.workflow);
    } catch (reminderError) {
      const message = reminderError instanceof Error ? reminderError.message : 'Failed to send reminder';
      setError(message);
    } finally {
      setLoadingIntel(false);
    }
  };

  const checkSignatureStatus = async () => {
    const envelopeId = signatureWorkflow?.envelope?.envelopeId || signatureWorkflow?.envelopeId;
    if (!envelopeId || loadingIntel) return;

    setLoadingIntel(true);
    setError(null);

    try {
      const response = await fetch('/api/construction/signature-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          envelopeId,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as SignatureWorkflowResponse;
      if (!response.ok || !parsed.workflow) {
        throw new Error(parsed.error || `Status check failed (${response.status})`);
      }

      setSignatureWorkflow(parsed.workflow);
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : 'Failed to check signature status';
      setError(message);
    } finally {
      setLoadingIntel(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#031336] via-[#0a2668] to-[#07162f] text-slate-100">
      <CortexTopTabs />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6 mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Cortex Product Suite</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Business Builder</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Contractor-focused operating system builder: AI takeoff, estimate + bid packaging, e-sign close flow, reminder automation, and subscription-backed client account rollout.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/business-builder/preview?blueprint=business&prompt=Build%20a%20contractor%20operating%20system" className="rounded-lg border border-blue-300/40 bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 text-sm">
              Open Live Business Preview
            </Link>
            <Link href="/construction-solutions" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-4 py-2 text-sm">
              Open Construction Suite
            </Link>
            <Link href="/homeowner-estimate" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm">
              Open Homeowner Assistant
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-5">
            <h2 className="text-lg font-semibold text-indigo-100 mb-3">Business Architecture Prompt Console</h2>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="w-full min-h-28 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {quickBusinessPrompts.map((quickPrompt) => (
                <button
                  key={quickPrompt}
                  type="button"
                  onClick={() => {
                    setPrompt(quickPrompt);
                    void runBusinessPlanner(quickPrompt);
                  }}
                  className="rounded-lg border border-white/20 bg-black/30 hover:bg-black/40 px-3 py-1.5 text-xs"
                >
                  {quickPrompt.slice(0, 60)}...
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void runBusinessPlanner()}
              disabled={loadingPlanner}
              className="mt-3 rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
            >
              {loadingPlanner ? 'Generating architecture...' : 'Generate Business System'}
            </button>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">SaaS + Service Packaging Output</h2>
            {!automationPlan ? (
              <p className="text-sm text-slate-300">Generate a plan to view pricing options, channels, and client-account model.</p>
            ) : (
              <div className="space-y-3 text-sm text-slate-200">
                <p>{automationPlan.summary}</p>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Core offer</p>
                  <p className="mt-1">{automationPlan.coreOffer?.positioning || 'No positioning returned.'}</p>
                  <p className="mt-1 text-xs text-slate-300">{automationPlan.coreOffer?.secondary}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Pricing options</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {(automationPlan.pricingOptions || []).map((option) => (
                      <li key={option.name}>
                        - {option.name}: {option.setup} setup / {option.monthly} monthly{option.optional ? ` / ${option.optional}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Client account model</p>
                  <p className="mt-1 text-xs">{automationPlan.clientAccountModel?.accountIsolation}</p>
                  <p className="mt-1 text-xs">{(automationPlan.clientAccountModel?.subscriptionBilling || []).join(' | ')}</p>
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">Construction Workflow Chain</h2>
            <p className="text-sm text-cyan-50 mb-3">
              Run the full chain from AI takeoff to estimate + bid to market guardrails to signature send and reminders when opened or unsigned.
            </p>

            <label className="text-xs text-cyan-100 block mb-2">
              Project category
              <input
                value={projectCategory}
                onChange={(event) => setProjectCategory(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-cyan-100 block mb-2">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-cyan-100 block mb-2">
              Scope description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 w-full min-h-24 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-cyan-100 block mb-2">
              Recipient name
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-cyan-100 block mb-2">
              Recipient email
              <input
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-cyan-100 block mb-2">
              Billing email (for paid takeoff usage)
              <input
                value={billingEmail}
                onChange={(event) => setBillingEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runConstructionChain()}
                disabled={loadingWorkflow}
                className="rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
              >
                {loadingWorkflow ? 'Running chain...' : 'Run Takeoff + Bid + Market Intel'}
              </button>
              <button
                type="button"
                onClick={() => void sendForSignature()}
                disabled={loadingIntel || !bidResult}
                className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-60 px-4 py-2 text-sm"
              >
                {loadingIntel ? 'Sending...' : 'Send For E-Signature'}
              </button>
              <button
                type="button"
                onClick={() => void checkSignatureStatus()}
                disabled={loadingIntel || !signatureWorkflow}
                className="rounded-lg border border-amber-300/40 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-60 px-4 py-2 text-sm"
              >
                Check Signature Status
              </button>
              <button
                type="button"
                onClick={() => void sendReminder()}
                disabled={loadingIntel || !signatureWorkflow}
                className="rounded-lg border border-fuchsia-300/40 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 disabled:opacity-60 px-4 py-2 text-sm"
              >
                Send Open/Sign Reminder
              </button>
            </div>

            <p className="mt-2 text-xs text-cyan-100/80">
              Need to activate paid access?{' '}
              <Link
                href={`/signup?next=/business-builder${billingEmail.trim() ? `&email=${encodeURIComponent(billingEmail.trim())}` : ''}`}
                className="underline"
              >
                Start subscription checkout
              </Link>
              .
            </p>

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-indigo-100 mb-3">Workflow Output Timeline</h2>

            {takeoffResult ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-2 text-xs text-slate-200">
                <p className="font-semibold text-slate-100">Step 1: AI Takeoff</p>
                <p className="mt-1">Estimate ID: {takeoffResult.estimateId}</p>
                <p className="mt-1">Total: ${Math.round(takeoffResult.totals?.grandTotal || 0).toLocaleString('en-US')}</p>
                <p className="mt-1">Top materials: {(takeoffResult.materials || []).slice(0, 2).map((item) => item.item).join(' | ')}</p>
              </div>
            ) : null}

            {bidResult ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-2 text-xs text-slate-200">
                <p className="font-semibold text-slate-100">Step 2: Estimate + Bid</p>
                <p className="mt-1">Estimate ID: {bidResult.estimateId}</p>
                <p className="mt-1">Contract total: ${Math.round(bidResult.totals?.grandTotal || 0).toLocaleString('en-US')}</p>
                <p className="mt-1">Timeline: {bidResult.timeline?.estimatedDays || 0} days / crew size {bidResult.timeline?.crewSize || 0}</p>
              </div>
            ) : null}

            {signatureWorkflow ? (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                <p className="font-semibold text-slate-100">Step 3: Signature + Reminder Engine</p>
                <p className="mt-1">Action: {signatureWorkflow.action}</p>
                <p className="mt-1">Status: {signatureWorkflow.status || signatureWorkflow.envelope?.status || 'sent'}</p>
                <p className="mt-1">Envelope: {signatureWorkflow.envelope?.envelopeId || signatureWorkflow.envelopeId}</p>
                {signatureWorkflow.reminder ? <p className="mt-1">Reminder channel: {signatureWorkflow.reminder.channel}</p> : null}
                {signatureWorkflow.reminders ? (
                  <p className="mt-1">
                    Reminder schedule: {signatureWorkflow.reminders.map((item) => `${item.offsetHours}h ${item.channel}`).join(' | ')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!takeoffResult && !bidResult && !signatureWorkflow ? (
              <p className="text-sm text-slate-300">Run the chain to view sequential workflow output.</p>
            ) : null}
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 mb-6">
          <article className="rounded-2xl border border-blue-300/25 bg-blue-500/10 p-5">
            <h2 className="text-lg font-semibold text-blue-100 mb-3">Market Pricing Intelligence</h2>
            {!marketPricing?.compiledEstimate ? (
              <p className="text-sm text-slate-300">Run the construction chain to compile source-weighted market guardrails.</p>
            ) : (
              <div className="space-y-2 text-sm text-slate-200">
                <p>
                  Recommended unit cost: <span className="font-semibold">${marketPricing.compiledEstimate.recommendedUnitCost}</span>
                </p>
                <p>
                  Guardrails: ${marketPricing.compiledEstimate.guardrailLow} - ${marketPricing.compiledEstimate.guardrailHigh}
                </p>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">Source snapshots</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {(marketPricing.sourceInsights || []).map((source) => (
                      <li key={source.source}>
                        - {source.source}: ${source.observedLow} - ${source.observedHigh} ({source.confidence})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100 mb-3">Commercial Bid Feed</h2>
            {!commercialFeed ? (
              <p className="text-sm text-slate-300">Run the chain to load local commercial opportunities by ZIP code.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-200">
                {commercialFeed.map((project) => (
                  <li key={project.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="font-semibold text-slate-100">{project.title}</p>
                    <p className="mt-1">{project.city} | {project.estimatedValue} | Due {project.bidDue}</p>
                    <p className="mt-1">Status: {project.status} | Source: {project.source}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5">
          <h2 className="text-lg font-semibold text-amber-100 mb-2">SaaS Terms + Product Framing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-200">
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="font-semibold text-slate-100">Contractor SaaS Packages</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>- Core System: $1,000-$2,500 setup + $197-$497 monthly</li>
                <li>- AI Upgrade: $500-$1,000 setup + $297-$697 monthly</li>
                <li>- Growth Add-on: $2,000+ setup + $497+ monthly (+ optional performance upside)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 p-3">
              <p className="font-semibold text-slate-100">Legal-Style Product Language</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>- Proposal and e-sign workflows are modeled for UETA/ESIGN-compliant acceptance records.</li>
                <li>- Pricing guardrails are informational estimates and must be confirmed with field verification.</li>
                <li>- Commercial feed data is normalized from external-style sources and requires licensed production integrations.</li>
              </ul>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
            <p className="font-semibold text-slate-100">Dual Assistant Experience</p>
            <p className="mt-1">
              Contractor assistant manages lead-to-close operations, while homeowner assistant guides project scoping and estimate readiness from the client side.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href="/chat" className="rounded-md border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-1.5">
                Open Contractor Assistant
              </Link>
              <Link href="/homeowner-estimate" className="rounded-md border border-blue-300/40 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5">
                Open Homeowner Assistant
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
