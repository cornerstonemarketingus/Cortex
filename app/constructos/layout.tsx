import Link from 'next/link';

export default function ConstructOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#051637] via-[#0d2e5f] to-[#08162f] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-emerald-300/20 bg-[#051225]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">TradesOS</p>
              <p className="text-xs text-slate-300">Contractor Growth Engine</p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs">
              <Link href="/tradesos" className="rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-100 hover:bg-emerald-500/25">
                Overview
              </Link>
              <Link href="/construction-solutions" className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Workspace
              </Link>
              <Link href="/estimate" className="rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-100 hover:bg-cyan-500/20">
                Cost Calculator
              </Link>
              <Link href="/resources/blog" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Guides
              </Link>
            </nav>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
            <span className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1">Engine</span>
            <span>to</span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1">Builder</span>
            <span>to</span>
            <span className="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1">Automations</span>
            <span>to</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1">Integrations</span>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
