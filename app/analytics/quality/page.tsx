"use client";

import { useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type GateResult = {
  score: number;
  passed: boolean;
  threshold: number;
  categoryScores: {
    performance: number;
    accessibility: number;
    seo: number;
    conversion: number;
    designSystem: number;
  };
  blockers: string[];
  recommendations: string[];
};

type GateResponse = {
  result?: GateResult;
  error?: string;
};

type QualityStatus = {
  label: string;
  status: 'green' | 'yellow' | 'red';
  detail: string;
};

function tone(status: QualityStatus['status']) {
  if (status === 'green') return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100';
  if (status === 'yellow') return 'border-amber-300/35 bg-amber-500/15 text-amber-100';
  return 'border-rose-300/35 bg-rose-500/15 text-rose-100';
}

function deriveStatuses(result: GateResult): QualityStatus[] {
  const scoreStatus: QualityStatus =
    result.score >= result.threshold + 4
      ? { label: 'Score Gate', status: 'green', detail: `Score ${result.score} clears threshold ${result.threshold}.` }
      : result.score >= result.threshold
      ? { label: 'Score Gate', status: 'yellow', detail: `Score ${result.score} meets threshold with low buffer.` }
      : { label: 'Score Gate', status: 'red', detail: `Score ${result.score} is below threshold ${result.threshold}.` };

  const blockerStatus: QualityStatus =
    result.blockers.length === 0
      ? { label: 'Blocker Gate', status: 'green', detail: 'No release blockers detected.' }
      : result.blockers.length <= 2
      ? { label: 'Blocker Gate', status: 'yellow', detail: `${result.blockers.length} blockers require mitigation.` }
      : { label: 'Blocker Gate', status: 'red', detail: `${result.blockers.length} blockers prevent release.` };

  const releaseStatus: QualityStatus =
    result.passed && result.blockers.length === 0
      ? { label: 'Production Release Gate', status: 'green', detail: 'Ready for production launch.' }
      : result.score >= result.threshold && result.blockers.length <= 1
      ? { label: 'Production Release Gate', status: 'yellow', detail: 'Near-ready; close remaining gap before launch.' }
      : { label: 'Production Release Gate', status: 'red', detail: 'Blocked for production until gates pass.' };

  return [scoreStatus, blockerStatus, releaseStatus];
}

function overallSignal(items: QualityStatus[]): QualityStatus['status'] {
  if (items.some((item) => item.status === 'red')) return 'red';
  if (items.some((item) => item.status === 'yellow')) return 'yellow';
  return 'green';
}

function signalDot(status: QualityStatus['status']) {
  if (status === 'green') return 'bg-emerald-300';
  if (status === 'yellow') return 'bg-amber-300';
  return 'bg-rose-300';
}

export default function QualityGateDashboardPage() {
  const [token, setToken] = useState('');
  const [qualityTier, setQualityTier] = useState<'foundation' | 'premium'>('premium');
  const [blueprint, setBlueprint] = useState<'website' | 'app' | 'business' | 'game'>('website');
  const [result, setResult] = useState<GateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/builder/quality-gate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blueprint,
          qualityTier,
          releaseMode: 'staging',
          metrics: {
            lcpMs: 2050,
            ttiMs: 2400,
            cls: 0.08,
            accessibilityScore: 90,
            seoScore: 88,
            conversionEventsCoverage: 86,
          },
          designChecks: ['tokenized spacing', 'typography scale', 'component states', 'motion standards'],
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as GateResponse;
      if (!response.ok || !parsed.result) {
        throw new Error(parsed.error || `Quality gate request failed (${response.status})`);
      }

      setResult(parsed.result);
    } catch (checkError) {
      setResult(null);
      setError(checkError instanceof Error ? checkError.message : 'Quality gate request failed');
    } finally {
      setLoading(false);
    }
  };

  const statuses = result ? deriveStatuses(result) : [];
  const releaseSignal = statuses.length > 0 ? overallSignal(statuses) : null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-indigo-300/30 bg-indigo-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Quality Gate</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Release Readiness Dashboard</h1>
          <p className="mt-3 text-sm text-indigo-100/90">
            Validate premium launch quality before production apply passes.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <label className="text-xs text-slate-300 md:col-span-2">
              Bearer token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              Blueprint
              <select
                value={blueprint}
                onChange={(event) => setBlueprint(event.target.value as typeof blueprint)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                <option value="website">website</option>
                <option value="app">app</option>
                <option value="business">business</option>
                <option value="game">game</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Tier
              <select
                value={qualityTier}
                onChange={(event) => setQualityTier(event.target.value as typeof qualityTier)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                <option value="foundation">foundation</option>
                <option value="premium">premium</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void runCheck()}
            disabled={loading || !token.trim()}
            className="mt-3 rounded-lg bg-indigo-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-200 disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Run Quality Gate'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {result ? (
            <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-4">
              <p className="text-sm">Overall score: <strong>{result.score}</strong> (threshold {result.threshold})</p>
              <p className="text-sm mt-1">Status: {result.passed ? 'PASS' : 'FAIL'}</p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <p>Performance: {result.categoryScores.performance}</p>
                <p>Accessibility: {result.categoryScores.accessibility}</p>
                <p>SEO: {result.categoryScores.seo}</p>
                <p>Conversion: {result.categoryScores.conversion}</p>
                <p>Design System: {result.categoryScores.designSystem}</p>
              </div>

              {result.blockers.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-rose-200">
                  {result.blockers.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              ) : null}

              {result.recommendations.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-slate-200">
                  {result.recommendations.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Release Signal</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <span className={`inline-flex h-3 w-3 rounded-full ${signalDot(releaseSignal || 'red')}`} />
                {releaseSignal === 'green'
                  ? 'Green: quality gates indicate launch readiness.'
                  : releaseSignal === 'yellow'
                  ? 'Yellow: near-ready; close final gaps before release.'
                  : 'Red: launch is blocked until gate issues are fixed.'}
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {statuses.map((item) => (
                <article key={item.label} className={`rounded-xl border p-4 ${tone(item.status)}`}>
                  <p className="text-xs uppercase tracking-[0.14em]">{item.label}</p>
                  <p className="mt-2 text-sm">{item.detail}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
