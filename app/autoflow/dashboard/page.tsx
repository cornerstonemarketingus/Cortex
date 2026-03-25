import Link from 'next/link';

const metrics = [
  { label: 'Active Pipelines', value: '9', note: 'multi-stage' },
  { label: 'Workflows Running', value: '37', note: 'live automations' },
  { label: 'Messages Sent', value: '1,284', note: '7-day total' },
  { label: 'AI Replies', value: '312', note: 'assisted follow-up' },
];

export default function AutoFlowDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Builder Copilot Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Automate Cleaner</h1>
        <p className="mt-3 max-w-3xl text-sm text-cyan-50/90">
          GHL-style CRM and workflow operations with a cleaner, hierarchy-first dashboard.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <p className="text-xs text-slate-400">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-cyan-100">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-300">{metric.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/ai-automation-solutions" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-cyan-100">Workflow Console</p>
          <p className="mt-2 text-xs text-slate-300">Build and launch lead-to-close automation chains.</p>
        </Link>
        <Link href="/chat" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-cyan-100">AI Command Inbox</p>
          <p className="mt-2 text-xs text-slate-300">Operate CRM outreach and AI-assisted replies from one stream.</p>
        </Link>
        <Link href="/marketplace" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-cyan-100">Integration Health</p>
          <p className="mt-2 text-xs text-slate-300">Track Twilio/SendGrid/maps and connector readiness.</p>
        </Link>
      </section>
    </div>
  );
}
