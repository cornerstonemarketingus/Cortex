"use client";

import { useState } from 'react';
import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type UsageResponse = {
  usage?: {
    active: boolean;
    email: string;
    tier: string | null;
    includedCredits: number;
    usedCredits: number;
    remainingCredits: number;
    periodStartIso: string | null;
    periodEndIso: string | null;
  };
  entitlements?: {
    tenantId: string;
    teammatesLimit: number;
    featureFlags: {
      ['builder-premium']?: boolean;
      ['blueprint-ai-v1']?: boolean;
      ['local-data-intelligence']?: boolean;
      ['payments-entitlements']?: boolean;
    };
  };
  error?: string;
};

export default function SubscriptionDashboardPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageResponse['usage'] | null>(null);
  const [entitlements, setEntitlements] = useState<UsageResponse['entitlements'] | null>(null);
  const [tenantId, setTenantId] = useState('cortex-default');

  const loadUsage = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/subscription/usage?email=${encodeURIComponent(email.trim())}&tenantId=${encodeURIComponent(tenantId)}`,
        {
        cache: 'no-store',
        }
      );
      const parsed = (await response.json().catch(() => ({}))) as UsageResponse;
      if (!response.ok || !parsed.usage) {
        throw new Error(parsed.error || 'Unable to load usage right now.');
      }
      setUsage(parsed.usage);
      setEntitlements(parsed.entitlements || null);
    } catch (loadError) {
      setUsage(null);
      setEntitlements(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load usage right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <section className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Subscription Usage Dashboard</h1>
          <p className="mt-3 text-sm text-cyan-100/90">
            Check active status and remaining estimate-reader credits before launching blueprint/takeoff runs.
          </p>

          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void loadUsage()}
              disabled={loading}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Check Usage'}
            </button>
          </div>

          <div className="mt-2 max-w-sm">
            <label className="text-xs text-cyan-100/90 block">
              Tenant ID
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value || 'cortex-default')}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {usage ? (
            <div className="mt-4 rounded-2xl border border-white/20 bg-black/30 p-4 text-sm">
              <p>Status: {usage.active ? 'Active' : 'Inactive'}</p>
              <p className="mt-1">Tier: {usage.tier || 'none'}</p>
              <p className="mt-1">
                Credits: {usage.remainingCredits} remaining / {usage.includedCredits} included ({usage.usedCredits} used)
              </p>
              <p className="mt-1">Billing period start: {usage.periodStartIso || 'n/a'}</p>
              <p className="mt-1">Billing period end: {usage.periodEndIso || 'n/a'}</p>

              {!usage.active ? (
                <p className="mt-3 text-amber-200">
                  No active paid subscription. Continue at{' '}
                  <Link href={`/signup?next=/subscription&email=${encodeURIComponent(email.trim())}`} className="underline">
                    /signup
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          {entitlements ? (
            <div className="mt-4 rounded-2xl border border-white/20 bg-black/30 p-4 text-sm">
              <p>Tenant: {entitlements.tenantId}</p>
              <p className="mt-1">Teammates limit: {entitlements.teammatesLimit}</p>
              <p className="mt-2 text-cyan-100">Premium features</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-200">
                <li>- Builder Premium: {entitlements.featureFlags['builder-premium'] ? 'enabled' : 'locked'}</li>
                <li>- Blueprint AI v1: {entitlements.featureFlags['blueprint-ai-v1'] ? 'enabled' : 'locked'}</li>
                <li>- Local Data Intelligence: {entitlements.featureFlags['local-data-intelligence'] ? 'enabled' : 'locked'}</li>
                <li>- Payments + Entitlements: {entitlements.featureFlags['payments-entitlements'] ? 'enabled' : 'locked'}</li>
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
