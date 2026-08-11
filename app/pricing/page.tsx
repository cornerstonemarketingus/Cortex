import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import BuilderCopilotPanel from '@/components/copilot/BuilderCopilotPanel';
import EstimatorTool from '@/components/estimator/EstimatorTool';

const roiProof = [
  { label: 'Lead Response Time', value: '< 60 sec', note: 'With AI receptionist + instant SMS handoff' },
  { label: 'Follow-up Coverage', value: '24/7', note: 'No lead dropped outside office hours' },
  { label: 'Workflow Surface', value: '1 Hub', note: 'Estimator, CRM, pipeline, and delivery in one stack' },
] as const;

type PackageCard = {
  name: string;
  price: string;
  unit: string;
  valueLine: string;
  points: string[];
  cta: string;
  featured?: boolean;
};

const packageCards: PackageCard[] = [
  {
    name: 'Starter',
    price: '$79',
    unit: '/mo',
    valueLine: 'Launch your first revenue loop',
    points: ['150 monthly tokens', 'AI estimate builder', 'Lead capture website', 'CRM starter pipeline', '1 user'],
    cta: 'Launch Starter',
  },
  {
    name: 'Growth',
    price: '$149',
    unit: '/mo',
    valueLine: 'Built for teams closing weekly',
    points: ['400 monthly tokens', 'Advanced estimator + takeoff', 'Automation workflows', 'Proposal + payment links', '3 users'],
    cta: 'Launch Growth',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$299',
    unit: '/mo',
    valueLine: 'High-volume estimating + ops',
    points: [
      '1200 monthly tokens',
      'Live copilot command center',
      'Estimator confidence scoring',
      'Inline website builder editing',
      'Automations hub orchestration',
      '10 users',
    ],
    cta: 'Launch Pro',
  },
  {
    name: 'Enterprise',
    price: '$799',
    unit: '/mo',
    valueLine: 'Tokenized operating system at scale',
    points: [
      '4000 monthly tokens',
      'Advanced governance and controls',
      'Dedicated launch + migration',
      'Custom workflows and integrations',
      'Priority infrastructure lane',
      'Unlimited users',
    ],
    cta: 'Launch Enterprise',
  },
] as const;

const proFeatures = [
  { title: 'AI Proposal Generator', body: 'Type a plain-English scope and get a client-ready proposal.' },
  { title: 'E-Signatures', body: 'Clients sign on phone and your team is notified instantly.' },
  { title: 'Job Profit Calculator', body: 'Validate real margin before you send the bid.' },
  { title: 'Change Order Generator', body: 'Create and sign formal change orders in minutes.' },
  { title: 'Lead Capture Page', body: 'Share once, collect leads automatically.' },
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

const planTakeoffTags = ['Floor Plans', 'Blueprints', 'Sketches', 'Site Plans', 'Hand Drawings'];

const tokenPacks = [
  { id: 'boost-500', name: 'Boost 500', price: '$49', tokens: '500 tokens' },
  { id: 'pro-1500', name: 'Pro 1500', price: '$129', tokens: '1,500 tokens' },
  { id: 'scale-5000', name: 'Scale 5000', price: '$349', tokens: '5,000 tokens' },
] as const;

export default function PricingPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Construction SaaS Revenue System"
        title="Get more construction jobs without chasing leads"
        subtitle="Builder Copilot builds your website, creates estimates, and runs follow-up automatically so your team stays in close mode."
      />

      <div className="mx-auto max-w-5xl px-6 pb-16 space-y-12">
        {/* ROI proof */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {roiProof.map((item) => (
            <Card key={item.label}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.note}</p>
            </Card>
          ))}
        </div>

        {/* Estimator tool */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold mb-3">Try It Free</p>
          <EstimatorTool />
        </section>

        {/* Quick start */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr] lg:items-start">
          <Card>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Quick Start</p>
            <h2 className="mt-2 text-xl font-bold text-white">Estimator + Page Builder in one flow</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Launch an estimate workflow, then use copilot to generate conversion pages and automation logic without switching tools.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="/estimate">Open Estimator</Button>
              <Button href="/builder" variant="secondary">Open Page Builder</Button>
            </div>
          </Card>

          <BuilderCopilotPanel
            title="Builder Copilot Assistant"
            subtitle="Ask copilot to generate estimate upgrades and page-builder code suggestions side-by-side."
            defaultPrompt="Improve my estimate flow and generate the page-builder sections needed to increase close rate."
            contextLabel="pricing-base44"
            showProvisioning={false}
          />
        </section>

        {/* Packages */}
        <section id="packages">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Packages</p>
          <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">All paid plans start at $79 and scale to enterprise operating systems.</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {packageCards.map((pkg) => (
              <Card key={pkg.name} className={pkg.featured ? 'border-[#C69C6D]/50 bg-[#1a1508]/40' : undefined}>
                <p className="text-sm font-semibold text-white">{pkg.name}</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {pkg.price}
                  <span className="text-sm font-medium text-slate-400">{pkg.unit}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">{pkg.valueLine}</p>
                <div className="mt-4 space-y-1.5">
                  {pkg.points.map((point) => (
                    <p key={point} className="text-xs text-slate-300">
                      · {point}
                    </p>
                  ))}
                </div>
                <div className="mt-5">
                  <Button href="/signup?next=/workspace" variant={pkg.featured ? 'primary' : 'secondary'} className="w-full">
                    {pkg.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Token packs */}
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Token Packs</p>
          <h2 className="mt-2 text-xl font-bold text-white">Pay for everything with tokens when you need extra capacity</h2>
          <p className="mt-2 text-sm text-slate-400">Tokens are consumed by estimator runs, copilot operations, automation executions, and preview generation.</p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {tokenPacks.map((pack) => (
              <Card key={pack.id}>
                <p className="text-sm font-semibold text-white">{pack.name}</p>
                <p className="mt-1 text-xl font-bold text-white">{pack.price}</p>
                <p className="text-xs text-slate-400">{pack.tokens}</p>
                <Button href={`/subscription?buyTokens=${encodeURIComponent(pack.id)}`} variant="secondary" className="mt-4 w-full">
                  Buy Token Pack
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Plan takeoff */}
        <section>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Plan Takeoff</p>
            <h2 className="mt-2 text-xl font-bold text-white">Upload blueprints or floor plans and get an instant itemized estimate.</h2>
            <p className="mt-2 text-sm text-slate-400">Supports floor plans, blueprints, sketches, site plans, and hand drawings in PNG, JPG, WEBP, or PDF.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {planTakeoffTags.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#C69C6D] font-semibold">1. Upload Your Plans</p>
                <p className="mt-2 text-sm text-slate-300">Drop your plans and run AI takeoff instantly.</p>
                <Button href="/estimate/takeoff" className="mt-3">
                  Browse Files
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#C69C6D] font-semibold">2. Add Project Details</p>
                <p className="mt-2 text-sm text-slate-300">Project category auto-detect + zip code for regional pricing.</p>
                <Button href="/estimate/takeoff" variant="secondary" className="mt-3">
                  Run AI Takeoff
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Why contractors love pro */}
        <section>
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Why Contractors Love Pro</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              {proFeatures.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{feature.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Local presence + reviews */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Local Presence</p>
            <h2 className="mt-2 text-xl font-bold text-white">Map + Reputation Signal</h2>
            <p className="mt-2 text-sm text-slate-400">Embed this into the offer page to reinforce local trust and improve conversion quality.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
              <iframe
                title="Miller Custom Framing Map"
                src="https://maps.google.com/maps?q=Miller%20Custom%20Framing&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="h-64 w-full border-0"
                loading="lazy"
              />
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Client Reviews</p>
            <h2 className="mt-2 text-xl font-bold text-white">What Contractors Are Saying</h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {reviews.map((review) => (
                <div key={review.author} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{review.copy}</p>
                  <p className="mt-2 text-xs font-semibold text-[#C69C6D]">
                    {review.author} · {review.business}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Demo / trial CTA */}
        <section>
          <Card className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Demo + Trial</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Try instantly, then launch your real business.</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
              Demo mode loads a pre-built business with sample leads and estimate data. Trial mode saves your system with your business data.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button href="/signup" variant="secondary">
                Try Demo
              </Button>
              <Button href="/signup?next=/workspace">Launch My Business</Button>
            </div>
          </Card>
        </section>
      </div>
    </PageShell>
  );
}
