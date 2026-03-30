import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import Link from 'next/link';

export default function StartPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <h1 className="text-3xl font-extrabold">Start — Quick Launcher</h1>
        <p className="mt-2 text-slate-300">Pick a starting point to get moving fast.</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Link href="/estimate" className="rounded-lg bg-amber-300 p-4 font-semibold text-slate-900">New Estimate</Link>
          <Link href="/website-builder" className="rounded-lg border border-white/10 p-4">Page Builder</Link>
          <Link href="/automations" className="rounded-lg border border-white/10 p-4">Automations</Link>
          <Link href="/workspace" className="rounded-lg border border-white/10 p-4">Open Workspace</Link>
        </div>

        <section className="mt-8 text-left">
          <h2 className="text-xl font-semibold">Guided Flow</h2>
          <ol className="mt-2 list-decimal space-y-1 text-sm text-slate-300">
            <li>Template → Customize → Publish → Capture Leads</li>
            <li>Preview → Publish → Capture</li>
            <li>Automations → Follow-up → Nurture</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
