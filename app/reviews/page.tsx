import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import ReviewsSection from '@/components/construction/ReviewsSection';
import CtaBand from '@/components/construction/CtaBand';

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/10 py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,184,77,0.1),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            Client Testimonials
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            What Our Clients Say.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            We let our work speak for itself — and our clients speak for us. Here are reviews from
            the property owners, developers, and business leaders we&apos;ve had the privilege of
            building for.
          </p>

          {/* Overall rating summary */}
          <div className="mt-10 inline-flex items-center gap-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 px-6 py-4">
            <div>
              <p className="text-4xl font-black text-amber-300">5.0</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Average Rating
              </p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div>
              <p className="text-4xl font-black text-amber-300">100%</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Would Recommend
              </p>
            </div>
            <div className="h-12 w-px bg-white/10" />
            <div>
              <p className="text-4xl font-black text-amber-300">500+</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Projects Delivered
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All Reviews */}
      <ReviewsSection />

      <CtaBand />
    </main>
  );
}
