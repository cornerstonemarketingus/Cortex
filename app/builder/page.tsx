"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import { useAdminSession } from '@/components/auth/useAdminSession';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

type BuilderMode = 'plan' | 'suggest';
type BuilderBlueprint = 'website' | 'app' | 'business' | 'game';
type QualityTier = 'foundation' | 'premium';

type EntitlementsResponse = {
  entitlements?: {
    active: boolean;
    tier: string | null;
    featureFlags: {
      ['builder-premium']?: boolean;
    };
  };
};

type AutomationPlan = {
  summary: string;
  detectedBlueprint: BuilderBlueprint;
  coreOffer: {
    positioning: string;
    secondary: string;
  };
  productStack: {
    leadCaptureLayer: string[];
    conversionLayer: string[];
    estimationLayer: string[];
    pipelineLayer: string[];
    followUpEngine: string[];
    reputationEngine: string[];
    emailSmsAutomation: string[];
    calendarsAndBooking: string[];
    aiChatAutomationTools: string[];
    reportingDashboard: string[];
  };
  buildWorkflows: Array<{
    name: string;
    trigger: string;
    actions: string[];
    automationLogic: string;
  }>;
  funnels: Array<{
    name: string;
    pages: string[];
    conversionGoal: string;
    automationHooks: string[];
  }>;
  crmPipeline: {
    stages: string[];
    automations: string[];
    scoreSignals: string[];
  };
  aiLayer: {
    nativeTools: string[];
    apiIntegrations: string[];
    promptPacks: string[];
  };
  snapshots: Array<{
    name: string;
    includes: string[];
    bestFor: string;
  }>;
  integrations: Array<{
    platform: string;
    purpose: string;
    trigger: string;
    action: string;
  }>;
  pricingOptions: Array<{
    name: string;
    setup: string;
    monthly: string;
    optional?: string;
    bestFor: string;
  }>;
  offerPackages: Array<{
    name: string;
    includes: string[];
  }>;
  salesScript: {
    coldOpener: string;
    problemAgitation: string;
    pitch: string;
    proofFraming: string;
    close: string;
  };
  landingPageLayout: Array<{
    section: string;
    headline: string;
    supporting: string;
  }>;
  acquisitionChannels: Array<{
    channel: string;
    tactics: string[];
    priority: 'primary' | 'secondary';
  }>;
  expansionPath: Array<{
    phase: string;
    focus: string[];
  }>;
  clientAccountModel: {
    accountIsolation: string;
    provisioningFlow: string[];
    roleModel: string[];
    subscriptionBilling: string[];
  };
  roadmap: string[];
  suggestions: string[];
};

const builderLanes = [
  {
    id: 'website' as const,
    href: '/website-builder',
    title: 'Website Builder',
    description: 'Landing pages, lead capture forms, conversion paths, and deployment readiness checks.',
    tone: 'border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-200',
  },
  {
    id: 'app' as const,
    href: '/app-builder',
    title: 'App Builder',
    description: 'Module scaffolding, API contracts, workflow orchestration, and integration quality gates.',
    tone: 'border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/15 text-blue-200',
  },
  {
    id: 'business' as const,
    href: '/business-builder',
    title: 'Business Builder',
    description: 'Revenue operations with SEO + GEO loops, local optimization, and communication-driven conversion strategies.',
    tone: 'border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200',
  },
  {
    id: 'game' as const,
    href: '/game-builder',
    title: 'Game Builder Engine',
    description: 'Roblox and cross-platform game systems with reusable mechanics, telemetry, and marketplace packaging.',
    tone: 'border-fuchsia-400/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/15 text-fuchsia-200',
  },
];

const psychologyDesignSignals = [
  'Teal and cyan cues for trust and confidence during strategic decisions.',
  'Amber accents reserved for action moments to reduce decision fatigue.',
  'Neutral surfaces and clear hierarchy to lower cognitive load in planning.',
  'Short intent labels and outcome language to improve team alignment.',
];

const quickActions = [
  {
    id: 'scan-bugs',
    label: 'Scan bugs and propose fixes',
    prompt: 'Scan the current app for build/lint risks and propose high-impact fixes with minimal change surface.',
  },
  {
    id: 'seo-boost',
    label: 'Boost SEO and GEO',
    prompt: 'Improve the website and app builder SEO/GEO footprint with metadata, schema, and content loop suggestions.',
  },
  {
    id: 'blog-engine',
    label: 'Kick off autonomous blog growth',
    prompt: 'Create a practical autonomous blog growth plan with lead magnets and conversion CTAs.',
  },
  {
    id: 'sales-system',
    label: 'Build sales automation system',
    prompt: 'Generate an AI follow-up and deal-closing sales system similar to top CRM growth stacks.',
  },
  {
    id: 'autonomous-revenue',
    label: 'Begin autonomous revenue methods',
    prompt: 'Begin creating AI autonomous methods of obtaining revenue with funnels, CRM, estimate automation, booking, and monthly subscription plans.',
  },
];

const automationIntegrationOptions = [
  { id: 'zapier', label: 'Zapier' },
  { id: 'make', label: 'Make' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'twilio', label: 'Twilio' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'google-ads', label: 'Google Ads' },
  { id: 'custom-api', label: 'Custom API' },
] as const;

async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });

  const parsed = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!response.ok) {
    throw new Error(parsed.error || parsed.detail || `Request failed (${response.status})`);
  }

  return parsed as T;
}

export default function BuilderEntryPage() {
  const router = useRouter();
  const { isAdmin } = useAdminSession();
  const [blueprint, setBlueprint] = useState<BuilderBlueprint>('website');
  const [mode, setMode] = useState<BuilderMode>('plan');
  const [input, setInput] = useState('Build a conversion-focused website and app for my service business with CRM follow-up.');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'boot-1',
      role: 'assistant',
      text: 'I can generate a build plan, suggest code-level improvements, and open a dedicated live preview stage. Direct apply mode is restricted to hidden admin Build Cortex controls.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoOpenPreview, setAutoOpenPreview] = useState(true);
  const [automationPrompt, setAutomationPrompt] = useState(
    'Build workflows, funnel pages, CRM stages, snapshot templates, and Zapier/webhook automations for a local contractor business.'
  );
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(['zapier', 'webhooks', 'custom-api']);
  const [automationPlan, setAutomationPlan] = useState<AutomationPlan | null>(null);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [tenantId, setTenantId] = useState('cortex-default');
  const [qualityTier, setQualityTier] = useState<QualityTier>('foundation');
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [premiumStatusLabel, setPremiumStatusLabel] = useState('Foundation mode');

  const selectedLane = useMemo(() => {
    return builderLanes.find((lane) => lane.id === blueprint) || builderLanes[0];
  }, [blueprint]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('blueprint');
    if (requested === 'website' || requested === 'app' || requested === 'business' || requested === 'game') {
      setBlueprint(requested);
    }
  }, []);

  useEffect(() => {
    if (!subscriberEmail.trim()) {
      setPremiumEnabled(false);
      setPremiumStatusLabel('Foundation mode');
      if (qualityTier === 'premium') setQualityTier('foundation');
      return;
    }

    let active = true;
    const loadEntitlements = async () => {
      try {
        const response = await fetch(
          `/api/subscription/entitlements?email=${encodeURIComponent(subscriberEmail.trim())}&tenantId=${encodeURIComponent(tenantId)}`,
          { cache: 'no-store' }
        );
        const parsed = (await response.json().catch(() => ({}))) as EntitlementsResponse;
        const canUsePremium = Boolean(parsed.entitlements?.active && parsed.entitlements?.featureFlags?.['builder-premium']);
        const tier = parsed.entitlements?.tier || 'none';

        if (active) {
          setPremiumEnabled(canUsePremium);
          setPremiumStatusLabel(canUsePremium ? `Premium enabled (${tier})` : `Premium locked (${tier})`);
          if (!canUsePremium && qualityTier === 'premium') {
            setQualityTier('foundation');
          }
        }
      } catch {
        if (active) {
          setPremiumEnabled(false);
          setPremiumStatusLabel('Premium unavailable');
          if (qualityTier === 'premium') {
            setQualityTier('foundation');
          }
        }
      }
    };

    void loadEntitlements();
    return () => {
      active = false;
    };
  }, [subscriberEmail, tenantId, qualityTier]);

  const openPreviewStage = (promptValue: string) => {
    const trimmedPrompt = promptValue.trim();
    if (!trimmedPrompt) return;

    const query = new URLSearchParams({
      prompt: trimmedPrompt,
      blueprint,
    });
    router.push(`/builder/preview?${query.toString()}`);
  };

  const pushMessage = (role: AssistantMessage['role'], text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
      },
    ]);
  };

  const toggleIntegration = (integrationId: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(integrationId)
        ? prev.filter((item) => item !== integrationId)
        : [...prev, integrationId]
    );
  };

  const runAutomationPlanner = async () => {
    const prompt = automationPrompt.trim();
    if (!prompt || automationLoading) return;

    setAutomationLoading(true);
    setAutomationError(null);

    try {
      const result = await postJson<{ plan: AutomationPlan }>('/api/builder/automation-plan', {
        prompt,
        blueprint,
        selectedIntegrations,
        qualityTier,
        subscriberEmail: subscriberEmail.trim() || undefined,
        tenantId,
      });

      setAutomationPlan(result.plan);

      pushMessage(
        'assistant',
        [
          `Automation plan generated for ${result.plan.detectedBlueprint} builder.`,
          '',
          'Top workflow tracks:',
          ...result.plan.buildWorkflows.slice(0, 2).map((item) => `- ${item.name}`),
          '',
          'Top integrations:',
          ...result.plan.integrations.slice(0, 3).map((item) => `- ${item.platform}: ${item.purpose}`),
        ].join('\n')
      );
    } catch (plannerError) {
      const message = plannerError instanceof Error ? plannerError.message : 'Failed to generate automation plan';
      setAutomationError(message);
    } finally {
      setAutomationLoading(false);
    }
  };

  const runAssistant = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || input).trim();
    if (!prompt || loading) return;

    setLoading(true);
    setError(null);
    pushMessage('user', prompt);

    try {
      if (mode === 'plan') {
        const concierge = await postJson<{
          response: {
            summary: string;
            implementationPlan: Array<{ phase: string; tasks: string[] }>;
            domainSuggestions: string[];
            codeChangeSuggestions: Array<{ objective: string; taskPayload: string }>;
          };
        }>('/api/builder/concierge', {
          message: prompt,
          blueprint,
          mode: 'visitor',
          includeDomainSales: true,
          includeAutonomousIdeas: true,
        });

        const planLines = concierge.response.implementationPlan
          .map((step) => `- ${step.phase}: ${step.tasks.slice(0, 2).join(' | ')}`)
          .join('\n');

        const domainLine = concierge.response.domainSuggestions.length > 0
          ? `\nDomain suggestions: ${concierge.response.domainSuggestions.slice(0, 3).join(', ')}`
          : '';

        const suggestionLine = concierge.response.codeChangeSuggestions.length > 0
          ? `\n\nTop suggestion: ${concierge.response.codeChangeSuggestions[0].objective}`
          : '';

        pushMessage('assistant', `${concierge.response.summary}\n\nExecution plan:\n${planLines}${domainLine}${suggestionLine}`);

        if (autoOpenPreview) {
          openPreviewStage(prompt);
        }
      } else {
        const concierge = await postJson<{
          response: {
            summary: string;
            codeChangeSuggestions: Array<{ objective: string; taskPayload: string }>;
            nextActions: string[];
          };
        }>('/api/builder/concierge', {
          message: prompt,
          blueprint,
          mode: 'visitor',
          includeDomainSales: false,
          includeAutonomousIdeas: true,
        });

        pushMessage(
          'assistant',
          [
            `Public-safe suggestion pass ready for ${blueprint} builder.`,
            '',
            concierge.response.summary,
            '',
            'Recommended code change objectives:',
            ...concierge.response.codeChangeSuggestions.slice(0, 3).map((item) => `- ${item.objective}`),
            '',
            'Next actions:',
            ...concierge.response.nextActions.slice(0, 3).map((item) => `- ${item}`),
          ].join('\n')
        );
      }
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Failed to run assistant';
      setError(message);
      pushMessage('system', `Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07133c] via-[#10245f] to-[#0a1538] text-white">
      <CortexTopTabs />
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold">Builder Portal</h1>
          <p className="text-gray-300 mt-3 max-w-3xl">
            Build with AI assistance in one surface: plan architecture, generate suggestions, and run approved code-change passes.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {builderLanes.map((lane) => (
            <button
              key={lane.title}
              type="button"
              onClick={() => setBlueprint(lane.id)}
              className={`block rounded-2xl border p-5 text-left transition-colors ${lane.tone} ${blueprint === lane.id ? 'ring-2 ring-white/40' : ''}`}
            >
              <h2 className="text-xl font-semibold mb-2">{lane.title}</h2>
              <p className="text-sm text-gray-200">{lane.description}</p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 mb-8">
          <h2 className="text-lg font-semibold text-emerald-200 mb-2">Stage 2 UX and Communication Signals</h2>
          <ul className="space-y-1 text-sm text-gray-200">
            {psychologyDesignSignals.map((signal) => (
              <li key={signal}>- {signal}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-cyan-100">AI Builder Assistant</h2>
            <span className="text-xs rounded-full border border-white/20 bg-black/30 px-3 py-1">
              Active blueprint: {selectedLane.title}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
            <label className="text-xs text-gray-200">
              Mode
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as BuilderMode)}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              >
                <option value="plan">Plan</option>
                <option value="suggest">Suggest (public-safe)</option>
              </select>
            </label>

            <div className="md:col-span-2 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-xs text-gray-300">
              Direct apply-mode code changes are intentionally hidden in the admin area only.
              Use Build Cortex in Devboard for approved autonomous apply passes.
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-cyan-100">
                  {premiumStatusLabel}
                </span>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-cyan-100">
                <input
                  type="checkbox"
                  checked={autoOpenPreview}
                  onChange={(event) => setAutoOpenPreview(event.target.checked)}
                  className="accent-cyan-400"
                />
                Auto-open live preview stage after plan generation
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <label className="text-xs text-gray-200">
              Billing Email
              <input
                value={subscriberEmail}
                onChange={(event) => setSubscriberEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              />
            </label>
            <label className="text-xs text-gray-200">
              Tenant ID
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value || 'cortex-default')}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              />
            </label>
            <label className="text-xs text-gray-200">
              Quality Tier
              <select
                value={qualityTier}
                onChange={(event) => setQualityTier(event.target.value as QualityTier)}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/20 px-2 py-2"
              >
                <option value="foundation">foundation</option>
                <option value="premium" disabled={!premiumEnabled}>premium</option>
              </select>
            </label>
          </div>

          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe what to build, improve, or fix..."
            className="w-full min-h-28 rounded-xl border border-white/20 bg-black/40 px-3 py-3 text-sm"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  setInput(action.prompt);
                  void runAssistant(action.prompt);
                }}
                className="rounded-lg border border-white/20 bg-black/25 px-3 py-1.5 text-xs hover:bg-black/40"
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runAssistant()}
              disabled={loading}
              className="rounded-lg bg-cyan-500/80 hover:bg-cyan-500 disabled:opacity-60 px-4 py-2 text-sm font-medium"
            >
              {loading ? 'Running...' : mode === 'plan' ? 'Generate Build Plan' : 'Generate Code Suggestions'}
            </button>
            <button
              type="button"
              onClick={() => openPreviewStage(input.trim())}
              disabled={!input.trim()}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 px-4 py-2 text-sm"
            >
              Open Live Preview Stage
            </button>
            {isAdmin ? (
              <Link href="/devboard?tab=builders" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm">
                Open Advanced Devboard Builder
              </Link>
            ) : null}
            <Link href="/chat" className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2 text-sm">
              Open Main AI Chat
            </Link>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          <div className="mt-5 max-h-[28rem] overflow-y-auto rounded-xl border border-white/15 bg-black/30 p-4 space-y-3">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${
                  message.role === 'assistant'
                    ? 'border-cyan-400/20 bg-cyan-500/10 text-cyan-50'
                    : message.role === 'user'
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wide opacity-70 mb-1">{message.role}</p>
                {message.text}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5 mb-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-amber-100">AI Automations Tab</h2>
            <span className="text-xs rounded-full border border-white/20 bg-black/30 px-3 py-1">
              Build workflows + integrations
            </span>
          </div>

          <p className="text-sm text-amber-50/90 mb-4">
            Generate automation logic, funnels, CRM pipelines, native AI/API plans, snapshots, and external tool integrations in one pass.
          </p>

          <textarea
            value={automationPrompt}
            onChange={(event) => setAutomationPrompt(event.target.value)}
            placeholder="Describe the automation system to build..."
            className="w-full min-h-24 rounded-xl border border-white/20 bg-black/40 px-3 py-3 text-sm"
          />

          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            {automationIntegrationOptions.map((option) => (
              <label key={option.id} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs text-slate-100 inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIntegrations.includes(option.id)}
                  onChange={() => toggleIntegration(option.id)}
                  className="accent-amber-400"
                />
                {option.label}
              </label>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runAutomationPlanner()}
              disabled={automationLoading}
              className="rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-300 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
            >
              {automationLoading ? 'Generating automation plan...' : 'Generate Automation Blueprint'}
            </button>
            <button
              type="button"
              onClick={() => setAutomationPrompt('Create funnels + landing pages, CRM pipelines, reusable snapshots, and Zapier/API automations for a contractor growth engine.')}
              className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm"
            >
              Use Starter Prompt
            </button>
          </div>

          {automationError ? <p className="mt-2 text-sm text-red-300">{automationError}</p> : null}

          {automationPlan ? (
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              <article className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-4 xl:col-span-2">
                <h3 className="text-sm font-semibold text-cyan-100 mb-2">Core Offer</h3>
                <p className="text-sm text-cyan-50">{automationPlan.coreOffer.positioning}</p>
                <p className="text-xs text-cyan-100/80 mt-2">{automationPlan.coreOffer.secondary}</p>
                <p className="text-xs text-slate-200 mt-3">{automationPlan.summary}</p>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4 xl:col-span-2">
                <h3 className="text-sm font-semibold text-amber-200 mb-2">Product Stack</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {([
                    ['Lead Capture Layer', automationPlan.productStack.leadCaptureLayer],
                    ['Conversion Layer', automationPlan.productStack.conversionLayer],
                    ['Estimation Layer', automationPlan.productStack.estimationLayer],
                    ['Pipeline Layer', automationPlan.productStack.pipelineLayer],
                    ['Follow-Up Engine', automationPlan.productStack.followUpEngine],
                    ['Reputation Engine', automationPlan.productStack.reputationEngine],
                    ['Email + SMS Automation', automationPlan.productStack.emailSmsAutomation],
                    ['Calendars / Booking', automationPlan.productStack.calendarsAndBooking],
                    ['AI Chat + Automation Tools', automationPlan.productStack.aiChatAutomationTools],
                    ['Reporting Dashboard', automationPlan.productStack.reportingDashboard],
                  ] as Array<[string, string[]]>).map(([label, entries]) => (
                    <div key={label} className="rounded-lg border border-white/15 bg-white/5 p-3">
                      <p className="text-xs font-semibold text-slate-100">{label}</p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-200">
                        {entries.map((item) => (
                          <li key={`${label}-${item}`}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-amber-200 mb-2">Build Workflows (Automation Logic)</h3>
                <ul className="space-y-2 text-xs text-slate-200">
                  {automationPlan.buildWorkflows.map((workflow) => (
                    <li key={workflow.name} className="rounded-lg border border-white/15 bg-white/5 p-2">
                      <p className="font-medium text-slate-100">{workflow.name}</p>
                      <p className="text-slate-300 mt-1">Trigger: {workflow.trigger}</p>
                      <p className="text-slate-300 mt-1">Logic: {workflow.automationLogic}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-cyan-200 mb-2">Funnels + Landing Pages</h3>
                <ul className="space-y-2 text-xs text-slate-200">
                  {automationPlan.funnels.map((funnel) => (
                    <li key={funnel.name} className="rounded-lg border border-white/15 bg-white/5 p-2">
                      <p className="font-medium text-slate-100">{funnel.name}</p>
                      <p className="text-slate-300 mt-1">Goal: {funnel.conversionGoal}</p>
                      <p className="text-slate-300 mt-1">Pages: {funnel.pages.join(' | ')}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-emerald-200 mb-2">CRM Pipeline</h3>
                <p className="text-xs text-slate-300">Stages: {automationPlan.crmPipeline.stages.join(' -> ')}</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-200">
                  {automationPlan.crmPipeline.automations.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-fuchsia-200 mb-2">AI Layer (Native + APIs)</h3>
                <p className="text-xs text-slate-300">Native tools:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {automationPlan.aiLayer.nativeTools.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-300 mt-3">API integrations:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {automationPlan.aiLayer.apiIntegrations.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4 xl:col-span-2">
                <h3 className="text-sm font-semibold text-amber-200 mb-2">Snapshots + External Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Reusable snapshots</p>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {automationPlan.snapshots.map((snapshot) => (
                        <li key={snapshot.name}>- {snapshot.name}: {snapshot.bestFor}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Integrations (Zapier/APIs/etc)</p>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {automationPlan.integrations.map((integration) => (
                        <li key={integration.platform}>- {integration.platform}: {integration.action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-emerald-200 mb-2">Pricing + Subscriptions</h3>
                <ul className="space-y-2 text-xs text-slate-200">
                  {automationPlan.pricingOptions.map((option) => (
                    <li key={option.name} className="rounded-lg border border-white/15 bg-white/5 p-2">
                      <p className="font-medium text-slate-100">{option.name}</p>
                      <p className="text-slate-300 mt-1">Setup: {option.setup}</p>
                      <p className="text-slate-300">Monthly: {option.monthly}</p>
                      {option.optional ? <p className="text-slate-300">Optional: {option.optional}</p> : null}
                      <p className="text-slate-400 mt-1">Best for: {option.bestFor}</p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-cyan-200 mb-2">Client Accounts + Billing</h3>
                <p className="text-xs text-slate-300">{automationPlan.clientAccountModel.accountIsolation}</p>
                <p className="text-xs text-slate-300 mt-3">Provisioning flow:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {automationPlan.clientAccountModel.provisioningFlow.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-300 mt-3">Role model:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {automationPlan.clientAccountModel.roleModel.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-300 mt-3">Subscription system:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {automationPlan.clientAccountModel.subscriptionBilling.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4">
                <h3 className="text-sm font-semibold text-fuchsia-200 mb-2">Offer Packaging + Sales Script</h3>
                <ul className="space-y-2 text-xs text-slate-200">
                  {automationPlan.offerPackages.map((pkg) => (
                    <li key={pkg.name} className="rounded-lg border border-white/15 bg-white/5 p-2">
                      <p className="font-medium text-slate-100">{pkg.name}</p>
                      <p className="text-slate-300 mt-1">Includes: {pkg.includes.join(' | ')}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-slate-200 space-y-1">
                  <p><span className="text-slate-400">Cold opener:</span> {automationPlan.salesScript.coldOpener}</p>
                  <p><span className="text-slate-400">Problem:</span> {automationPlan.salesScript.problemAgitation}</p>
                  <p><span className="text-slate-400">Pitch:</span> {automationPlan.salesScript.pitch}</p>
                  <p><span className="text-slate-400">Proof:</span> {automationPlan.salesScript.proofFraming}</p>
                  <p><span className="text-slate-400">Close:</span> {automationPlan.salesScript.close}</p>
                </div>
              </article>

              <article className="rounded-xl border border-white/20 bg-black/30 p-4 xl:col-span-2">
                <h3 className="text-sm font-semibold text-lime-200 mb-2">Landing Layout + Acquisition + Expansion</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Landing page structure</p>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {automationPlan.landingPageLayout.map((section) => (
                        <li key={section.section}>- {section.section}: {section.headline}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Acquisition channels</p>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {automationPlan.acquisitionChannels.map((channel) => (
                        <li key={channel.channel}>- {channel.channel}: {channel.tactics.join(' | ')}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 mb-1">Expansion path</p>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {automationPlan.expansionPath.map((phase) => (
                        <li key={phase.phase}>- {phase.phase}: {phase.focus.join(' | ')}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-indigo-300/35 bg-indigo-500/10 p-6 mb-8">
          <h2 className="text-xl font-semibold text-indigo-100 mb-2">Cortex Product Divisions</h2>
          <p className="text-sm text-indigo-100/85">
            Structured like a premium SaaS suite with specialized subdivisions and deal-ready execution tracks.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <article className="rounded-2xl border border-blue-300/30 bg-blue-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Division 01</p>
              <h3 className="mt-1 text-lg font-semibold">Construction Solutions</h3>
              <p className="mt-2 text-sm text-slate-200">Bid estimator, AI takeoff, contractor CRM, quote automation, and booking pipelines.</p>
              <Link href="/construction-solutions" className="mt-3 inline-flex rounded-lg border border-blue-300/40 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 text-xs font-semibold">
                Open Construction Division
              </Link>
            </article>

            <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Division 02</p>
              <h3 className="mt-1 text-lg font-semibold">AI Automation Solutions</h3>
              <p className="mt-2 text-sm text-slate-200">Funnels, CRM, email/SMS, booking, subscriptions, and isolated client accounts.</p>
              <Link href="/ai-automation-solutions" className="mt-3 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-2 text-xs font-semibold">
                Open Automation Division
              </Link>
            </article>

            <article className="rounded-2xl border border-indigo-200/35 bg-indigo-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Division 03</p>
              <h3 className="mt-1 text-lg font-semibold">Cortex Engine Deals</h3>
              <p className="mt-2 text-sm text-slate-200">Core system, AI upgrade, and growth add-on packaging with monthly subscription tiers.</p>
              <Link href="/dashboard" className="mt-3 inline-flex rounded-lg border border-indigo-200/45 bg-indigo-400/20 hover:bg-indigo-400/30 px-3 py-2 text-xs font-semibold">
                View Product + Pricing Hub
              </Link>
            </article>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {isAdmin ? (
            <Link href="/devboard?tab=builders" className="rounded-2xl border border-white/20 bg-black/20 hover:bg-black/30 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
              <p className="mt-1 font-semibold">Builder Workspace</p>
              <p className="mt-1 text-xs text-slate-300">Advanced propose/apply control and system-level operations.</p>
            </Link>
          ) : (
            <div className="rounded-2xl border border-white/20 bg-black/20 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Guided</p>
              <p className="mt-1 font-semibold">Builder Workspace</p>
              <p className="mt-1 text-xs text-slate-300">Admin-only controls are hidden. Use the live preview and AI command lanes.</p>
            </div>
          )}
          <Link href="/chat" className="rounded-2xl border border-blue-300/30 bg-blue-500/15 hover:bg-blue-500/25 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-blue-200">Command</p>
            <p className="mt-1 font-semibold">AI Command Chat</p>
            <p className="mt-1 text-xs text-blue-50/90">Prompt autonomous revenue and build workflows from one console.</p>
          </Link>
          <Link href="/blog" className="rounded-2xl border border-cyan-300/30 bg-cyan-500/15 hover:bg-cyan-500/25 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Growth</p>
            <p className="mt-1 font-semibold">Blog Engine</p>
            <p className="mt-1 text-xs text-cyan-50/90">SEO + GEO publishing with managed content ops and monetization loops.</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
