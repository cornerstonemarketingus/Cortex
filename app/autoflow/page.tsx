import Link from 'next/link';

const lanes = [
  {
    title: 'CRM Pipeline',
    description: 'Lead stage board, reminders, and deal follow-up in one clean control panel.',
    tone: 'border-amber-300/35 bg-amber-500/10',
  },
  {
    title: 'AI Automations',
    description: 'Trigger sequences for calls, texts, and emails without exposing advanced complexity.',
    tone: 'border-cyan-300/35 bg-cyan-500/10',
  },
  {
    title: 'Conversion Ops',
    description: 'Simple appointment and offer workflows built for teams running high volume outreach.',
    tone: 'border-indigo-300/35 bg-indigo-500/10',
  },
];

export default function AutoFlowPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <header className="glass rise-in rounded-3xl p-7">
        <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Product Destination</p>
        <h1 className="mt-2 text-4xl font-semibold md:text-5xl">AIBoost</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
          AIBoost is your CRM and AI automator layer. Think gohighlevel-style operations with a cleaner, faster UI.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/ai-automation-solutions"
            className="rounded-xl border border-amber-300/50 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-400/30"
          >
            Open Automation Workspace
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
          >
            Create Account
          </Link>
        </div>
      </header>

      <section className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {lanes.map((lane) => (
          <article key={lane.title} className={`rounded-2xl border p-5 ${lane.tone}`}>
            <h2 className="text-lg font-semibold text-slate-100">{lane.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{lane.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-7 rounded-2xl border border-white/15 bg-black/25 p-5">
        <h2 className="text-xl font-semibold text-amber-100">Less Surface Area, Better Sales Story</h2>
        <p className="mt-2 text-sm text-slate-300">
          This page intentionally stays lightweight: CRM view, automations view, and conversion view only.
          Advanced system controls stay behind the workspace experience.
        </p>
      </section>
    </div>
  );
}
