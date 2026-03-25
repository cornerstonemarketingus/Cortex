import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const planFeatures = [
  'Website + App Builder in one workspace',
  'AI automations for CRM, follow-ups, and reception workflows',
  'Estimator, bids, invoices, and contractor operations modules',
  'Lead capture, pipeline tracking, and proposal workflows',
  'AI estimate reader and blueprint takeoff outputs',
  'Admin portal access for protected build operations',
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">One plan for Builder + AI Automations</h1>
          <p className="mt-3 max-w-3xl text-sm text-cyan-100/90">
            Everything needed to run your estimating, build, and automation operations from one app.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-yellow-300/35 bg-yellow-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-yellow-200">Unified Plan</p>
          <h2 className="mt-2 text-4xl font-semibold text-yellow-100">$297/mo</h2>
          <p className="mt-1 text-sm text-slate-300">Includes builder, AI automations, and contractor OS modules.</p>

          <div className="mt-5 grid grid-cols-1 gap-2">
            {planFeatures.map((feature) => (
              <div key={feature} className="rounded-xl border border-white/20 bg-black/25 px-3 py-2 text-sm text-slate-200">
                {feature}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="/bidbuilder"
              className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
            >
              Open Bid Build
            </a>
            <a
              href="/signup?next=/estimate"
              className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15"
            >
              Start Subscription
            </a>
            <a
              href="/subscription"
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-4 py-2 text-xs font-semibold hover:bg-cyan-500/25"
            >
              View Usage Dashboard
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
