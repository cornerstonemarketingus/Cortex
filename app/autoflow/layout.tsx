import Link from 'next/link';

export default function AutoFlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1a140f] via-[#1f2527] to-[#11161e] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/20 bg-[#171c1f]/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200">AIBoost</p>
              <p className="text-xs text-slate-300">CRM and AI Automator</p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs">
              <Link href="/autoflow" className="rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-500/25">
                Overview
              </Link>
              <Link href="/autoflow/dashboard" className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-500/20">
                Dashboard
              </Link>
              <Link href="/ai-automation-solutions" className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Workspace
              </Link>
              <Link href="/resources/blog" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Learn
              </Link>
              <Link href="/marketplace" className="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1.5 font-semibold text-indigo-100 hover:bg-indigo-500/20">
                Integrations
              </Link>
            </nav>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
            <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1">Engine</span>
            <span>to</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1">CRM</span>
            <span>to</span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1">Automations</span>
            <span>to</span>
            <span className="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1">Conversion</span>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
