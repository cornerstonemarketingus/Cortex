"use client";

import Link from "next/link";
import { useState } from "react";
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type WebsitePlanResponse = {
  response?: {
    summary?: string;
    nextActions?: string[];
    domainSuggestions?: string[];
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

type SandboxPreviewResponse = {
  preview?: {
    html: string;
    title: string;
  };
  error?: string;
};

const domainProviders = ["manual-dns", "godaddy", "namecheap"] as const;
const automationBundles = [
  "AI voice receptionist + missed call text-back",
  "Lead intake form to CRM pipeline automation",
  "Estimate follow-up nurture sequence",
  "Review and referral request workflows",
  "Seasonal offer and reactivation campaigns",
  "GBP and directory optimization reminders",
] as const;

export default function WebsiteBuilderPage() {
  const [leadMode, setLeadMode] = useState<"lead-gen" | "construction-lead-gen">("lead-gen");
  const [businessName, setBusinessName] = useState("Northfield Growth Co");
  const [prompt, setPrompt] = useState("Build a high-converting lead generation site with quote form, AI follow-up hooks, and strong trust sections.");
  const [domain, setDomain] = useState("northfieldgrowth.com");
  const [provider, setProvider] = useState<(typeof domainProviders)[number]>("manual-dns");
  const [contactEmail, setContactEmail] = useState("owner@northfieldgrowth.com");
  const [selectedAutomationBundles, setSelectedAutomationBundles] = useState<string[]>([
    automationBundles[0],
    automationBundles[1],
    automationBundles[2],
  ]);

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingLaunch, setLoadingLaunch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchResponse["launch"] | null>(null);

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
      const scopedPrompt = `${leadMode === "construction-lead-gen" ? "Construction lead generation website:" : "Lead generation website:"} ${prompt}\nAutomation requirements: ${selectedAutomationBundles.join(", ") || "none"}.`;
      const response = await fetch("/api/builder/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: scopedPrompt,
          blueprint: "website",
          mode: "visitor",
          includeDomainSales: true,
          includeAutonomousIdeas: true,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as WebsitePlanResponse;
      if (!response.ok || !parsed.response?.summary) {
        throw new Error(parsed.error || `Website plan failed (${response.status})`);
      }

      setSummary(parsed.response.summary);
      setActions(parsed.response.nextActions || []);
      setDomains(parsed.response.domainSuggestions || []);

      setLoadingPreview(true);
      const previewResponse = await fetch("/api/sandbox/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: "website",
          prompt: scopedPrompt,
          projectName: businessName,
        }),
      });
      const previewParsed = (await previewResponse.json().catch(() => ({}))) as SandboxPreviewResponse;
      if (previewResponse.ok && previewParsed.preview?.html) {
        setPreviewHtml(previewParsed.preview.html);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to generate website plan.");
    } finally {
      setLoadingPreview(false);
      setLoadingPlan(false);
    }
  };

  const launchSite = async () => {
    if (!businessName.trim() || loadingLaunch) return;

    setLoadingLaunch(true);
    setError(null);

    try {
      const response = await fetch("/api/hosting/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType: "website",
          projectName: businessName,
          prompt: `${leadMode === "construction-lead-gen" ? "Construction" : "General"} lead generation website for ${businessName}. ${prompt}`,
          preferredDomain: domain.trim() || undefined,
          domainProvider: provider,
          contactEmail,
          purchaseDomain: Boolean(domain.trim()),
          autoConnectDomain: Boolean(domain.trim()),
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as LaunchResponse;
      if (!response.ok || !parsed.launch) {
        throw new Error(parsed.error || `Website launch failed (${response.status})`);
      }

      setLaunch(parsed.launch);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to launch website right now.");
    } finally {
      setLoadingLaunch(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#221714] via-[#2c211b] to-[#181312] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="glass rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Website Builder</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Build a high-converting business website</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
            Execution workflow only: define offer, render live preview, and launch production.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-orange-300/35 bg-orange-500/10 p-5">
            <h2 className="text-xl font-semibold text-orange-100">Build setup</h2>

            <label className="mt-3 block text-xs text-orange-50">
              Lead mode
              <select
                value={leadMode}
                onChange={(event) => setLeadMode(event.target.value as "lead-gen" | "construction-lead-gen")}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              >
                <option value="lead-gen">General lead generation</option>
                <option value="construction-lead-gen">Construction lead generation</option>
              </select>
            </label>

            <label className="mt-3 block text-xs text-orange-50">
              Business name
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <label className="mt-3 block text-xs text-orange-50">
              Prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <div className="mt-3">
              <p className="text-xs text-orange-50">Automation bundles</p>
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
                          ? "border-orange-200/70 bg-orange-200/20 text-orange-50"
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
                className="rounded-xl bg-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-200 disabled:opacity-60"
              >
                {loadingPlan ? "Generating..." : "Generate Website Plan"}
              </button>
              <Link href="/signup" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
                Sign Up To Launch
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">Launch</h2>
            <p className="mt-2 text-xs text-slate-300">
              Selected automations will be attached to this launch scope for CRM, receptionist, and follow-up workflows.
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
              onClick={() => void launchSite()}
              disabled={loadingLaunch}
              className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loadingLaunch ? "Launching..." : "Launch Website"}
            </button>

            {launch ? (
              <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
                <p>Project: {launch.project.name}</p>
                <a className="text-cyan-200 underline" href={launch.deployment.productionUrl} target="_blank" rel="noreferrer">
                  Open production site
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
            {domains.length > 0 ? (
              <p className="mt-3 text-xs text-orange-200">Domain ideas: {domains.slice(0, 3).join(", ")}</p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-5">
          <h2 className="text-lg font-semibold text-cyan-100">Live Site Preview</h2>
          {loadingPreview ? <p className="mt-2 text-sm text-slate-300">Rendering preview...</p> : null}
          {!loadingPreview && !previewHtml ? (
            <p className="mt-2 text-sm text-slate-300">Run Generate Website Plan to render a visual site preview.</p>
          ) : null}
          {previewHtml ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-white">
              <iframe title="Website preview" srcDoc={previewHtml} className="h-[500px] w-full border-0" />
            </div>
          ) : null}
        </section>

        {leadMode === "construction-lead-gen" ? (
          <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5 text-sm text-slate-200">
            Construction lane enabled. Use estimator workflows here: <Link className="text-cyan-200 underline" href="/estimate">Estimator</Link> or <Link className="text-cyan-200 underline" href="/construction-solutions">Bid Build workspace</Link>.
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-200">
          <h2 className="text-lg font-semibold text-orange-100">Voice receptionist and automation outcome</h2>
          <p className="mt-2 text-slate-300">
            This builder now packages site build + launch + service automations so your published asset is ready to capture, route, and close leads immediately.
          </p>
          <div className="mt-3 text-xs text-slate-300">Configured bundles: {selectedAutomationBundles.length > 0 ? selectedAutomationBundles.join(', ') : 'none selected'}</div>
        </section>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
