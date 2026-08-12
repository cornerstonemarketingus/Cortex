"use client";

import { useState } from 'react';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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
    <PageShell>
      <PageHero
        align="left"
        kicker="Launch"
        title="Get your estimate and automation setup"
        subtitle="One page. One form. Captures lead, starts CRM flow, and primes automation response."
      />

      <div className="mx-auto max-w-4xl px-6 pb-16">
        <Card>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none md:col-span-2"
            />
          </div>
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
          />
          <Button type="button" onClick={() => void submit()} disabled={loading} className="mt-4 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Start Flow'}
          </Button>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          {success ? <p className="mt-3 text-sm text-emerald-300">{success}</p> : null}
        </Card>
      </div>
    </PageShell>
  );
}
