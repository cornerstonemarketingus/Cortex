import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import BuilderCopilotPanel from '@/components/copilot/BuilderCopilotPanel';

const trialPass = 'CORTEX-TRIAL-14D';

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

const onboardingSteps = [
  'Pick a package and activate your workspace in under 3 minutes.',
  'Deploy your lead page, estimator flow, and client portal from one console.',
  'Track pipeline and conversion metrics from your first week.',
] as const;

const reviews = [
  {
    author: 'Jason Miller',
    business: 'Miller Custom Framing',
    copy: 'We started using this estimating + CRM system a few weeks ago and it immediately cleaned up how we run jobs. Estimates that used to take hours are now done in minutes, and everything is tracked in one place. The biggest difference has been follow-up. No more lost leads. We have already closed more jobs just from being faster and more organized. Highly recommend if you are running a construction business and need a real system behind you.',
  },
  {
    author: 'Chris Delgado',
    business: 'Precision Window & Door Co.',
    copy: 'I was skeptical at first, but this software and setup completely changed our workflow. The estimating tool is fast and accurate, and the CRM actually makes sense for contractors. What surprised me most was the funnel setup. Leads come in, get tracked, and we are closing them instead of forgetting about them. It is not just software, it is a full system that grows your business.',
  },
  {
    author: 'Ryan Thompson',
    business: 'North Star Home Builders',
    copy: 'We had no real system before, just notes, texts, and spreadsheets. After getting set up with this platform, everything runs smoother. Estimates go out quickly, clients respond faster, and we are winning more bids. The website and funnel integration brought in more consistent leads than anything we have tried before.',
  },
  {
    author: 'Mike Larson',
    business: 'Larson Construction Group',
    copy: 'The estimating side alone is worth it, but the real value is how everything connects. Leads come through the website, go straight into the CRM, and we can send estimates right away. That speed has helped us land more jobs. It has been a solid investment for our business.',
  },
  {
    author: 'Derek Jensen',
    business: 'Summit Ridge Contracting',
    copy: 'This system helped us go from disorganized to dialed in. The funnels are bringing in better leads, and we actually have a process now to convert them. The estimating tool saves a ton of time, and having everything in one place just makes it easier to scale. If you are trying to grow, this is worth looking at.',
  },
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#111827_42%,#020617_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Construction SaaS Revenue System</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-5xl">Built like a modern copilot. Tuned for contractor close-rate.</h1>
          <p className="mt-3 max-w-4xl text-sm text-cyan-100/90 md:text-base">
            Cortex combines landing pages, estimator workflows, AI receptionist, CRM follow-up, and close loops into one revenue engine. Pick a package, launch fast, and manage it from your client portal.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href="#packages" className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Choose Your Package</a>
            <a href="/admin/login" className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">Client Login</a>
            <a href="/construction-solutions" className="rounded-lg border border-amber-300/35 bg-amber-500/15 px-4 py-2 text-xs font-semibold hover:bg-amber-500/25">Open Estimating Solutions Hub</a>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {roiProof.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/20 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-cyan-200">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-stone-100">{item.value}</p>
              <p className="mt-1 text-xs text-stone-300">{item.note}</p>
            </article>
          ))}
        </section>

        <section id="packages" className="mt-6 rounded-3xl border border-cyan-300/30 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Packages</p>
          <h2 className="mt-2 text-3xl font-semibold text-cyan-100">Start with the package that matches your growth stage.</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {packageCards.map((pkg) => (
              <article
                key={pkg.name}
                className={`rounded-2xl border p-4 ${pkg.featured ? 'border-cyan-300/50 bg-cyan-500/12 shadow-xl shadow-cyan-950/25' : 'border-white/20 bg-black/25'}`}
              >
                <p className="text-sm font-semibold text-stone-100">{pkg.name}</p>
                <p className="mt-2 text-xs text-stone-300">{pkg.setup}</p>
                <p className="text-2xl font-semibold text-cyan-100">{pkg.monthly}</p>
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
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Optimized Onboarding</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {onboardingSteps.map((step) => (
              <article key={step} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {step}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <BuilderCopilotPanel
            title="Builder Copilot From Day One"
            subtitle="Use one copilot to fine tune website copy, app behavior, estimate logic, and launch tasks with implementation-ready instructions."
            defaultPrompt="Give me exact next actions to improve quote precision, optimize conversion copy, and ship a polished launch in 24 hours."
            contextLabel="pricing-home"
            showProvisioning
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border border-white/20 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Local Presence</p>
            <h2 className="mt-2 text-2xl font-semibold text-cyan-100">Map + Reputation Signal</h2>
            <p className="mt-2 text-sm text-slate-300">Embed this into the offer page to reinforce local trust and improve conversion quality.</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/15">
              <iframe
                title="Miller Custom Framing Map"
                src="https://maps.google.com/maps?q=Miller%20Custom%20Framing&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="h-72 w-full border-0"
                loading="lazy"
              />
            </div>
          </article>

          <article className="rounded-3xl border border-white/20 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Client Reviews</p>
            <h2 className="mt-2 text-2xl font-semibold text-amber-100">What Contractors Are Saying</h2>
            <div className="mt-3 space-y-3">
              {reviews.map((review) => (
                <div key={review.author} className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-sm text-slate-200">{review.copy}</p>
                  <p className="mt-2 text-xs text-cyan-100">{review.author} - {review.business}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-amber-300/35 bg-amber-500/10 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Free Trial Pass</p>
          <h2 className="mt-2 text-3xl font-semibold text-amber-100">Need trial access? Give them this pass code.</h2>
          <p className="mt-2 text-sm text-amber-50/90">
            Trial pass: <span className="rounded-md border border-amber-200/40 bg-black/30 px-2 py-1 font-bold tracking-[0.12em]">{trialPass}</span>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href={`/signup?next=/subscription&pass=${encodeURIComponent(trialPass)}`} className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200">Start Free Trial</a>
            <a href="/admin/login" className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15">Client Portal Login</a>
          </div>
        </section>
      </div>
    </main>
  );
}
