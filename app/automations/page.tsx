"use client";

import { useEffect, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import BuilderCopilotPanel from '@/components/copilot/BuilderCopilotPanel';
import QuickstartTour from '@/components/automations/QuickstartTour';

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

const LEAD_ENGINE_STEPS = [
  {
    title: '1) Capture',
    detail: 'Lead form, inbound call, or web chat enters one intake lane instantly.',
  },
  {
    title: '2) Qualify',
    detail: 'AI collects job details, urgency, and scope before handoff.',
  },
  {
    title: '3) Nurture',
    detail: 'SMS + email follow-up sequences keep high-intent leads active.',
  },
  {
    title: '4) Convert',
    detail: 'Estimate, proposal, invoice, and reminder chain drives close rate.',
  },
] as const;

const AUTOMATION_PACKAGES = [
  {
    name: 'Starter',
    bullets: ['Website lead capture', 'Basic CRM pipeline', 'Estimate builder'],
  },
  {
    name: 'Growth',
    bullets: ['Lead qualification AI', 'Follow-up automations', 'Missed call text-back'],
  },
  {
    name: 'Pro',
    bullets: ['AI estimator + approvals', 'Autopilot mode', 'Advanced automation intelligence'],
  },
] as const;

const AUTOMATION_LIBRARY = [
  'Lead Qualification AI (project type, budget, timeline, score + routing)',
  'Instant Estimate Generator (draft + contractor approval)',
  'Follow-Up Automation (new lead, no response, estimate not accepted)',
  'Missed Call Text Back',
  'Estimate Follow-Up Sequence (Day 1, Day 3, Day 7)',
  'Review Generation + AI Reply Suggestions',
  'Lead Reactivation (30-90 days)',
  'Job Creation from Lead',
  'AI Daily Logs (voice to structured log)',
  'Change Order Generator',
  'SEO Page Generator',
  'Content Engine (weekly blogs + showcases)',
  'Directory Sync System',
  'Ad Assistant (creative + budget suggestions)',
] as const;

export default function AutomationsPage() {
  const [promptParam, setPromptParam] = useState('');
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

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setPromptParam(sp.get('prompt') || '');
    }

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (promptParam && promptParam.trim()) {
      setScope(promptParam.trim().slice(0, 2000));
    }
  }, [promptParam]);

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#78350f_0%,#431407_42%,#140704_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-amber-300/35 bg-amber-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Lead-Gen Automation Engine</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Turn every inbound lead into a guided path to booked revenue.</h1>
          <p className="mt-3 max-w-3xl text-sm text-amber-100/90">
            This workspace runs capture, qualification, nurture, and conversion workflows as one connected system. Use it as your daily operating surface for growth.
          </p>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4">
            <h3 className="text-sm font-semibold text-white">Quickstart Tutorial</h3>
            <p className="mt-2 text-xs text-slate-300">Get value immediately: follow these three tiny steps to add an automation to your business.</p>
            <ol className="mt-3 list-decimal list-inside text-xs text-slate-200 space-y-2">
              <li><strong>Describe the trigger</strong> — e.g., new lead form submission or missed call.</li>
              <li><strong>Pick the outcome</strong> — send instant reply, create estimate, or schedule follow-up.</li>
              <li><strong>Activate</strong> — run the pack and monitor delivery in the health panel.</li>
            </ol>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setPromptParam('Create a lead follow-up automation: day 1 welcome, day 3 check-in, day 7 proposal reminder.');
                  setScope('Create a lead follow-up automation: day 1 welcome, day 3 check-in, day 7 proposal reminder.');
                }}
                className="rounded-lg bg-[var(--brand-600)] px-3 py-2 text-xs font-semibold text-white hover:brightness-105"
              >
                Start Quick Fill
              </button>
              <p className="mt-2 text-xs text-slate-400">This will prefill the Automation Copilot so you can see generated steps and enable them quickly.</p>
            </div>
          </div>

          <div>
            <QuickstartTour setPromptParam={setPromptParam} setScope={setScope} />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {LEAD_ENGINE_STEPS.map((step) => (
            <article key={step.title} className="rounded-2xl border border-white/20 bg-black/25 p-4">
              <p className="text-sm font-semibold text-cyan-100">{step.title}</p>
              <p className="mt-2 text-xs text-slate-300">{step.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6">
          <BuilderCopilotPanel
            title="Automation Copilot"
            subtitle="Describe the automation you want and the system will scaffold triggers and steps."
            defaultPrompt={promptParam || 'Create a lead follow-up automation: day 1 welcome, day 3 check-in, day 7 proposal reminder.'}
            contextLabel="automations"
            showProvisioning={false}
            buildMode={undefined}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300/35 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Product Packaging</p>
          <h2 className="mt-1 text-xl font-semibold">Offer outcomes, not feature clutter</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {AUTOMATION_PACKAGES.map((pack) => (
              <article key={pack.name} className="rounded-xl border border-white/20 bg-black/25 p-3 text-xs">
                <p className="text-sm font-semibold text-amber-100">{pack.name}</p>
                <div className="mt-2 space-y-1 text-slate-200">
                  {pack.bullets.map((bullet) => (
                    <p key={bullet}>- {bullet}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Autopilot Mode</p>
          <h2 className="mt-1 text-xl font-semibold">Turn on Autopilot to run lead-to-close workflow automatically</h2>
          <p className="mt-2 text-sm text-slate-200">Bundle lead capture, qualification, estimate drafting, follow-up, and nurture in one mode.</p>
          <button
            type="button"
            onClick={() => void runAutomationPack()}
            disabled={loading}
            className="mt-3 rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {loading ? 'Enabling...' : 'Turn On Autopilot'}
          </button>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 text-xs text-slate-200">
            {AUTOMATION_LIBRARY.map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-black/25 p-2">{item}</div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-5">
          <div className="mb-4 rounded-xl border border-cyan-300/35 bg-cyan-500/10 p-3 text-xs text-cyan-50">
            Recommended run order: validate system health, run full lead automation pack, then tune templates from performance outcomes.
          </div>

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
            className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {loading ? 'Running...' : 'Run Full Lead Engine'}
          </button>

          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        </section>

        <section className="mt-6">
          <BuilderCopilotPanel
            title="Automations Copilot (Embedded)"
            subtitle="Internal copilot is built into your automation hub to generate workflow actions, message improvements, and failure recovery steps in-context."
            defaultPrompt="Improve my automation handoff after estimate delivery and generate follow-up logic with fallback steps."
            contextLabel="automations-hub"
            showProvisioning={false}
          />
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
