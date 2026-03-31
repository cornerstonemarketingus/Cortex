import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import ProjectsSection from '@/components/construction/ProjectsSection';
import CtaBand from '@/components/construction/CtaBand';

export default function ProjectsPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/10 py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,184,77,0.1),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            Our Portfolio
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            Projects That Define a Region.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Every project in our portfolio represents a client who trusted us with their most
            valuable investment. We don&apos;t take that lightly. Browse our recent work below.
          </p>
        </div>
      </section>

      {/* Full Projects Grid */}
      <ProjectsSection />

      <CtaBand />
    </main>
  );
}
