"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CortexTopTabs from "@/components/navigation/CortexTopTabs";

type Track = {
  id: "roblox" | "cross-platform" | "marketplace";
  name: string;
  description: string;
  defaultGoals: string[];
};

type GamePlan = {
  buildId: string;
  createdAt: string;
  request: {
    projectName: string;
    track: Track["id"];
    genre: string;
    audience: string;
    coreLoop: string;
    monetization: "free-to-play" | "premium" | "hybrid";
    aiFeatures: string[];
    includeMarketplacePack: boolean;
    includeLiveOps: boolean;
  };
  trackSummary: {
    id: Track["id"];
    name: string;
    description: string;
    defaultGoals: string[];
  };
  architecture: {
    gameplaySystems: string[];
    aiSystems: string[];
    telemetry: string[];
    marketplace: string[];
  };
  milestones: Array<{
    title: string;
    objective: string;
    deliverables: string[];
    qualityGates: string[];
  }>;
  ctoTaskDrafts: Array<{
    type: "feature";
    description: string;
  }>;
};

type GenerateResponse = {
  plan?: GamePlan;
  queue?: {
    added: number;
    total: number;
  };
  error?: string;
};

type SandboxPreview = {
  title: string;
  summary: string;
  instructions: string[];
  html: string;
};

const aiFeatureOptions = [
  "npc-behavior-coach",
  "economy-balance-assistant",
  "quest-generation-engine",
  "player-retention-analytics",
  "live-ops-anomaly-guard",
  "difficulty-personalization",
];

const optimizationPromptLibrary = [
  {
    title: "AAA Rendering Optimization",
    prompt:
      "You are a senior graphics engineer. Audit this game builder for AAA-style rendering quality, frame stability, shader throughput, texture streaming, draw-call batching, and memory pressure bottlenecks.",
  },
  {
    title: "Vector + Physics Performance Audit",
    prompt:
      "You are a simulation architect. Optimize vector math paths, collision checks, broadphase/narrowphase loops, rigid-body update cadence, and determinism across client/server simulation boundaries.",
  },
  {
    title: "Bug + Performance Remediation",
    prompt:
      "Act as a principal engineer and run full bug detection plus performance remediation. Identify top regressions, patch architecture hotspots, and produce a prioritized fix roadmap with validation gates.",
  },
];

const defaultTracks: Track[] = [
  {
    id: "roblox",
    name: "Roblox Fast-Track",
    description: "Ship fast with Roblox-optimized systems and creator-focused economics.",
    defaultGoals: [
      "Build modular gameplay loop",
      "Define progression and reward model",
      "Prepare marketplace-ready content packs",
    ],
  },
  {
    id: "cross-platform",
    name: "Cross-Platform Prototype",
    description: "Design a shared architecture that can ship to multiple game environments.",
    defaultGoals: [
      "Unify core systems across platforms",
      "Instrument analytics and balancing hooks",
      "Create reusable asset workflows",
    ],
  },
  {
    id: "marketplace",
    name: "Marketplace Publishing",
    description: "Package, version, and monetize game modules in a creator ecosystem.",
    defaultGoals: [
      "Define package SKUs",
      "Generate creator docs and release notes",
      "Establish update cadence",
    ],
  },
];

export default function GameBuilderPage() {
  const [tracks] = useState<Track[]>(defaultTracks);
  const [projectName, setProjectName] = useState("Cortex Arena V1");
  const [track, setTrack] = useState<Track["id"]>("roblox");
  const [genre, setGenre] = useState("action-sim");
  const [audience, setAudience] = useState("creator economy players");
  const [coreLoop, setCoreLoop] = useState("collect, compete, upgrade, and collaborate");
  const [optimizationPrompt, setOptimizationPrompt] = useState(optimizationPromptLibrary[0].prompt);
  const [monetization, setMonetization] = useState<"free-to-play" | "premium" | "hybrid">("hybrid");
  const [includeMarketplacePack, setIncludeMarketplacePack] = useState(true);
  const [includeLiveOps, setIncludeLiveOps] = useState(true);
  const [enqueueToCto, setEnqueueToCto] = useState(false);
  const [aiFeatures, setAiFeatures] = useState<string[]>(aiFeatureOptions.slice(0, 4));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<GamePlan | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ added: number; total: number } | null>(null);
  const [sandboxPreview, setSandboxPreview] = useState<SandboxPreview | null>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  const selectedTrack = useMemo(
    () => tracks.find((item) => item.id === track) || tracks[0],
    [track, tracks]
  );

  const toggleAiFeature = (feature: string) => {
    setAiFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((item) => item !== feature)
        : [...prev, feature]
    );
  };

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setSandboxLoading(true);
    setSandboxError(null);
    setSandboxPreview(null);

    try {
      const res = await fetch("/api/game-builder/v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          track,
          genre,
          audience,
          coreLoop: `${coreLoop}. Optimization directives: ${optimizationPrompt}`,
          monetization,
          includeMarketplacePack,
          includeLiveOps,
          aiFeatures,
          enqueueToCto,
        }),
      });

      const data = (await res.json()) as GenerateResponse;
      if (!res.ok || !data.plan) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setPlan(data.plan);
      setQueueInfo(data.queue || null);

      const previewRes = await fetch("/api/sandbox/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: "game",
          prompt: `${projectName} for ${audience}. Core loop: ${coreLoop}`,
          projectName,
          genre,
          track,
          aiFeatures,
        }),
      });

      const previewData = (await previewRes.json().catch(() => ({}))) as {
        preview?: SandboxPreview;
        error?: string;
      };

      if (previewRes.ok && previewData.preview) {
        setSandboxPreview(previewData.preview);
      } else {
        setSandboxError(previewData.error || `Sandbox preview unavailable (${previewRes.status})`);
      }
    } catch (requestError) {
      const parsed = requestError as { message?: string };
      setError(parsed.message || "Failed to generate game builder plan");
    } finally {
      setLoading(false);
      setSandboxLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-zinc-900 text-white">
      <CortexTopTabs />

      <div className="mx-auto max-w-6xl p-6 md:p-10 space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-semibold">Game Builder V1 Lab</h1>
          <p className="text-gray-300 max-w-3xl">
            Design and generate a production-ready game plan with AI-driven architecture,
            growth loops, and marketplace packaging guidance.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/app-builder" className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 hover:bg-cyan-500/25">
              Open App Builder
            </Link>
            <Link href="/business-builder" className="rounded-full border border-indigo-400/35 bg-indigo-500/15 px-3 py-1 hover:bg-indigo-500/25">
              Open Business Builder
            </Link>
          </div>
        </header>

        <section className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5">
          <h2 className="text-lg font-semibold text-blue-100 mb-2">Game Optimization Prompt Library</h2>
          <p className="text-sm text-gray-200 mb-3">
            Choose a high-impact optimization directive before generating your plan.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {optimizationPromptLibrary.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setOptimizationPrompt(item.prompt)}
                className="rounded-xl border border-white/15 bg-black/30 p-3 text-left text-xs hover:bg-black/45"
              >
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-gray-300">{item.prompt.slice(0, 130)}...</p>
              </button>
            ))}
          </div>
          <textarea
            value={optimizationPrompt}
            onChange={(event) => setOptimizationPrompt(event.target.value)}
            className="mt-3 w-full min-h-24 rounded-lg bg-black/45 border border-white/15 p-3 text-xs"
          />
        </section>

        <section className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5">
          <h2 className="text-lg font-semibold text-cyan-200 mb-2">Behavioral UX Profile</h2>
          <p className="text-sm text-gray-200">
            Cyan and teal tones create trust during strategic planning, while amber accents mark high-stakes actions
            so teams can decide quickly without cognitive overload.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="text-lg font-semibold">Build Inputs</h2>

            <label className="text-sm text-gray-300 block">
              Project Name
              <input
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </label>

            <label className="text-sm text-gray-300 block">
              Track
              <select
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm"
                value={track}
                onChange={(e) => setTrack(e.target.value as Track["id"])}
              >
                {tracks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-300 block">
              Genre
              <input
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
            </label>

            <label className="text-sm text-gray-300 block">
              Audience
              <input
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </label>

            <label className="text-sm text-gray-300 block">
              Core Loop
              <textarea
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm h-20 resize-none"
                value={coreLoop}
                onChange={(e) => setCoreLoop(e.target.value)}
              />
            </label>

            <label className="text-sm text-gray-300 block">
              Monetization
              <select
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2 text-sm"
                value={monetization}
                onChange={(e) => setMonetization(e.target.value as "free-to-play" | "premium" | "hybrid")}
              >
                <option value="free-to-play">free-to-play</option>
                <option value="premium">premium</option>
                <option value="hybrid">hybrid</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <h2 className="text-lg font-semibold">AI and Delivery Controls</h2>
            <p className="text-sm text-gray-400">Select the AI systems you want in this build pass.</p>

            <div className="grid grid-cols-1 gap-2">
              {aiFeatureOptions.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm text-gray-200 rounded bg-black/30 border border-white/10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={aiFeatures.includes(feature)}
                    onChange={() => toggleAiFeature(feature)}
                    className="accent-cyan-500"
                  />
                  {feature}
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={includeMarketplacePack}
                onChange={(e) => setIncludeMarketplacePack(e.target.checked)}
                className="accent-emerald-500"
              />
              Include marketplace packaging path
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={includeLiveOps}
                onChange={(e) => setIncludeLiveOps(e.target.checked)}
                className="accent-amber-500"
              />
              Include live-ops milestone
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={enqueueToCto}
                onChange={(e) => setEnqueueToCto(e.target.checked)}
                className="accent-fuchsia-500"
              />
              Queue generated tasks into CTO backlog
            </label>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-gray-200">
              <p className="font-semibold text-cyan-100 mb-1">Track focus: {selectedTrack.name}</p>
              <ul className="space-y-1">
                {selectedTrack.defaultGoals.map((goal) => (
                  <li key={goal}>- {goal}</li>
                ))}
              </ul>
            </div>

            <button
              onClick={generatePlan}
              disabled={loading}
              className="w-full rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate V1 Game Builder Plan"}
            </button>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {queueInfo ? (
              <p className="text-xs text-emerald-200">Queued {queueInfo.added} tasks (queue size: {queueInfo.total}).</p>
            ) : null}
          </div>
        </section>

        {plan ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold mb-2">Plan Summary</h2>
              <p className="text-sm text-gray-300">Build ID: {plan.buildId}</p>
              <p className="text-sm text-gray-300">Track: {plan.trackSummary.name}</p>
              <p className="text-sm text-gray-300">Created: {new Date(plan.createdAt).toLocaleString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-cyan-200 mb-2">Gameplay Systems</h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  {plan.architecture.gameplaySystems.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-emerald-200 mb-2">AI Systems</h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  {plan.architecture.aiSystems.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-amber-200 mb-2">Telemetry</h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  {plan.architecture.telemetry.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-fuchsia-200 mb-2">Marketplace</h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  {plan.architecture.marketplace.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold mb-3">Milestones</h3>
              <div className="space-y-4">
                {plan.milestones.map((milestone) => (
                  <article key={milestone.title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <h4 className="font-semibold text-white">{milestone.title}</h4>
                    <p className="text-sm text-gray-300 mt-1">{milestone.objective}</p>
                    <p className="text-xs text-gray-500 mt-2 mb-1">Deliverables</p>
                    <ul className="space-y-1 text-sm text-gray-300">
                      {milestone.deliverables.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 mt-3 mb-1">Quality gates</p>
                    <ul className="space-y-1 text-sm text-gray-300">
                      {milestone.qualityGates.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5">
              <h3 className="text-lg font-semibold text-cyan-100 mb-2">Live Game Sandbox</h3>
              <p className="text-xs text-cyan-50/90 mb-3">
                Generated playable scaffold preview for this game concept before build tasks are executed.
              </p>

              {sandboxLoading ? <p className="text-sm text-gray-300">Rendering game sandbox preview...</p> : null}
              {sandboxError ? <p className="text-sm text-amber-200">{sandboxError}</p> : null}

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

              {!sandboxLoading && !sandboxPreview && !sandboxError ? (
                <p className="text-sm text-slate-300">Generate a plan to render sandbox preview.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold mb-2">CTO Task Drafts</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                {plan.ctoTaskDrafts.map((task) => (
                  <li key={task.description}>- {task.description}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
