import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function LeadsPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Leads</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Lead Inbox</h1>
          <p className="mt-3 text-sm text-slate-300">Lead handling automations run here: instant response, missed-call text-back, and AI chat response.</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/construction-solutions" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Open Lead Workspace</Link>
          <Link href="/automations" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Run Automations</Link>
          <Link href="/pipelines" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">View Pipeline</Link>
        </section>
      </div>
    </main>
  );
}
