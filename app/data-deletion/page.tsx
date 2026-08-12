"use client";

import { useState } from 'react';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function DataDeletionPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Close account and remove business data.');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reason,
          confirmText,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as { ticketId?: string; status?: string; error?: string };
      if (!response.ok) {
        throw new Error(parsed.error || `Request failed (${response.status})`);
      }

      setMessage(`Deletion request submitted. Ticket: ${parsed.ticketId || 'pending'}. Status: ${parsed.status || 'queued'}.`);
      setConfirmText('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit deletion request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        align="left"
        kicker="Compliance"
        title="Data deletion request"
        subtitle="Submit account and data deletion requests here for Builder Copilot web and mobile experiences."
      />

      <div className="mx-auto max-w-4xl px-6 pb-16">
        <Card>
          <label className="block text-sm text-slate-300">
            Account email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              placeholder="you@company.com"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />
          </label>

          <label className="mt-4 block text-sm text-slate-300">
            Type DELETE to confirm
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              placeholder="DELETE"
            />
          </label>

          <Button type="button" onClick={() => void submitRequest()} disabled={loading} className="mt-5 disabled:opacity-60">
            {loading ? 'Submitting...' : 'Submit Deletion Request'}
          </Button>

          {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </Card>
      </div>
    </PageShell>
  );
}
