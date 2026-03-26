"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type HostedProject = {
  id: string;
  name: string;
  slug: string;
  projectType: 'website' | 'app';
  status: 'draft' | 'deployed';
};

type ConnectionRecord = {
  connectionId: string;
  domain: string;
  status: 'connected' | 'pending-verification' | 'provider-auth-required';
  verificationToken: string;
  dnsRecords: Array<{
    type: 'A' | 'CNAME' | 'TXT';
    host: string;
    value: string;
    ttl: number;
  }>;
  nextSteps: string[];
  updatedAt: string;
};

type ProjectsResponse = {
  projects?: HostedProject[];
};

type DomainsGetResponse = {
  connections?: ConnectionRecord[];
};

type DomainsPostResponse = {
  action?: 'order' | 'connect' | 'verify';
  connection?: ConnectionRecord;
  verification?: {
    verified: boolean;
    message: string;
    connection: ConnectionRecord;
  };
  error?: string;
};

function domainTone(status: ConnectionRecord['status']) {
  if (status === 'connected') return 'border-emerald-300/40 bg-emerald-500/10 text-emerald-100';
  if (status === 'pending-verification') return 'border-amber-300/40 bg-amber-500/10 text-amber-100';
  return 'border-rose-300/40 bg-rose-500/10 text-rose-100';
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<HostedProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [domain, setDomain] = useState('teambuildercopilot.com');
  const [provider, setProvider] = useState<'manual-dns' | 'godaddy' | 'namecheap'>('manual-dns');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionRecord | null>(null);
  const [history, setHistory] = useState<ConnectionRecord[]>([]);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('Close account and remove platform data.');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/hosting/projects', { cache: 'no-store' });
        const parsed = (await response.json().catch(() => ({}))) as ProjectsResponse;
        const nextProjects = parsed.projects || [];
        setProjects(nextProjects);
        if (nextProjects.length > 0) {
          setProjectId(nextProjects[0].id);
        }
      } catch {
        setProjects([]);
      }
    };

    void loadProjects();
  }, []);

  useEffect(() => {
    const loadConnections = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/hosting/domains?projectId=${encodeURIComponent(projectId)}`, {
          cache: 'no-store',
        });
        const parsed = (await response.json().catch(() => ({}))) as DomainsGetResponse;
        const entries = parsed.connections || [];
        setHistory(entries);
        const recent = entries[0] || null;
        setConnection(recent);
      } catch {
        setHistory([]);
        setConnection(null);
      }
    };

    void loadConnections();
  }, [projectId]);

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === projectId) || null,
    [projects, projectId]
  );

  const postDomainAction = async (action: 'order' | 'connect' | 'verify') => {
    if (!projectId || !domain.trim()) return null;
    const response = await fetch('/api/hosting/domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        domain,
        provider,
        projectId,
      }),
    });

    const parsed = (await response.json().catch(() => ({}))) as DomainsPostResponse;
    if (!response.ok) {
      throw new Error(parsed.error || `${action} failed (${response.status})`);
    }

    return parsed;
  };

  const runOneClickConnect = async () => {
    if (busy || !projectId || !domain.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await postDomainAction('order');
      const connect = await postDomainAction('connect');
      const verify = await postDomainAction('verify');
      const resolved = verify?.verification?.connection || connect?.connection || null;
      setConnection(resolved);
      setMessage(verify?.verification?.message || 'Domain order, connect, and verify executed.');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Domain workflow failed');
    } finally {
      setBusy(false);
    }
  };

  const runVerifyOnly = async () => {
    if (busy || !projectId || !domain.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const verify = await postDomainAction('verify');
      const resolved = verify?.verification?.connection || null;
      setConnection(resolved);
      setMessage(verify?.verification?.message || 'Verification complete.');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const submitDeletion = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    setDeleteMessage(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: deleteEmail,
          reason: deleteReason,
          confirmText: deleteConfirmText,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as { ticketId?: string; status?: string; error?: string };
      if (!response.ok) {
        throw new Error(parsed.error || `Deletion request failed (${response.status})`);
      }

      setDeleteMessage(`Request submitted. Ticket ${parsed.ticketId || 'pending'} is ${parsed.status || 'queued'}.`);
      setDeleteConfirmText('');
    } catch (runError) {
      setDeleteError(runError instanceof Error ? runError.message : 'Unable to submit deletion request.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">System Settings</h1>
          <p className="mt-3 text-sm text-slate-300">Configure billing, automation behavior, and access controls.</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/admin/portal" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Admin Portal</Link>
          <Link href="/subscription" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Subscription Usage</Link>
          <Link href="/resources" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Docs & Guides</Link>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Domain Control</p>
          <h2 className="mt-2 text-xl font-semibold">One-Click Domain Connect + Verify</h2>
          <p className="mt-2 text-sm text-cyan-100/90">
            Run domain order, project connect, and DNS verification from Settings.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <label className="text-xs text-cyan-100 md:col-span-2">
              Hosted Project
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                {projects.length === 0 ? <option value="">No hosted website projects</option> : null}
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.status})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-cyan-100">
              Domain
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value.toLowerCase())}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                placeholder="example.com"
              />
            </label>

            <label className="text-xs text-cyan-100">
              Provider
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as typeof provider)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              >
                <option value="manual-dns">manual-dns</option>
                <option value="godaddy">godaddy</option>
                <option value="namecheap">namecheap</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runOneClickConnect()}
              disabled={busy || !projectId || !domain.trim()}
              className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {busy ? 'Working...' : 'Connect Domain'}
            </button>
            <button
              type="button"
              onClick={() => void runVerifyOnly()}
              disabled={busy || !projectId || !domain.trim()}
              className="rounded-lg border border-cyan-200/40 bg-black/20 px-4 py-2 text-sm text-cyan-100 hover:bg-black/35 disabled:opacity-60"
            >
              Verify DNS Only
            </button>
          </div>

          {selectedProject ? (
            <p className="mt-3 text-xs text-cyan-100/90">
              Selected project: {selectedProject.name} ({selectedProject.slug})
            </p>
          ) : null}

          {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

          {connection ? (
            <article className={`mt-4 rounded-xl border p-4 ${domainTone(connection.status)}`}>
              <p className="text-xs uppercase tracking-[0.14em]">Connection Status</p>
              <p className="mt-1 text-lg font-semibold">{connection.domain} - {connection.status}</p>
              <p className="mt-1 text-xs">Verification token: {connection.verificationToken}</p>

              <div className="mt-3 rounded-lg border border-white/20 bg-black/25 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-300">DNS Records</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {connection.dnsRecords.map((record) => (
                    <li key={`${record.type}-${record.host}-${record.value}`}>
                      {record.type} {record.host} {'->'} {record.value} (ttl {record.ttl})
                    </li>
                  ))}
                </ul>
              </div>

              {connection.nextSteps.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {connection.nextSteps.map((step) => (
                    <li key={step}>- {step}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ) : null}

          {history.length > 1 ? (
            <div className="mt-4 rounded-xl border border-white/20 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Recent Domain Connections</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-200">
                {history.slice(0, 5).map((entry) => (
                  <li key={entry.connectionId}>
                    {entry.domain} - {entry.status} - {new Date(entry.updatedAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-100">Account Management</p>
          <h2 className="mt-2 text-xl font-semibold">Request Account and Data Deletion</h2>
          <p className="mt-2 text-sm text-rose-100/90">Use this flow for compliance and app marketplace requirements.</p>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
            <label className="text-xs text-rose-100 md:col-span-2">
              Account Email
              <input
                value={deleteEmail}
                onChange={(event) => setDeleteEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                placeholder="you@company.com"
              />
            </label>

            <label className="text-xs text-rose-100">
              Confirm
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                placeholder="DELETE"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-rose-100">
            Reason
            <textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submitDeletion()}
              disabled={deleteBusy}
              className="rounded-lg bg-rose-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-200 disabled:opacity-60"
            >
              {deleteBusy ? 'Submitting...' : 'Submit Deletion Request'}
            </button>
            <Link href="/data-deletion" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              Open Public Deletion Page
            </Link>
          </div>

          {deleteMessage ? <p className="mt-3 text-sm text-emerald-200">{deleteMessage}</p> : null}
          {deleteError ? <p className="mt-3 text-sm text-rose-200">{deleteError}</p> : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Legal + Support</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/terms" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Terms of Service</Link>
            <Link href="/privacy" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Privacy Policy</Link>
            <Link href="/data-deletion" className="rounded-lg border border-white/20 bg-black/20 px-3 py-2 hover:bg-black/30">Data Deletion</Link>
          </div>
          <p className="mt-3 text-sm text-slate-300">Support: support@teambuildercopilot.com</p>
          <p className="text-sm text-slate-300">Legal: legal@teambuildercopilot.com</p>
        </section>
      </div>
    </main>
  );
}
