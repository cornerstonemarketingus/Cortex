"use client";

import Link from 'next/link';
import TemplatesPanel from '@/components/templates/TemplatesPanel';

export default function CommandCenterLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-sm text-slate-300">Central workspace for Copilot-driven builds, estimates, and automations.</p>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/command-center" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white">Overview</Link>
          <Link href="/templates" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white">Templates</Link>
          <Link href="/sandbox" className="rounded-md border border-white/10 px-3 py-2 text-sm text-white">Sandbox</Link>
        </nav>
      </header>

      <main className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="col-span-1 rounded-xl border border-card-bg p-4 bg-[var(--card-bg)]">
          <h3 className="text-sm font-semibold text-slate-100">Quick Actions</h3>
          <div className="mt-3 flex flex-col gap-2">
            <Link href="/estimate" className="rounded-md bg-accent-500 px-3 py-2 text-sm font-semibold text-slate-900">New Estimate</Link>
            <Link href="/website-builder" className="rounded-md border border-white/10 px-3 py-2 text-sm">New Page</Link>
            <Link href="/automations" className="rounded-md border border-white/10 px-3 py-2 text-sm">New Automation</Link>
          </div>

          <div className="mt-6">
            <h4 className="text-xs text-slate-300">Templates</h4>
            <div className="mt-2">
              <TemplatesPanel />
            </div>
          </div>
        </aside>

        <section className="col-span-2 rounded-xl border border-card-bg p-4 bg-[var(--card-bg)]">
          {children || <p className="text-sm text-slate-300">Select an action to begin. The command center will surface Copilot suggestions, recent actions, and live previews here.</p>}
        </section>
      </main>
    </div>
  );
}
