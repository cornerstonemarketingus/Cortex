import Link from 'next/link';

const featureRows = [
  {
    title: 'Estimating (Primary Hook)',
    detail: 'Upload plans or type project scope to get ballpark and detailed material/labor estimates quickly.',
    href: '/construction-solutions',
    cta: 'Open Estimating Workspace',
  },
  {
    title: 'Leads + Pipeline',
    detail: 'Capture inquiries, score opportunities, and move jobs through estimate to close with AI-assisted follow-up.',
    href: '/construction-solutions',
    cta: 'Open Lead Pipeline',
  },
  {
    title: 'Jobs + Scheduling',
    detail: 'Run job workflows, signature status, reminders, and dispatch-ready operations from one control surface.',
    href: '/construction-solutions',
    cta: 'Open Job Workflow',
  },
  {
    title: 'Review and Reputation Loop',
    detail: 'Trigger post-job review requests and retention nudges without exposing automation complexity to field teams.',
    href: '/ai-automation-solutions',
    cta: 'Open Automation Layer',
  },
  {
    title: 'Lead Landing Pages (Focused)',
    detail: 'Use streamlined quote and book-estimate pages only; full design freedom stays inside Cortex Builder.',
    href: '/website-builder',
    cta: 'Open Lead Page Builder',
  },
];

export default function TradesOsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-emerald-300/30 bg-emerald-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Product 1 / Vertical SaaS</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Bid Build</h1>
        <p className="mt-3 max-w-3xl text-sm text-emerald-50/90">
          Run your trades business, estimate jobs, and get more work. Complexity stays behind the scenes.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {featureRows.map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-xl font-semibold text-emerald-100">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{feature.detail}</p>
            <Link
              href={feature.href}
              className="mt-4 inline-flex rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-xs font-semibold hover:bg-emerald-500/30"
            >
              {feature.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
        <h2 className="text-xl font-semibold text-cyan-100">Primary Verb: Run Jobs</h2>
        <p className="mt-2 text-sm text-cyan-50/90">
          If a feature does not help contractors run jobs and win work, it stays out of Bid Build UI.
        </p>
      </section>
    </div>
  );
}
