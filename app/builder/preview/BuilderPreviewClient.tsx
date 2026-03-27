"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import { useAdminSession } from '@/components/auth/useAdminSession';

type BuilderBlueprint = 'website' | 'app' | 'business';

type ConciergeResponse = {
  summary: string;
  implementationPlan: Array<{ phase: string; tasks: string[] }>;
  websiteSections: string[];
  appModules: string[];
  nextActions: string[];
  domainSuggestions: string[];
};

type AutomationPreview = {
  summary: string;
  detectedBlueprint: BuilderBlueprint;
  funnels: Array<{ name: string; pages: string[]; conversionGoal: string }>;
  crmPipeline: {
    stages: string[];
    automations: string[];
  };
  snapshots: Array<{ name: string; bestFor: string }>;
  pricingOptions: Array<{ name: string; setup: string; monthly: string; optional?: string }>;
};

type SandboxPreview = {
  title: string;
  summary: string;
  instructions: string[];
  html: string;
};

function normalizeBlueprint(value: string): BuilderBlueprint {
  if (value === 'website' || value === 'app' || value === 'business') {
    return value;
  }
  return 'website';
}

function getBuilderHomeHref(blueprint: BuilderBlueprint): string {
  if (blueprint === 'website') return '/website-builder';
  if (blueprint === 'app') return '/app-builder';
  return '/business-builder';
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const parsed = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!response.ok) {
    throw new Error(parsed.error || parsed.detail || `Request failed (${response.status})`);
  }

  return parsed as T;
}

type BuilderPreviewClientProps = {
  initialPrompt: string;
  initialBlueprint: BuilderBlueprint;
};

export default function BuilderPreviewClient({ initialPrompt, initialBlueprint }: BuilderPreviewClientProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [blueprint, setBlueprint] = useState<BuilderBlueprint>(initialBlueprint);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concierge, setConcierge] = useState<ConciergeResponse | null>(null);
  const [automation, setAutomation] = useState<AutomationPreview | null>(null);
  const [sandboxPreview, setSandboxPreview] = useState<SandboxPreview | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const { isAdmin } = useAdminSession();

  const heroTitle = useMemo(() => {
    if (blueprint === 'website') return 'Website Preview Stage';
    if (blueprint === 'app') return 'App Preview Stage';
    return 'Business System Preview Stage';
  }, [blueprint]);

  const runPreview = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setSandboxLoading(true);
    setSandboxPreview(null);

    try {
      const [conciergeResult, automationResult] = await Promise.all([
        postJson<{ response: ConciergeResponse }>('/api/builder/concierge', {
          message: text,
          blueprint,
          mode: 'visitor',
          includeDomainSales: true,
          includeAutonomousIdeas: true,
        }),
        postJson<{ plan: AutomationPreview }>('/api/builder/automation-plan', {
          prompt: text,
          blueprint,
          selectedIntegrations: ['zapier', 'webhooks', 'stripe', 'custom-api'],
        }),
      ]);

      setConcierge(conciergeResult.response);
      setAutomation(automationResult.plan);

      const previewPayload: {
        blueprint: BuilderBlueprint;
        prompt: string;
        sections?: string[];
        modules?: string[];
      } = {
        blueprint,
        prompt: text,
      };

      if (blueprint === 'website') {
        previewPayload.sections = conciergeResult.response.websiteSections;
      }

      if (blueprint === 'app' || blueprint === 'business') {
        previewPayload.modules = conciergeResult.response.appModules;
      }

      try {
        const sandboxResult = await postJson<{ preview: SandboxPreview }>('/api/sandbox/preview', previewPayload);
        setSandboxPreview(sandboxResult.preview);
      } catch (sandboxError) {
        const message = sandboxError instanceof Error ? sandboxError.message : 'Unknown sandbox render error';
        setError(`Core preview generated, but sandbox render failed: ${message}`);
      }
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : 'Preview generation failed';
      setError(message);
    } finally {
      setLoading(false);
      setSandboxLoading(false);
    }
  };

  useEffect(() => {
    if (!initialPrompt.trim()) return;
    void runPreview(initialPrompt);
    // Run initial preview once from initial URL-derived prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07123a] via-[#0b1c52] to-[#09122e] text-slate-100">
      <CortexTopTabs />
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="mb-8 rounded-3xl border border-blue-300/25 bg-blue-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Cortex Builder Live Stage</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{heroTitle}</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Prompt-to-preview pipeline. This stage turns your input into architecture, funnel logic, CRM flow, snapshots, and pricing model before implementation.
          </p>
        </header>

        <section className="rounded-3xl border border-indigo-300/30 bg-indigo-500/10 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-indigo-100">
              Builder lane
              <select
                value={blueprint}
                onChange={(event) => setBlueprint(normalizeBlueprint(event.target.value))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm"
              >
                <option value="website">Website Builder</option>
                <option value="app">App Builder</option>
                <option value="business">Business Builder</option>
              </select>
            </label>

            <div className="md:col-span-2">
              <label className="text-xs text-indigo-100">Build prompt</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe what to build..."
                className="mt-1 w-full min-h-24 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runPreview()}
              disabled={loading || !prompt.trim()}
              className="rounded-lg bg-blue-500/80 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold"
            >
              {loading ? 'Rendering preview...' : 'Generate Live Preview'}
            </button>
            <Link href={getBuilderHomeHref(blueprint)} className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm">
              Back To Dedicated Builder
            </Link>
            {isAdmin ? (
              <Link href="/devboard?tab=build-cortex" className="rounded-lg border border-indigo-300/35 bg-indigo-500/15 hover:bg-indigo-500/25 px-4 py-2 text-sm">
                Open Build Cortex
              </Link>
            ) : null}
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>

        <section className="rounded-3xl border border-cyan-300/25 bg-cyan-500/10 p-5 mb-6">
          <h2 className="text-lg font-semibold text-cyan-100 mb-2">Live Sandbox Canvas</h2>
          <p className="text-xs text-cyan-50/90 mb-3">
            This is a renderable preview generated from your current prompt and builder lane.
          </p>

          {sandboxLoading ? <p className="text-sm text-slate-300">Rendering sandbox canvas...</p> : null}

          {!sandboxLoading && sandboxPreview ? (
            <>
              <div className="rounded-lg border border-white/15 bg-black/35 p-2">
                <iframe
                  title={sandboxPreview.title}
                  srcDoc={sandboxPreview.html}
                  className="w-full h-[560px] rounded-lg border-0 bg-slate-950"
                  sandbox="allow-scripts"
                />
              </div>
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Preview instructions</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-200">
                  {sandboxPreview.instructions.map((step) => (
                    <li key={step}>- {step}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {!sandboxLoading && !sandboxPreview ? (
            <p className="text-sm text-slate-300">Generate a preview to render the sandbox canvas.</p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <article className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <h2 className="text-sm font-semibold text-cyan-200 mb-2">Execution Blueprint</h2>
            {!concierge ? (
              <p className="text-sm text-slate-300">Run a prompt to load preview output.</p>
            ) : (
              <>
                <p className="text-sm text-slate-200">{concierge.summary}</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-200">
                  {concierge.implementationPlan.map((phase) => (
                    <li key={phase.phase} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <p className="font-medium text-slate-100">{phase.phase}</p>
                      <p className="text-slate-300 mt-1">{phase.tasks.slice(0, 2).join(' | ')}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <h2 className="text-sm font-semibold text-indigo-200 mb-2">Live Preview Surfaces</h2>
            {!concierge ? (
              <p className="text-sm text-slate-300">Preview surfaces appear after generation.</p>
            ) : (
              <div className="space-y-3 text-xs text-slate-200">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="font-medium text-white">Website Sections</p>
                  <p className="mt-1">{concierge.websiteSections.slice(0, 6).join(' | ') || 'No website sections returned.'}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="font-medium text-white">App Modules</p>
                  <p className="mt-1">{concierge.appModules.slice(0, 6).join(' | ') || 'No app modules returned.'}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <p className="font-medium text-white">Domain Suggestions</p>
                  <p className="mt-1">{concierge.domainSuggestions.slice(0, 4).join(', ') || 'No domain suggestions returned.'}</p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <h2 className="text-sm font-semibold text-blue-200 mb-2">Funnels + CRM + Snapshots</h2>
            {!automation ? (
              <p className="text-sm text-slate-300">Generate preview to load funnel and CRM model.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-200">
                <p className="text-slate-100">{automation.summary}</p>
                <p>Funnels: {automation.funnels.map((funnel) => funnel.name).join(' | ')}</p>
                <p>Pipeline stages: {automation.crmPipeline.stages.join(' -> ')}</p>
                <p>Snapshots: {automation.snapshots.map((snapshot) => snapshot.name).join(' | ')}</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <h2 className="text-sm font-semibold text-emerald-200 mb-2">Pricing + Offer Preview</h2>
            {!automation ? (
              <p className="text-sm text-slate-300">Pricing options load after generation.</p>
            ) : (
              <ul className="space-y-2 text-xs text-slate-200">
                {automation.pricingOptions.map((option) => (
                  <li key={option.name} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <p className="font-medium text-slate-100">{option.name}</p>
                    <p>Setup: {option.setup}</p>
                    <p>Monthly: {option.monthly}</p>
                    {option.optional ? <p>Optional: {option.optional}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
