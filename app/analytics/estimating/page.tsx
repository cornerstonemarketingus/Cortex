"use client";

import { useState } from 'react';
import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type CalibrationSummary = {
  tenantId: string;
  events: number;
  mapePercent: number | null;
  guidance: string[];
};

type CalibrationResponse = {
  tenantId?: string;
  events?: number;
  mapePercent?: number | null;
  guidance?: string[];
  error?: string;
};

type GateStatus = {
  label: string;
  status: 'green' | 'yellow' | 'red';
  detail: string;
};

function statusTone(status: GateStatus['status']) {
  if (status === 'green') return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-100';
  if (status === 'yellow') return 'border-amber-300/35 bg-amber-500/15 text-amber-100';
  return 'border-rose-300/35 bg-rose-500/15 text-rose-100';
}

function deriveGateStatuses(summary: CalibrationSummary): GateStatus[] {
  const mape = summary.mapePercent;
  const events = summary.events;

  const accuracy: GateStatus =
    mape === null
      ? { label: 'Accuracy Gate', status: 'red', detail: 'No MAPE data yet.' }
      : mape <= 8
      ? { label: 'Accuracy Gate', status: 'green', detail: `MAPE ${mape}% <= 8% target.` }
      : mape <= 15
      ? { label: 'Accuracy Gate', status: 'yellow', detail: `MAPE ${mape}% is above target, below alert threshold.` }
      : { label: 'Accuracy Gate', status: 'red', detail: `MAPE ${mape}% exceeds release threshold.` };

  const volume: GateStatus =
    events >= 100
      ? { label: 'Calibration Volume Gate', status: 'green', detail: `${events} events collected.` }
      : events >= 30
      ? { label: 'Calibration Volume Gate', status: 'yellow', detail: `${events} events collected. Need 100 for full confidence.` }
      : { label: 'Calibration Volume Gate', status: 'red', detail: `${events} events collected. Insufficient for release confidence.` };

  const releaseStatus: GateStatus =
    accuracy.status === 'green' && volume.status === 'green'
      ? { label: 'Estimator Release Gate', status: 'green', detail: 'Ready for premium release.' }
      : accuracy.status === 'red' || volume.status === 'red'
      ? { label: 'Estimator Release Gate', status: 'red', detail: 'Blocked until gate failures are resolved.' }
      : { label: 'Estimator Release Gate', status: 'yellow', detail: 'Conditionally ready; improve before broad rollout.' };

  return [accuracy, volume, releaseStatus];
}

function overallSignal(items: GateStatus[]): GateStatus['status'] {
  if (items.some((item) => item.status === 'red')) return 'red';
  if (items.some((item) => item.status === 'yellow')) return 'yellow';
  return 'green';
}

function signalDot(status: GateStatus['status']) {
  if (status === 'green') return 'bg-emerald-300';
  if (status === 'yellow') return 'bg-amber-300';
  return 'bg-rose-300';
}

export default function EstimatingAnalyticsPage() {
  const [token, setToken] = useState('');
  const [tenantId, setTenantId] = useState('cortex-default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CalibrationSummary | null>(null);

  const loadCalibration = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/estimating/calibrate?tenantId=${encodeURIComponent(tenantId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
        cache: 'no-store',
      });

      const parsed = (await response.json().catch(() => ({}))) as CalibrationResponse;
      if (!response.ok) {
        throw new Error(parsed.error || `Calibration request failed (${response.status})`);
      }

      setSummary({
        tenantId: parsed.tenantId || tenantId,
        events: parsed.events || 0,
        mapePercent: parsed.mapePercent ?? null,
        guidance: parsed.guidance || [],
      });
    } catch (loadError) {
      setSummary(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load calibration summary');
    } finally {
      setLoading(false);
    }
  };

  const statuses = summary ? deriveGateStatuses(summary) : [];
  const releaseSignal = statuses.length > 0 ? overallSignal(statuses) : null;

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/25 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Estimator Analytics</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Calibration Dashboard</h1>
          <p className="mt-3 text-sm text-cyan-100/90">
            Monitor closed-job calibration volume and MAPE quality for estimator v1.3.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-slate-300">
              Bearer token
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                placeholder="CRM token"
              />
            </label>
            <label className="text-xs text-slate-300">
              Tenant ID
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value || 'cortex-default')}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void loadCalibration()}
                disabled={loading || !token.trim()}
                className="w-full rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'Load Metrics'}
              </button>
            </div>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {summary ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-white/20 bg-black/25 p-4">
                <p className="text-xs text-slate-400">Tenant</p>
                <p className="mt-1 text-lg font-semibold">{summary.tenantId}</p>
              </article>
              <article className="rounded-xl border border-white/20 bg-black/25 p-4">
                <p className="text-xs text-slate-400">Calibration Events</p>
                <p className="mt-1 text-2xl font-semibold">{summary.events}</p>
              </article>
              <article className="rounded-xl border border-white/20 bg-black/25 p-4">
                <p className="text-xs text-slate-400">MAPE</p>
                <p className="mt-1 text-2xl font-semibold">{summary.mapePercent === null ? 'n/a' : `${summary.mapePercent}%`}</p>
              </article>
            </div>
          ) : null}

          {summary ? (
            <div className="mt-4 rounded-xl border border-white/20 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Release Signal</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <span className={`inline-flex h-3 w-3 rounded-full ${signalDot(releaseSignal || 'red')}`} />
                {releaseSignal === 'green'
                  ? 'Green: estimator release confidence is healthy.'
                  : releaseSignal === 'yellow'
                  ? 'Yellow: estimator is conditionally ready, monitor guidance.'
                  : 'Red: estimator is blocked for premium release.'}
              </div>
            </div>
          ) : null}

          {summary ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {statuses.map((gate) => (
                <article key={gate.label} className={`rounded-xl border p-4 ${statusTone(gate.status)}`}>
                  <p className="text-xs uppercase tracking-[0.14em]">{gate.label}</p>
                  <p className="mt-2 text-sm">{gate.detail}</p>
                </article>
              ))}
            </div>
          ) : null}

          {summary?.guidance?.length ? (
            <ul className="mt-4 space-y-1 text-sm text-slate-200">
              {summary.guidance.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Link href="/subscription" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">
            Open Billing + Entitlements
          </Link>
          <Link href="/builder" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">
            Open Builder Premium Controls
          </Link>
        </section>
      </div>
    </main>
  );
}
