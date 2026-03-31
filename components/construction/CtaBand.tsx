import Link from 'next/link';

export default function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 border-y border-amber-300/15" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_0%_50%,rgba(255,184,77,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_100%_50%,rgba(255,184,77,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center md:px-10">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
          Start Your Project
        </p>
        <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
          Ready to Build Something
          <br />
          <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
            Extraordinary?
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
          Tell us about your project. Our team will reach back within one business day with a
          complimentary consultation and preliminary scope estimate.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-9 py-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900 shadow-xl shadow-amber-500/20 transition hover:bg-amber-400"
          >
            Request a Free Estimate
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-9 py-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
          >
            See Our Portfolio
          </Link>
        </div>
      </div>
    </section>
  );
}
