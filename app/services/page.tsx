import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import ServicesSection from '@/components/construction/ServicesSection';
import CtaBand from '@/components/construction/CtaBand';

const process = [
  {
    step: '01',
    title: 'Initial Consultation',
    description:
      "We meet to understand your vision, goals, timeline, and budget. No pressure — just an honest conversation about what's possible.",
  },
  {
    step: '02',
    title: 'Preconstruction Planning',
    description:
      "Our estimating and design teams develop detailed scope, budget, and schedule. We surface risks early so there are no surprises later.",
  },
  {
    step: '03',
    title: 'Permitting & Procurement',
    description:
      "We manage every permit, inspection, and material procurement. Our subcontractor relationships guarantee quality trades and competitive pricing.",
  },
  {
    step: '04',
    title: 'Construction Execution',
    description:
      'Daily site management by a dedicated superintendent. Weekly owner updates. Real-time issue resolution. Zero tolerance for schedule drift.',
  },
  {
    step: '05',
    title: 'Quality Control & Closeout',
    description:
      "Rigorous punch-list management, systems commissioning, and a smooth handover. We don't consider a project done until you're 100% satisfied.",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/10 py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,184,77,0.1),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            What We Do
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            Construction Services Built for Complexity.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            From the first shovel to the final walkthrough, we offer a complete suite of
            construction and preconstruction services that cover every project type and market
            sector.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <ServicesSection />

      {/* Process */}
      <section className="bg-[#0a0e14] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-12">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
              How We Work
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Our Proven Process
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-400">
              Every Cornerstone project follows a disciplined 5-phase process that keeps your
              project on track from day one.
            </p>
          </div>

          <ol className="relative border-l border-amber-400/20">
            {process.map((phase) => (
              <li key={phase.step} className="mb-10 ml-8 last:mb-0">
                <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/15 text-[11px] font-black text-amber-300">
                  {phase.step}
                </span>
                <h3 className="text-lg font-bold text-white">{phase.title}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  {phase.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
