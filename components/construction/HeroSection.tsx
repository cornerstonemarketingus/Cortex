import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Layered background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a1c] via-[#101f2a] to-[#13181f]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,rgba(255,184,77,0.12),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Decorative corner glow */}
      <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-3xl" />
      <div className="absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-28 md:py-40 md:px-10 lg:py-52">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Premium Construction Services
          </p>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl lg:text-[5.5rem]">
            Built to Last.
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Crafted to Impress.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            We deliver precision-engineered construction with uncompromising quality. From luxury
            residential builds to large-scale commercial projects — we bring your vision to life, on
            time and on budget.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 hover:shadow-amber-500/30"
            >
              Get a Free Estimate
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 hover:border-white/30"
            >
              View Our Work
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
