import Link from 'next/link';

const kpis = [
  { label: 'Open Leads', value: '42', trend: '+12% this week' },
  { label: 'Estimates Sent', value: '18', trend: '+6 this week' },
  { label: 'Jobs Scheduled', value: '11', trend: '+3 this week' },
  { label: 'Review Requests', value: '27', trend: '92% sent within 24h' },
];

export default function TradesDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-emerald-300/30 bg-emerald-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Bid Build Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Run Jobs Cleaner</h1>
        <p className="mt-3 max-w-3xl text-sm text-emerald-50/90">
          A clean operating dashboard focused on estimates, pipeline movement, scheduling, and job outcomes.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <p className="text-xs text-slate-400">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-300">{kpi.trend}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/construction-solutions" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-emerald-100">Estimate Pipeline</p>
          <p className="mt-2 text-xs text-slate-300">Takeoff, bid, CRM handoff, and follow-up in one job flow.</p>
        </Link>
        <Link href="/estimate" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-emerald-100">Public Cost Calculator</p>
          <p className="mt-2 text-xs text-slate-300">Lead magnet entrypoint for homeowners and inbound quote requests.</p>
        </Link>
        <Link href="/resources/blog" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-emerald-100">Lead Guides</p>
          <p className="mt-2 text-xs text-slate-300">SEO and demand content that funnels directly into estimates.</p>
        </Link>
      </section>
    </div>
  );
}
