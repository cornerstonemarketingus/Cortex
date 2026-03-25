import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function SitesFunnelsPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Sites & Funnels</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Growth Surfaces</h1>
          <p className="mt-3 text-sm text-slate-300">Build and launch your website and funnel flows with one-click handoff into lead automation.</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/website-builder" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Website Builder</Link>
          <Link href="/autoflow" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Funnels + CRM</Link>
          <Link href="/app-builder" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">App Builder</Link>
        </section>
      </div>
    </main>
  );
}
