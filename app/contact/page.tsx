import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#041238] via-[#0a255f] to-[#07163a] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Contact</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Talk With Our Team</h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-100/90">
            Share your project goals and we will map the right product path: Bid Build, Builder Copilot, Cortex, or hybrid deployment.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-5 text-sm">
          <p className="text-slate-200">Support: support@teambuildercopilot.com</p>
          <p className="mt-1 text-slate-200">Legal: legal@teambuildercopilot.com</p>
          <p className="mt-2 text-slate-200">Sales line: 612-556-5408</p>
          <p className="mt-3 text-slate-300">
            For fastest response, include your business type, monthly lead volume, and whether you need contractor estimating, CRM automation, or both.
          </p>
        </section>
      </div>
    </main>
  );
}
