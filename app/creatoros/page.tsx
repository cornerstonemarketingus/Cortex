"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';

type LaunchResponse = {
  launch?: {
    project: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    deployment: {
      deploymentId: string;
      productionUrl: string;
      previewUrl: string;
    };
    domainOrder?: {
      orderId: string;
      status: string;
      provider: string;
    } | null;
    domainConnection?: {
      connectionId: string;
      status: string;
    } | null;
    launchChecklist: string[];
  };
  error?: string;
};

const providerOptions = ['godaddy', 'namecheap', 'manual-dns'] as const;

export default function CreatorOsPage() {
  const [projectType, setProjectType] = useState<'website' | 'app'>('website');
  const [projectName, setProjectName] = useState('Cortex Project');
  const [projectPrompt, setProjectPrompt] = useState('Build a conversion-first service website with instant lead capture.');
  const [preferredDomain, setPreferredDomain] = useState('mylaunch.app');
  const [domainProvider, setDomainProvider] = useState<(typeof providerOptions)[number]>('manual-dns');
  const [contactEmail, setContactEmail] = useState('owner@mylaunch.app');
  const [purchaseDomain, setPurchaseDomain] = useState(true);
  const [autoConnectDomain, setAutoConnectDomain] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchResponse['launch'] | null>(null);
  const [widgetCategory, setWidgetCategory] = useState('roof-replacement');
  const [widgetHeadline, setWidgetHeadline] = useState('Get a fast project cost range');
  const [widgetAccent, setWidgetAccent] = useState('#06b6d4');

  const suggestedAppDomain = useMemo(() => {
    const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'mylaunch';
    return `${slug}.app`;
  }, [projectName]);

  const estimatorWidgetSnippet = useMemo(() => {
    const query = new URLSearchParams({
      projectType: widgetCategory,
      headline: widgetHeadline,
      accent: widgetAccent,
    });
    const src = `/estimate?${query.toString()}`;

    return `<iframe src="${src}" title="Estimator Widget" style="width:100%;height:640px;border:0;border-radius:16px;"></iframe>`;
  }, [widgetCategory, widgetHeadline, widgetAccent]);

  const runCreatorLaunch = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hosting/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          projectName,
          prompt: projectPrompt,
          preferredDomain: preferredDomain.trim() || undefined,
          domainProvider,
          contactEmail,
          purchaseDomain: Boolean(preferredDomain.trim()) && purchaseDomain,
          autoConnectDomain: Boolean(preferredDomain.trim()) && autoConnectDomain,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as LaunchResponse;
      if (!response.ok || !parsed.launch) {
        throw new Error(parsed.error || `Creator launch failed (${response.status})`);
      }

      setLaunchResult(parsed.launch);
    } catch (launchError) {
      const message = launchError instanceof Error ? launchError.message : 'Failed to launch project';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Cortex Builder Suite</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Cortex</h1>
        <p className="mt-3 max-w-3xl text-sm text-fuchsia-50/90">
          Build apps, websites, and games with AI instantly. Cortex owns full builder power, hosting, and domain lifecycle.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/website-builder" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">Website Builder</p>
          <p className="mt-2 text-xs text-slate-300">Full design and conversion controls.</p>
        </Link>
        <Link href="/app-builder" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">App Builder</p>
          <p className="mt-2 text-xs text-slate-300">App architecture and module generation.</p>
        </Link>
        <Link href="/game-builder" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">Game Builder (Optional)</p>
          <p className="mt-2 text-xs text-slate-300">Optional expansion lane for creator workflows.</p>
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
        <article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
          <h2 className="text-lg font-semibold text-cyan-100 mb-3">One-Click Launch + Domain</h2>
          <p className="text-xs text-cyan-50/90 mb-3">
            Streamlined launch flow for hosting plus domain purchase/connectivity. Suggestion: {suggestedAppDomain}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="text-xs text-cyan-100 block">
              Project type
              <select
                value={projectType}
                onChange={(event) => setProjectType(event.target.value as 'website' | 'app')}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                <option value="website">website</option>
                <option value="app">app</option>
              </select>
            </label>

            <label className="text-xs text-cyan-100 block">
              Project name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-xs text-cyan-100 block mt-2">
            Prompt
            <textarea
              value={projectPrompt}
              onChange={(event) => setProjectPrompt(event.target.value)}
              className="mt-1 w-full min-h-20 rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <label className="text-xs text-cyan-100 block">
              Preferred domain
              <input
                value={preferredDomain}
                onChange={(event) => setPreferredDomain(event.target.value)}
                placeholder="mylaunch.app"
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-cyan-100 block">
              Domain provider
              <select
                value={domainProvider}
                onChange={(event) => setDomainProvider(event.target.value as (typeof providerOptions)[number])}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-xs text-cyan-100 block mt-2">
            Contact email for domain order
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>

          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-cyan-100">
              <input
                type="checkbox"
                checked={purchaseDomain}
                onChange={(event) => setPurchaseDomain(event.target.checked)}
                className="accent-cyan-300"
              />
              Purchase domain
            </label>
            <label className="inline-flex items-center gap-2 text-cyan-100">
              <input
                type="checkbox"
                checked={autoConnectDomain}
                onChange={(event) => setAutoConnectDomain(event.target.checked)}
                className="accent-cyan-300"
              />
              Auto-connect domain
            </label>
          </div>

          <button
            type="button"
            onClick={() => void runCreatorLaunch()}
            disabled={loading}
            className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Launching...' : 'Launch Creator Project'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </article>

        <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <h2 className="text-lg font-semibold text-fuchsia-100 mb-3">Launch Output</h2>
          {!launchResult ? (
            <p className="text-sm text-slate-300">Run launch to create hosting deployment and domain lifecycle records.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-200">
              <p>
                Project: <span className="font-semibold text-fuchsia-100">{launchResult.project.name}</span> ({launchResult.project.id})
              </p>
              <p>
                Deployment: <span className="font-semibold text-fuchsia-100">{launchResult.deployment.deploymentId}</span>
              </p>
              <a
                href={launchResult.deployment.productionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs text-cyan-200 underline"
              >
                Open production URL
              </a>

              {launchResult.domainOrder ? (
                <p className="text-xs">
                  Domain order: {launchResult.domainOrder.orderId} via {launchResult.domainOrder.provider} ({launchResult.domainOrder.status})
                </p>
              ) : null}

              {launchResult.domainConnection ? (
                <p className="text-xs">
                  Domain connection: {launchResult.domainConnection.connectionId} ({launchResult.domainConnection.status})
                </p>
              ) : null}

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-slate-400">Checklist</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {launchResult.launchChecklist.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5">
        <h2 className="text-lg font-semibold text-amber-100">Estimator Synergy</h2>
        <p className="mt-2 text-sm text-amber-50/90">
          Cortex can generate and embed estimator widgets into sites, while Bid Build owns estimate execution and AIBoost owns follow-up automation.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/estimate" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
            Open Estimator Widget Target
          </Link>
          <Link href="/tradesos" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
            Open Bid Build
          </Link>
          <Link href="/autoflow" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
            Open AIBoost
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
        <h2 className="text-lg font-semibold text-cyan-100">Estimator Widget Generator</h2>
        <p className="mt-2 text-sm text-cyan-50/90">
          Generate embed code for public estimator widgets to drop into Cortex websites and landing pages.
        </p>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <label className="text-xs text-cyan-100 block">
            Default project type
            <input
              value={widgetCategory}
              onChange={(event) => setWidgetCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs text-cyan-100 block">
            Widget headline
            <input
              value={widgetHeadline}
              onChange={(event) => setWidgetHeadline(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-xs text-cyan-100 block">
            Accent color
            <input
              value={widgetAccent}
              onChange={(event) => setWidgetAccent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
          <p className="text-xs text-slate-400 mb-2">Embed snippet</p>
          <pre className="whitespace-pre-wrap text-xs text-slate-200">{estimatorWidgetSnippet}</pre>
        </div>
      </section>
    </div>
  );
}
