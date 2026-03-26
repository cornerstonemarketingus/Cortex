import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const operations = [
  {
    title: 'Software Optimization Loop',
    detail: 'Run approved self-improvement passes for product quality, conversion, and reliability.',
    href: '/devboard?tab=builders',
    cta: 'Open Optimization Console',
  },
  {
    title: 'Blog + SEO Automation',
    detail: 'Create posts, configure weekly schedules, and run publishing now from one panel.',
    href: '/blog',
    cta: 'Open Blog Engine',
  },
  {
    title: 'Direct Website/App Edits',
    detail: 'Use workspace commands to regenerate sections, adjust CRM schema, and update automations.',
    href: '/workspace',
    cta: 'Open Workspace Editor',
  },
  {
    title: 'Copilot Strategy Chat',
    detail: 'Get execution-ready growth and engineering plans that map to your product surfaces.',
    href: '/chat',
    cta: 'Open Copilot Chat',
  },
] as const;

export default function InternalCopilotPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0b2144_0%,#09162b_45%,#05080e_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Internal Copilot</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-5xl">Embedded in Builder, Automations, and Workspace hubs.</h1>
          <p className="mt-3 max-w-4xl text-sm text-cyan-50/90 md:text-base">
            Internal copilot is now integrated across page builder and automations workflows. Use this page as a jump panel, then operate inside each core hub.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link href="/website-builder" className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 font-semibold hover:bg-cyan-500/25">Open Page Builder Hub</Link>
            <Link href="/automations" className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 font-semibold hover:bg-cyan-500/25">Open Automations Hub</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-semibold hover:bg-white/20">Open Workspace Hub</Link>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {operations.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/20 bg-black/25 p-5">
              <h2 className="text-lg font-semibold text-cyan-100">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              <Link href={item.href} className="mt-4 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold hover:bg-cyan-500/25">
                {item.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Recommended Weekly Sequence</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4 text-sm text-amber-50/90">
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">1. Run estimate + pipeline diagnostics.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">2. Apply one conversion-focused automation upgrade.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">3. Publish one local SEO blog article.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">4. Deploy one landing page copy improvement.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
