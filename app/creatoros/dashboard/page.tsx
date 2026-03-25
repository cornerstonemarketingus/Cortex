import Link from 'next/link';

const stats = [
  { label: 'Projects', value: '26', detail: 'active creator builds' },
  { label: 'Deployments', value: '14', detail: 'live hosting targets' },
  { label: 'Domains', value: '11', detail: 'connected or pending' },
  { label: 'Templates', value: '38', detail: 'available starters' },
];

export default function CreatorDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-fuchsia-300/30 bg-fuchsia-500/10 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Cortex Builder Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Build Cleaner</h1>
        <p className="mt-3 max-w-3xl text-sm text-fuchsia-50/90">
          Builder-first control plane for projects, templates, deployment, and domain lifecycle.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-white/15 bg-black/25 p-4">
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-fuchsia-100">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-300">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/website-builder" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">Website Builder</p>
          <p className="mt-2 text-xs text-slate-300">Full design control and launch workflows.</p>
        </Link>
        <Link href="/app-builder" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">App Builder</p>
          <p className="mt-2 text-xs text-slate-300">Template-driven app architecture with hosting handoff.</p>
        </Link>
        <Link href="/api/hosting/projects" className="rounded-2xl border border-white/15 bg-black/25 p-5 hover:bg-black/35">
          <p className="text-sm font-semibold text-fuchsia-100">Hosting Projects API</p>
          <p className="mt-2 text-xs text-slate-300">Inspect project/deployment records from private hosting layer.</p>
        </Link>
      </section>
    </div>
  );
}
