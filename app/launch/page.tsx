"use client";

import { useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type LeadResponse = {
  lead?: {
    id: string;
    firstName: string;
    stage: string;
  };
  error?: string;
};

export default function LaunchPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [scope, setScope] = useState('I need a roofing estimate and timeline this month.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/crm/capture/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          phone,
          sourceType: 'FORM',
          sourceName: 'launch-page',
          firstMessage: scope,
          firstMessageChannel: phone ? 'SMS' : 'CHAT',
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as LeadResponse;
      if (!response.ok || !parsed.lead) {
        throw new Error(parsed.error || `Unable to submit (${response.status})`);
      }

      setSuccess(`Lead captured: ${parsed.lead.id}`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to submit now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Launch</p>
          <h1 className="mt-2 text-4xl font-semibold">Get Your Estimate and Automation Setup</h1>
          <p className="mt-3 text-sm text-slate-300">
            One page. One form. Captures lead, starts CRM flow, and primes automation response.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm md:col-span-2" />
          </div>
          <textarea value={scope} onChange={(e) => setScope(e.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm" />
          <button onClick={() => void submit()} disabled={loading} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Start Flow'}
          </button>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}
        </section>
      </div>
    </main>
  );
}
