"use client";

import { useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

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
    <main className="min-h-screen bg-gradient-to-b from-[#081436] via-[#0b2458] to-[#081736] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-rose-300/35 bg-rose-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Compliance</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Data Deletion Request</h1>
          <p className="mt-3 text-sm text-rose-50/90">Submit account and data deletion requests here for Builder Copilot web and mobile experiences.</p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5">
          <label className="block text-sm text-slate-200">
            Account email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2"
              placeholder="you@company.com"
            />
          </label>

          <label className="mt-3 block text-sm text-slate-200">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2"
            />
          </label>

          <label className="mt-3 block text-sm text-slate-200">
            Type DELETE to confirm
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2"
              placeholder="DELETE"
            />
          </label>

          <button
            type="button"
            onClick={() => void submitRequest()}
            disabled={loading}
            className="mt-4 rounded-lg bg-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-200 disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Deletion Request'}
          </button>

          {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
