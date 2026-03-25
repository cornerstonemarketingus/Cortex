"use client";

import Link from "next/link";
import { useState } from "react";
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type AppPlanResponse = {
  response?: {
    summary?: string;
    nextActions?: string[];
  };
  error?: string;
};

type SandboxPreviewResponse = {
  preview?: {
    html: string;
  };
  error?: string;
};

type LaunchResponse = {
  launch?: {
    project: {
      id: string;
      name: string;
    };
    deployment: {
      productionUrl: string;
      previewUrl: string;
    };
    launchChecklist: string[];
  };
  error?: string;
};

type ChatResponse = {
  responses?: string[];
  teamDecision?: string;
  error?: string;
};

const domainProviders = ["manual-dns", "godaddy", "namecheap"] as const;
const automationBundles = [
  "AI voice receptionist handoff to app inbox",
  "Pipeline stage updates from app events",
  "Appointment reminders and no-show rescue",
  "Lead reactivation campaigns",
  "Review and referral loop automation",
  "KPI alerting and conversion monitoring",
] as const;

export default function AppBuilderPage() {
  const [appName, setAppName] = useState("LeadFlow Ops");
  const [prompt, setPrompt] = useState("Create a lead-gen operations app with pipeline board, quote intake, and AI follow-up tasking.");
  const [domain, setDomain] = useState("leadflowops.app");
  const [provider, setProvider] = useState<(typeof domainProviders)[number]>("manual-dns");
  const [contactEmail, setContactEmail] = useState("owner@leadflowops.app");
  const [selectedAutomationBundles, setSelectedAutomationBundles] = useState<string[]>([
    automationBundles[0],
    automationBundles[1],
    automationBundles[2],
  ]);

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchResponse["launch"] | null>(null);
  const [copilotPrompt, setCopilotPrompt] = useState('Refactor onboarding flow and tighten CTA hierarchy for higher conversion.');
  const [copilotOutput, setCopilotOutput] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);

  const toggleAutomationBundle = (bundle: string) => {
    setSelectedAutomationBundles((current) =>
      current.includes(bundle) ? current.filter((item) => item !== bundle) : [...current, bundle]
    );
  };

  const runPlan = async () => {
    if (!prompt.trim() || loadingPlan) return;

    setLoadingPlan(true);
    setError(null);

    try {
      const response = await fetch("/api/builder/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Build a production-ready app: ${prompt}\nAutomation requirements: ${selectedAutomationBundles.join(", ") || "none"}.`,
          blueprint: "app",
          mode: "visitor",
          includeDomainSales: true,
          includeAutonomousIdeas: true,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as AppPlanResponse;
      if (!response.ok || !parsed.response?.summary) {
        throw new Error(parsed.error || `App plan failed (${response.status})`);
      }

      setSummary(parsed.response.summary);
      setActions(parsed.response.nextActions || []);

      const previewResponse = await fetch("/api/sandbox/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: "app",
          prompt,
          projectName: appName,
        }),
      });
      const previewParsed = (await previewResponse.json().catch(() => ({}))) as SandboxPreviewResponse;
      if (previewResponse.ok && previewParsed.preview?.html) {
        setPreviewHtml(previewParsed.preview.html);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to generate app plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const launchApp = async () => {
    if (!appName.trim() || loadingLaunch) return;

    setLoadingLaunch(true);
    setError(null);

    try {
      const response = await fetch("/api/hosting/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType: "app",
          projectName: appName,
          prompt,
          preferredDomain: domain.trim() || undefined,
          domainProvider: provider,
          contactEmail,
          purchaseDomain: Boolean(domain.trim()),
          autoConnectDomain: Boolean(domain.trim()),
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as LaunchResponse;
      if (!response.ok || !parsed.launch) {
        throw new Error(parsed.error || `App launch failed (${response.status})`);
      }

      setLaunch(parsed.launch);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to launch app right now.");
    } finally {
      setLoadingLaunch(false);
    }
  };

  const runCopilot = async () => {
    if (!copilotPrompt.trim() || copilotLoading) return;

    setCopilotLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bots',
          botIds: [1, 2, 4, 6],
          includeTeamDecision: true,
          tone: 'support',
          message: `Builder Copilot request for App Builder. Return executable implementation guidance and code edit steps. Request: ${copilotPrompt}`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || (!parsed.teamDecision && !parsed.responses?.[0])) {
        throw new Error(parsed.error || `Copilot request failed (${response.status})`);
      }

      setCopilotOutput(parsed.teamDecision || parsed.responses?.[0] || null);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run Builder Copilot right now.');
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#020617] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="glass rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">App Builder</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Build and launch your business app</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
            App-store-ready workflow: define scope, render preview, and publish production.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
          <h2 className="text-lg font-semibold text-cyan-100">Built-in Builder Copilot</h2>
          <p className="mt-1 text-xs text-cyan-50/90">Ask for code-level changes, implementation tasks, and edit-ready guidance directly in the builder.</p>
          <textarea
            value={copilotPrompt}
            onChange={(event) => setCopilotPrompt(event.target.value)}
            className="mt-3 min-h-20 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runCopilot()}
              disabled={copilotLoading}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {copilotLoading ? 'Running...' : 'Run Builder Copilot'}
            </button>
            <Link href="/chat" className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">
              Open Full Copilot Chat
            </Link>
          </div>
          {copilotOutput ? <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">{copilotOutput}</pre> : null}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">App setup</h2>

            <label className="mt-3 block text-xs text-cyan-50">
              App name
              <input
                value={appName}
                onChange={(event) => setAppName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <label className="mt-3 block text-xs text-cyan-50">
              Prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-3">
              <p className="text-xs text-cyan-50">Automation bundles</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {automationBundles.map((bundle) => {
                  const selected = selectedAutomationBundles.includes(bundle);
                  return (
                    <button
                      key={bundle}
                      type="button"
                      onClick={() => toggleAutomationBundle(bundle)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                        selected
                          ? "border-cyan-200/70 bg-cyan-200/20 text-cyan-50"
                          : "border-white/20 bg-black/20 text-slate-200 hover:bg-black/30"
                      }`}
                    >
                      {bundle}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runPlan()}
                disabled={loadingPlan}
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                {loadingPlan ? "Generating..." : "Generate App Plan"}
              </button>
              <Link href="/signup" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
                Sign Up To Launch
              </Link>
            </div>

            {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-amber-100">Launch</h2>
            <p className="mt-2 text-xs text-slate-300">
              Launch includes app build plus selected automation bundles for receptionist routing, nurture, and conversion operations.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-300">
                Preferred domain
                <input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-slate-300">
                Provider
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as (typeof domainProviders)[number])}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
                >
                  {domainProviders.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-3 block text-xs text-slate-300">
              Contact email
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => void launchApp()}
              disabled={loadingLaunch}
              className="mt-4 rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
            >
              {loadingLaunch ? "Launching..." : "Launch App"}
            </button>

            {launch ? (
              <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
                <p>Project: {launch.project.name}</p>
                <a className="text-amber-200 underline" href={launch.deployment.productionUrl} target="_blank" rel="noreferrer">
                  Open production app
                </a>
              </div>
            ) : null}
          </article>
        </section>

        {summary ? (
          <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-200">
            <p>{summary}</p>
            {actions.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-slate-300">
                {actions.slice(0, 4).map((action) => (
                  <li key={action}>- {action}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-5">
          <h2 className="text-lg font-semibold text-cyan-100">Live App Preview</h2>
          {!previewHtml ? <p className="mt-2 text-sm text-slate-300">Run Generate App Plan to render a visual app preview.</p> : null}
          {previewHtml ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-white">
              <iframe title="App preview" srcDoc={previewHtml} className="h-[500px] w-full border-0" />
            </div>
          ) : null}
        </section>

      </div>
    </main>
  );
}
