"use client";

import { useEffect, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type AutomationResponse = {
  ok?: boolean;
  elapsedMs?: number;
  lead?: {
    id: string;
    firstName: string;
    email?: string | null;
    phone?: string | null;
  };
  leadHandling?: {
    instantReplyMessageId?: string;
    aiChatReplyId?: string;
  };
  revenue?: {
    estimateId?: string;
    proposalId?: string;
    invoiceId?: string;
    invoiceNumber?: string;
  };
  retention?: {
    reengagementCount?: number;
  };
  status?: {
    level?: 'healthy' | 'warning' | 'blocked';
    alerts?: string[];
    generatedAt?: string;
  };
  error?: string;
};

type StatusResponse = {
  status?: {
    level: 'healthy' | 'warning' | 'blocked';
    generatedAt: string;
    providers: {
      twilioConfigured: boolean;
      sendgridConfigured: boolean;
      openAiConfigured: boolean;
    };
    queues: {
      workflow: { reachable: boolean; waiting: number; active: number; failed: number };
      reminder: { reachable: boolean; waiting: number; active: number; failed: number };
    };
    metrics: {
      outboundLastHour: number;
      failedDeliveryLastHour: number;
      workflowFailuresLastHour: number;
      reminderBacklog: number;
      avgReplyLatencyMsLastHour: number;
    };
    alerts: string[];
  };
  error?: string;
};

type TemplateMap = {
  instantLeadReply: string;
  missedCallTextBack: string;
  stageFollowup: string;
  reviewRequest: string;
  reengagement: string;
};

type TemplatesResponse = {
  templates?: TemplateMap;
  error?: string;
};

const EMPTY_TEMPLATES: TemplateMap = {
  instantLeadReply: '',
  missedCallTextBack: '',
  stageFollowup: '',
  reviewRequest: '',
  reengagement: '',
};

export default function AutomationsPage() {
  const [firstName, setFirstName] = useState('Jordan');
  const [email, setEmail] = useState('jordan@example.com');
  const [phone, setPhone] = useState('+16125565408');
  const [projectCategory, setProjectCategory] = useState('roof-replacement');
  const [zipCode, setZipCode] = useState('55123');
  const [scope, setScope] = useState('Replace 2100 sq ft roof, include tear-off, drip edge, and cleanup.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutomationResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse['status'] | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateMap>(EMPTY_TEMPLATES);
  const [templateSaveLoading, setTemplateSaveLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/construction/automation-status', { cache: 'no-store' });
      const parsed = (await response.json().catch(() => ({}))) as StatusResponse;
      if (response.ok && parsed.status) {
        setStatus(parsed.status);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/construction/automation-templates', { cache: 'no-store' });
      const parsed = (await response.json().catch(() => ({}))) as TemplatesResponse;
      if (response.ok && parsed.templates) {
        setTemplates(parsed.templates);
      }
    } catch {
      // Keep current form values when template loading fails.
    }
  };

  useEffect(() => {
    void loadStatus();
    void loadTemplates();

    const timer = setInterval(() => {
      void loadStatus();
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const saveTemplates = async () => {
    if (templateSaveLoading) return;
    setTemplateSaveLoading(true);
    setTemplateError(null);

    try {
      const response = await fetch('/api/construction/automation-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates }),
      });

      const parsed = (await response.json().catch(() => ({}))) as TemplatesResponse;
      if (!response.ok || !parsed.templates) {
        throw new Error(parsed.error || 'Unable to save templates. Admin login may be required.');
      }

      setTemplates(parsed.templates);
    } catch (saveError) {
      setTemplateError(saveError instanceof Error ? saveError.message : 'Unable to save templates.');
    } finally {
      setTemplateSaveLoading(false);
    }
  };

  const runAutomationPack = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/construction/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          email,
          phone,
          projectCategory,
          zipCode,
          scope,
          triggerMissedCall: true,
          sendReviewRequest: true,
          runReengagement: true,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as AutomationResponse;
      if (!response.ok || !parsed.ok) {
        throw new Error(parsed.error || `Automation run failed (${response.status})`);
      }

      setResult(parsed);
      await loadStatus();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run automation pack.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Automations</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Automation Control Center</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            One-click automation execution for lead handling, pipeline movement, revenue flow, unpaid reminders, review requests, and re-engagement.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs">
              <p className="text-slate-400">Automation Health</p>
              <p className="mt-1 text-base font-semibold text-white">
                {statusLoading ? 'Checking...' : status?.level?.toUpperCase() || 'UNKNOWN'}
              </p>
            </article>
            <article className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs">
              <p className="text-slate-400">Avg Reply Latency (1h)</p>
              <p className="mt-1 text-base font-semibold text-white">
                {status ? `${Math.round((status.metrics.avgReplyLatencyMsLastHour || 0) / 1000)}s` : 'n/a'}
              </p>
            </article>
            <article className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs">
              <p className="text-slate-400">Failed Deliveries (1h)</p>
              <p className="mt-1 text-base font-semibold text-white">{status?.metrics.failedDeliveryLastHour || 0}</p>
            </article>
            <article className="rounded-xl border border-white/20 bg-black/30 p-3 text-xs">
              <p className="text-slate-400">Reminder Backlog</p>
              <p className="mt-1 text-base font-semibold text-white">{status?.metrics.reminderBacklog || 0}</p>
            </article>
          </div>

          {status?.alerts?.length ? (
            <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-500/15 p-3 text-xs text-amber-100">
              <p className="font-semibold">System Alerts</p>
              {status.alerts.map((alert) => (
                <p key={alert} className="mt-1">- {alert}</p>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              Lead first name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              Phone
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-300">
              ZIP code
              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-300">
            Project category
            <input
              value={projectCategory}
              onChange={(event) => setProjectCategory(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-3 block text-xs text-slate-300">
            Scope
            <textarea
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => void runAutomationPack()}
            disabled={loading}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60"
          >
            {loading ? 'Running...' : 'Run Full Automation Pack'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Template Manager</h2>
          <p className="mt-1 text-xs text-slate-300">
            Edit automation copy without code changes. Saving requires admin login.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <label className="text-xs text-slate-300">
              Instant lead reply
              <textarea
                value={templates.instantLeadReply}
                onChange={(event) => setTemplates((prev) => ({ ...prev, instantLeadReply: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300">
              Missed-call text-back
              <textarea
                value={templates.missedCallTextBack}
                onChange={(event) => setTemplates((prev) => ({ ...prev, missedCallTextBack: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300">
              Stage follow-up
              <textarea
                value={templates.stageFollowup}
                onChange={(event) => setTemplates((prev) => ({ ...prev, stageFollowup: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300">
              Review request
              <textarea
                value={templates.reviewRequest}
                onChange={(event) => setTemplates((prev) => ({ ...prev, reviewRequest: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-300">
              Re-engagement
              <textarea
                value={templates.reengagement}
                onChange={(event) => setTemplates((prev) => ({ ...prev, reengagement: event.target.value }))}
                className="mt-1 min-h-20 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void saveTemplates()}
            disabled={templateSaveLoading}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:opacity-60"
          >
            {templateSaveLoading ? 'Saving...' : 'Save Templates'}
          </button>

          {templateError ? <p className="mt-3 text-sm text-red-300">{templateError}</p> : null}
        </section>

        {result?.ok ? (
          <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Lead Handling</p>
              <p className="mt-2">Instant reply message ID: {result.leadHandling?.instantReplyMessageId}</p>
              <p className="mt-1">AI chat response ID: {result.leadHandling?.aiChatReplyId}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Revenue Automation</p>
              <p className="mt-2">Estimate ID: {result.revenue?.estimateId}</p>
              <p className="mt-1">Proposal ID: {result.revenue?.proposalId}</p>
              <p className="mt-1">Invoice: {result.revenue?.invoiceNumber}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm md:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Retention</p>
              <p className="mt-2">Re-engagement messages sent: {result.retention?.reengagementCount || 0}</p>
              <p className="mt-1 text-slate-300">Automation execution time: {result.elapsedMs || 0} ms</p>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
