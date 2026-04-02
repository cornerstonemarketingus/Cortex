"use client";

import { useEffect, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type CommercialProject = {
  id: string;
  title: string;
  zipCode: string;
  city: string;
  scope: string;
  estimatedValue: string;
  bidDue: string;
  source: string;
  status: 'open' | 'closing-soon';
};

type CommercialProjectsResponse = {
  zipCode: string;
  total: number;
  projects: CommercialProject[];
  notes?: string;
};

export default function BidBoardPage() {
  const [zipCode, setZipCode] = useState('55123');
  const [projects, setProjects] = useState<CommercialProject[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async (nextZip = zipCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/construction/commercial-projects?zipCode=${encodeURIComponent(nextZip)}&limit=12`, {
        cache: 'no-store',
      });
      const parsed = (await response.json().catch(() => ({}))) as Partial<CommercialProjectsResponse> & {
        error?: string;
      };

      if (!response.ok || !Array.isArray(parsed.projects)) {
        throw new Error(parsed.error || `Unable to load commercial projects (${response.status})`);
      }

      setProjects(parsed.projects);
      setNotes(parsed.notes || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load bid board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects('55123');
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#142233_0%,#0c1521_45%,#060b12_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Commercial Bid Board</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-5xl">Track live-fit construction opportunities by market</h1>
          <p className="mt-3 max-w-4xl text-sm text-cyan-50/90 md:text-base">
            Use normalized commercial project feeds to spot bid opportunities, filter by ZIP, and feed selected projects into estimating and workflow automations.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-black/25 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_160px_1fr] md:items-end">
            <label className="text-xs text-slate-300">
              Target ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value.slice(0, 5))}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
                placeholder="55123"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadProjects()}
              disabled={loading || zipCode.trim().length < 5}
              className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? 'Refreshing...' : 'Refresh Feed'}
            </button>
            <p className="text-xs text-slate-400">
              This board is provider-ready. For production live listings, connect approved public procurement feeds or licensed data partners instead of scraping restricted proprietary services directly.
            </p>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {notes ? <p className="mt-3 text-xs text-slate-400">{notes}</p> : null}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-2xl border border-white/20 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">{project.source}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{project.title}</h2>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${project.status === 'open' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                  {project.status === 'open' ? 'Open' : 'Closing Soon'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-500">Market:</span> {project.city} {project.zipCode}</p>
                <p><span className="text-slate-500">Scope:</span> {project.scope}</p>
                <p><span className="text-slate-500">Estimated Value:</span> {project.estimatedValue}</p>
                <p><span className="text-slate-500">Bid Due:</span> {project.bidDue}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/estimate?zip=${encodeURIComponent(project.zipCode)}&prompt=${encodeURIComponent(project.title)}`} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">
                  Build Estimate
                </a>
                <a href={`/automations?prompt=${encodeURIComponent(`Create bid follow-up workflow for ${project.title}`)}`} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
                  Automate Pursuit
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}