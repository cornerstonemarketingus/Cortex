import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const roiProof = [
  { label: 'Lead Response Time', value: '< 60 sec', note: 'With AI receptionist + instant SMS handoff' },
  { label: 'Follow-up Coverage', value: '24/7', note: 'No lead dropped outside office hours' },
  { label: 'Workflow Surface', value: '1 Hub', note: 'Estimator, CRM, pipeline, and delivery in one stack' },
] as const;

type PackageCard = {
  name: string;
  setup: string;
  monthly: string;
  points: string[];
  featured?: boolean;
};

const packageCards: PackageCard[] = [
  {
    name: 'Launch Pack',
    setup: '$1,000 setup',
    monthly: '$197/mo',
    points: [
      'Lead capture page + booking funnel',
      'AI receptionist with missed-call recovery',
      'Pipeline stages with follow-up reminders',
    ],
  },
  {
    name: 'Growth Pack',
    setup: '$1,800 setup',
    monthly: '$397/mo',
    points: [
      'Everything in Launch Pack',
      'Estimator-to-proposal conversion flows',
      'Review generation and reactivation sequences',
    ],
    featured: true,
  },
  {
    name: 'Scale Pack',
    setup: '$2,500+ setup',
    monthly: '$697/mo',
    points: [
      'Everything in Growth Pack',
      'Multi-service funnel deployments',
      'Weekly AI strategy + KPI action board',
    ],
  },
] as const;

const includedCapabilities = [
  'AI estimate reader and blueprint takeoff outputs',
  'Website + app builder for landing and portal delivery',
  'Lead intake, nurture, proposal, and close automation chain',
  'Client login with usage and subscription controls',
  'Automation templates for instant reply, reminders, and reviews',
  'Analytics visibility for conversion and quality gates',
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f4f46_0%,#122129_45%,#070b10_100%)] text-stone-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-emerald-300/35 bg-emerald-500/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">SaaS + Service Deal Packaging</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-5xl">High-converting lead systems for contractors who want booked jobs, not busywork.</h1>
          <p className="mt-3 max-w-4xl text-sm text-emerald-100/90 md:text-base">
            Cortex combines landing pages, estimator workflows, AI receptionist, CRM follow-up, and close loops into one revenue engine. Pick a package, launch fast, and manage it from your client portal.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#packages" className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200">Choose Your Package</a>
            <a href="/admin/login" className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">Client Login</a>
            <a href="/construction-solutions" className="rounded-lg border border-emerald-300/35 bg-emerald-500/15 px-4 py-2 text-xs font-semibold hover:bg-emerald-500/25">Open Estimating Solutions Hub</a>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {roiProof.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">{item.value}</p>
              <p className="mt-1 text-xs text-stone-300">{item.note}</p>
            </article>
          ))}
        </section>

        <section id="packages" className="mt-6 rounded-3xl border border-amber-300/35 bg-amber-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Packages</p>
          <h2 className="mt-2 text-3xl font-semibold text-amber-100">Start with the package that matches your growth stage.</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {packageCards.map((pkg) => (
              <article
                key={pkg.name}
                className={`rounded-2xl border p-4 ${pkg.featured ? 'border-emerald-300/50 bg-emerald-500/15 shadow-xl shadow-emerald-900/20' : 'border-white/20 bg-black/25'}`}
              >
                <p className="text-sm font-semibold text-stone-100">{pkg.name}</p>
                <p className="mt-2 text-xs text-stone-300">{pkg.setup}</p>
                <p className="text-2xl font-semibold text-emerald-100">{pkg.monthly}</p>
                <div className="mt-3 space-y-1">
                  {pkg.points.map((point) => (
                    <p key={point} className="text-xs text-stone-200">- {point}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/20 bg-black/25 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-300">Included In Every Package</p>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {includedCapabilities.map((feature) => (
              <div key={feature} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-stone-200">
                {feature}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-emerald-300/35 bg-emerald-500/10 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Next Step</p>
          <h2 className="mt-2 text-3xl font-semibold text-emerald-100">Choose package. Launch funnel. Track revenue from your portal.</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href="/signup?next=/subscription" className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200">Start Subscription</a>
            <a href="/admin/login" className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">Client Portal Login</a>
          </div>
        </section>
      </div>
    </main>
  );
}
