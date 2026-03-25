"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const tiers = [
  { value: 'unified', label: 'Unified Plan ($297/mo)' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'pro', label: 'Pro' },
] as const;

function sanitizeNextPath(value: string | null) {
  if (!value) return '/pricing';
  if (!value.startsWith('/')) return '/pricing';
  if (value.startsWith('//')) return '/pricing';
  return value;
}

type StatusResponse = {
  active: boolean;
  email: string;
  tier: string | null;
  includedCredits: number;
  usedCredits: number;
  remainingCredits: number;
  periodStartIso: string | null;
  periodEndIso: string | null;
  error?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/pricing');
  const [trialPass, setTrialPass] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<(typeof tiers)[number]['value']>('unified');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = sanitizeNextPath(params.get('next'));
    const success = params.get('success') === '1';
    const fromUrlEmail = params.get('email') || '';
    const pass = params.get('pass') || '';
    const website = params.get('website') || '';
    const phone = params.get('phone') || '';
    const business = params.get('business') || '';

    if (fromUrlEmail) {
      setEmail(fromUrlEmail);
    }

    if (pass) {
      setTrialPass(pass);
    }

    if (website) {
      setWebsiteUrl(website);
    }

    if (phone) {
      setBusinessPhone(phone);
    }

    if (business) {
      setBusinessName(business);
    }

    setCheckoutSuccess(success);
    setNextPath(next);
  }, []);

  useEffect(() => {
    if (!email || !checkoutSuccess) return;

    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`, {
          cache: 'no-store',
        });
        const parsed = (await response.json().catch(() => ({}))) as StatusResponse;
        if (active && response.ok) {
          setStatus(parsed);
        }
      } catch {
        // Ignore status refresh failures in the signup UI.
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [checkoutSuccess, email]);

  const submit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (businessName.trim() || websiteUrl.trim() || businessPhone.trim()) {
        await fetch('/api/builder-copilot/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName,
            websiteUrl,
            phoneNumber: businessPhone,
            email,
            context: 'signup',
          }),
        }).catch(() => null);
      }

      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          tier,
          successUrl: `${window.location.origin}/signup?success=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}`,
          cancelUrl: `${window.location.origin}/signup?canceled=1&next=${encodeURIComponent(nextPath)}`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as {
        error?: string;
        checkout?: { checkoutUrl?: string };
      };

      if (!response.ok || !parsed.checkout?.checkoutUrl) {
        throw new Error(parsed.error || 'Unable to activate subscription.');
      }

      window.location.assign(parsed.checkout.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to activate subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#06183e] via-[#0c2f72] to-[#071b43] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <section className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Subscription Signup</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Activate AI Estimate Reader Access</h1>
          <p className="mt-3 text-sm text-cyan-50/90">
            Subscription is required before launching AI blueprint/takeoff estimate-reader results.
          </p>

          <div className="mt-5 space-y-3">
            <label className="block text-xs text-cyan-100">
              Business email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourcompany.com"
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-xs text-cyan-100">
              Plan
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as (typeof tiers)[number]['value'])}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                {tiers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-cyan-100">
              Trial pass (if provided)
              <input
                value={trialPass}
                onChange={(event) => setTrialPass(event.target.value)}
                placeholder="CORTEX-TRIAL-14D"
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </label>

            <div className="rounded-lg border border-white/15 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Business Booster Setup</p>
              <p className="mt-1 text-xs text-slate-300">Optional: add these now so Builder Copilot can prepare voice AI receptionist and website chatbot setup.</p>

              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <input
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Business name"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
                <input
                  value={businessPhone}
                  onChange={(event) => setBusinessPhone(event.target.value)}
                  placeholder="Phone for voice AI"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="Website for chatbot"
                  className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? 'Redirecting...' : 'Continue To Secure Checkout'}
            </button>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            {checkoutSuccess && status?.active ? (
              <div className="rounded-lg border border-emerald-300/30 bg-emerald-500/15 p-3 text-xs text-emerald-100">
                Subscription active ({status.tier || 'unified'}). Credits remaining this period: {status.remainingCredits} / {status.includedCredits}.
                <div className="mt-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
                    onClick={() => {
                      router.push(nextPath);
                      router.refresh();
                    }}
                  >
                    Continue To App
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
