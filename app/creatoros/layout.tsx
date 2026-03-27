import Link from 'next/link';

export default function CreatorOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#071338] via-[#112b69] to-[#08173a] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-fuchsia-300/20 bg-[#070f28]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200">Cortex</p>
              <p className="text-xs text-slate-300">Website, App, and Business Builder</p>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-xs">
              <Link href="/creatoros" className="rounded-full border border-fuchsia-300/40 bg-fuchsia-500/15 px-3 py-1.5 font-semibold text-fuchsia-100 hover:bg-fuchsia-500/25">
                Overview
              </Link>
              <Link href="/creatoros/dashboard" className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1.5 font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20">
                Dashboard
              </Link>
              <Link href="/website-builder" className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Website Builder
              </Link>
              <Link href="/app-builder" className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                App Builder
              </Link>
              <Link href="/resources/blog" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 hover:bg-white/10">
                Guides
              </Link>
            </nav>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300">
            <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-500/10 px-3 py-1">Build</span>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1">Template</span>
            <span className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1">Host</span>
            <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1">Domain</span>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
