import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-300">Effective: March 25, 2026</p>
        </header>

        <section className="mt-6 space-y-4 text-sm text-slate-200">
          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">What We Collect</h2>
            <p className="mt-2">We collect account details, project/estimate inputs, communications metadata, and usage analytics needed to operate Builder Copilot services.</p>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">How We Use Data</h2>
            <p className="mt-2">We use data to generate estimates, automate follow-up workflows, provide support, improve product reliability, and protect against fraud/abuse.</p>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Sharing and Processors</h2>
            <p className="mt-2">We use subprocessors for hosting, messaging, email, payments, and AI features. We do not sell your customer records or project inputs.</p>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Retention and Deletion</h2>
            <p className="mt-2">We retain data only as long as needed for service delivery, compliance, and security. You can submit deletion requests through the data deletion page.</p>
          </article>

          <article className="rounded-2xl border border-white/15 bg-black/25 p-5">
            <h2 className="text-lg font-semibold text-cyan-100">Your Rights</h2>
            <p className="mt-2">You may request access, correction, export, or deletion of account data by contacting support@teambuildercopilot.com.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
