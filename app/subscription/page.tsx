"use client";

import { useState } from 'react';
import Link from 'next/link';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
  const [tokenCheckoutLoading, setTokenCheckoutLoading] = useState(false);

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

  const launchTokenCheckout = async (packId: 'boost-500' | 'pro-1500' | 'scale-5000') => {
    if (tokenCheckoutLoading) return;
    setTokenCheckoutLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error('Enter email before purchasing tokens.');
      }

      const response = await fetch('/api/subscription/token-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          packId,
          successUrl: `${window.location.origin}/subscription?tokenSuccess=1&email=${encodeURIComponent(normalizedEmail)}`,
          cancelUrl: `${window.location.origin}/subscription?tokenCanceled=1`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as {
        error?: string;
        checkout?: { checkoutUrl?: string };
      };

      if (!response.ok || !parsed.checkout?.checkoutUrl) {
        throw new Error(parsed.error || 'Unable to start token checkout.');
      }

      window.location.assign(parsed.checkout.checkoutUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start token checkout.');
    } finally {
      setTokenCheckoutLoading(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        align="left"
        kicker="Billing"
        title="Token + subscription usage dashboard"
        subtitle="Check active status and remaining tokens before launching estimate runs, copilot commands, and automations."
      />

      <div className="mx-auto max-w-4xl px-6 pb-16 space-y-5">
        <Card>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourcompany.com"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
            <Button type="button" onClick={() => void loadUsage()} disabled={loading} className="disabled:opacity-60 whitespace-nowrap">
              {loading ? 'Loading...' : 'Check Usage'}
            </Button>
          </div>

          <div className="mt-3 max-w-sm">
            <label className="text-xs text-slate-400 block">
              Tenant ID
              <input
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value || 'cortex-default')}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

          {usage ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p>Status: {usage.active ? 'Active' : 'Inactive'}</p>
              <p className="mt-1">Tier: {usage.tier || 'none'}</p>
              <p className="mt-1">
                Tokens: {usage.remainingCredits} remaining / {usage.includedCredits} included ({usage.usedCredits} used)
              </p>
              <p className="mt-1">Billing period start: {usage.periodStartIso || 'n/a'}</p>
              <p className="mt-1">Billing period end: {usage.periodEndIso || 'n/a'}</p>

              {!usage.active ? (
                <p className="mt-3 text-[#f0dcb8]">
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
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p>Tenant: {entitlements.tenantId}</p>
              <p className="mt-1">Teammates limit: {entitlements.teammatesLimit}</p>
              <p className="mt-2 text-[#C69C6D] font-semibold">Premium features</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-400">
                <li>- Builder Premium: {entitlements.featureFlags['builder-premium'] ? 'enabled' : 'locked'}</li>
                <li>- Blueprint AI v1: {entitlements.featureFlags['blueprint-ai-v1'] ? 'enabled' : 'locked'}</li>
                <li>- Local Data Intelligence: {entitlements.featureFlags['local-data-intelligence'] ? 'enabled' : 'locked'}</li>
                <li>- Payments + Entitlements: {entitlements.featureFlags['payments-entitlements'] ? 'enabled' : 'locked'}</li>
              </ul>
            </div>
          ) : null}
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Token Top-Up</p>
          <p className="mt-1 text-xs text-slate-400">Purchase additional tokens for estimator, automations, and copilot execution.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => void launchTokenCheckout('boost-500')} disabled={tokenCheckoutLoading} className="disabled:opacity-60">
              Buy 500
            </Button>
            <Button type="button" variant="secondary" onClick={() => void launchTokenCheckout('pro-1500')} disabled={tokenCheckoutLoading} className="disabled:opacity-60">
              Buy 1500
            </Button>
            <Button type="button" variant="secondary" onClick={() => void launchTokenCheckout('scale-5000')} disabled={tokenCheckoutLoading} className="disabled:opacity-60">
              Buy 5000
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
