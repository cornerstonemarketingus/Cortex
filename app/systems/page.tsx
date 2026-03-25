"use client";

import { useEffect, useMemo, useState } from "react";

type LifecyclePhase = "capture" | "nurture" | "close" | "evangelize" | "reactivate";
type ModuleStatus = "live" | "v1" | "planned";

type SystemModule = {
  id: string;
  name: string;
  phase: LifecyclePhase;
  status: ModuleStatus;
  domains: string[];
  description: string;
  aiAdvancements: string[];
  existingRoutes: string[];
};

type SystemsResponse = {
  summary: {
    total: number;
    byPhase: Record<LifecyclePhase, number>;
    byStatus: Record<ModuleStatus, number>;
  };
  modules: SystemModule[];
};

type RolloutTask = {
  moduleId: string;
  moduleName: string;
  phase: LifecyclePhase;
  priority: "p0" | "p1" | "p2";
  type: "feature";
  description: string;
};

type RolloutResponse = {
  rolloutPlan?: {
    scope: string;
    totalTasks: number;
    tasks: RolloutTask[];
  };
  queue?: {
    added: number;
    total: number;
  };
  executions?: {
    requested: number;
    completed: number;
    idle: number;
    failed: number;
    results: Array<{
      status: "idle" | "completed" | "error";
      message?: string;
      error?: string;
      duration_ms?: number;
    }>;
  };
  error?: string;
};

const phases: Array<LifecyclePhase | "all"> = ["all", "capture", "nurture", "close", "evangelize", "reactivate"];
const statuses: Array<ModuleStatus | "all"> = ["all", "live", "v1", "planned"];

export default function SystemsPage() {
  const [phase, setPhase] = useState<LifecyclePhase | "all">("all");
  const [status, setStatus] = useState<ModuleStatus | "all">("all");
  const [domain, setDomain] = useState("all");
  const [search, setSearch] = useState("");

  const [modules, setModules] = useState<SystemModule[]>([]);
  const [summary, setSummary] = useState<SystemsResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rolloutLoading, setRolloutLoading] = useState(false);
  const [enqueueToCto, setEnqueueToCto] = useState(false);
  const [executeNow, setExecuteNow] = useState(false);
  const [maxExecutions, setMaxExecutions] = useState(3);
  const [rolloutTasks, setRolloutTasks] = useState<RolloutTask[]>([]);
  const [rolloutError, setRolloutError] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ added: number; total: number } | null>(null);
  const [executionInfo, setExecutionInfo] = useState<RolloutResponse["executions"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSystems = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "250");
        if (phase !== "all") params.set("phase", phase);
        if (status !== "all") params.set("status", status);
        if (domain !== "all") params.set("domain", domain);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/crm/platform/systems?${params.toString()}`);
        const data = (await res.json()) as SystemsResponse & { error?: string };

        if (!res.ok) {
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        if (cancelled) return;
        setModules(data.modules || []);
        setSummary(data.summary || null);
      } catch (requestError) {
        if (cancelled) return;
        const parsed = requestError as { message?: string };
        setError(parsed.message || "Failed to load system catalog");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSystems();

    return () => {
      cancelled = true;
    };
  }, [phase, status, domain, search]);

  const availableDomains = useMemo(() => {
    const domainSet = new Set<string>();
    for (const system of modules) {
      for (const tag of system.domains) domainSet.add(tag);
    }
    return ["all", ...Array.from(domainSet).sort()];
  }, [modules]);

  const generateRolloutPlan = async () => {
    setRolloutLoading(true);
    setRolloutError(null);
    setQueueInfo(null);
    setExecutionInfo(null);

    try {
      const res = await fetch("/api/crm/platform/systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "missing",
          limit: 40,
          enqueueToCto,
          executeNow,
          maxExecutions,
        }),
      });

      const data = (await res.json()) as RolloutResponse;
      if (!res.ok || !data.rolloutPlan) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setRolloutTasks(data.rolloutPlan.tasks || []);
      setQueueInfo(data.queue || null);
      setExecutionInfo(data.executions || null);
    } catch (requestError) {
      const parsed = requestError as { message?: string };
      setRolloutError(parsed.message || "Failed to generate rollout plan");
    } finally {
      setRolloutLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-zinc-900 text-white p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-semibold">Unified Systems Catalog</h1>
          <p className="text-gray-300 mt-2 max-w-3xl">
            Full-stack AI CRM and builder capability map across Capture, Nurture, Close, Evangelize, and Reactivate.
          </p>
        </header>

        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-gray-100">
          Strategic mode: use this catalog to sequence high-impact modules, then push rollout tasks to CTO queue.
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="text-sm text-gray-300">
              Phase
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as LifecyclePhase | "all")}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2"
              >
                {phases.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-300">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ModuleStatus | "all")}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-300">
              Domain
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2"
              >
                {availableDomains.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-300">
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="voice ai, payments, marketplace..."
                className="w-full mt-1 rounded-lg bg-black/40 border border-white/15 p-2"
              />
            </label>
          </div>

          {summary ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">Total: {summary.total}</div>
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">Live: {summary.byStatus.live}</div>
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">V1: {summary.byStatus.v1}</div>
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">Planned: {summary.byStatus.planned}</div>
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">Capture: {summary.byPhase.capture}</div>
              <div className="rounded bg-black/30 border border-white/10 px-3 py-2">Nurture: {summary.byPhase.nurture}</div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={enqueueToCto}
                onChange={(e) => setEnqueueToCto(e.target.checked)}
                className="accent-amber-500"
              />
              Enqueue rollout tasks to CTO backlog
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={executeNow}
                onChange={(e) => setExecuteNow(e.target.checked)}
                className="accent-fuchsia-500"
              />
              Execute queued tasks immediately
            </label>
            <label className="text-sm text-gray-200 flex items-center gap-2">
              Max runs
              <input
                type="number"
                min={1}
                max={10}
                value={maxExecutions}
                onChange={(e) => setMaxExecutions(Math.max(1, Math.min(Number(e.target.value) || 1, 10)))}
                className="w-20 rounded-lg bg-black/40 border border-white/15 p-1.5"
              />
            </label>
            <button
              onClick={generateRolloutPlan}
              disabled={rolloutLoading}
              className="rounded-lg border border-amber-400/40 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {rolloutLoading ? "Running..." : executeNow ? "Implement Missing Modules Now" : "Generate Rollout Plan"}
            </button>
            {queueInfo ? (
              <span className="text-xs text-emerald-200">Queued {queueInfo.added} tasks (queue size: {queueInfo.total}).</span>
            ) : null}
          </div>

          {executionInfo ? (
            <div className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 p-3 text-xs text-gray-200">
              <p className="font-semibold text-fuchsia-200 mb-1">Immediate execution summary</p>
              <p>Requested: {executionInfo.requested} • Completed: {executionInfo.completed} • Idle: {executionInfo.idle} • Failed: {executionInfo.failed}</p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {rolloutError ? <p className="text-sm text-red-300">{rolloutError}</p> : null}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 max-h-[60vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3">Systems ({modules.length})</h2>
            {loading ? <p className="text-sm text-gray-400">Loading catalog...</p> : null}
            {!loading && modules.length === 0 ? <p className="text-sm text-gray-400">No modules match current filters.</p> : null}

            <div className="space-y-3">
              {modules.map((system) => (
                <article key={system.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{system.name}</h3>
                    <span className="text-[11px] uppercase tracking-wide text-cyan-200">{system.status}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{system.description}</p>
                  <p className="text-[11px] text-gray-500 mt-2">Phase: {system.phase}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Domains: {system.domains.join(", ")}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 max-h-[60vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-3">Rollout Tasks ({rolloutTasks.length})</h2>
            {rolloutTasks.length === 0 ? (
              <p className="text-sm text-gray-400">Generate a rollout plan to populate this queue.</p>
            ) : (
              <div className="space-y-3">
                {rolloutTasks.map((task) => (
                  <article key={`${task.moduleId}-${task.description}`} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{task.moduleName}</h3>
                      <span className="text-[11px] uppercase tracking-wide text-amber-200">{task.priority}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{task.description}</p>
                    <p className="text-[11px] text-gray-500 mt-2">Phase: {task.phase}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
