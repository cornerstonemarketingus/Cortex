import Link from 'next/link';

const reviews = [
  {
    id: 1,
    name: 'James T.',
    role: 'CEO, Meridian Group',
    stars: 5,
    quote:
      'Cornerstone delivered our 22-story tower 2 weeks ahead of schedule and $400K under budget. Their project management is the best in the industry — bar none.',
    project: 'The Meridian Tower',
  },
  {
    id: 2,
    name: 'Sarah & Mark L.',
    role: 'Homeowners',
    stars: 5,
    quote:
      'We\'ve built three homes in our lives. This was the first time a contractor actually listened. The result exceeded every expectation we had.',
    project: 'Lakeside Estate — Wayzata',
  },
  {
    id: 3,
    name: 'Dr. Karen P.',
    role: 'Director of Facilities, NMC Health',
    stars: 5,
    quote:
      'Our medical campus was a complex, highly regulated build. Cornerstone navigated every compliance requirement flawlessly. Truly a world-class team.',
    project: 'Northgate Medical Campus',
  },
  {
    id: 4,
    name: 'Tom B.',
    role: 'VP Development, Apex Properties',
    stars: 5,
    quote:
      'We\'ve partnered with Cornerstone on four projects now. Their quality is consistent, their communication is excellent, and their subs are top tier.',
    project: 'The Quarter — Retail District',
  },
  {
    id: 5,
    name: 'Rachel M.',
    role: 'Owner, Cedar Ridge Logistics',
    stars: 5,
    quote:
      'Industrial construction done right. On time, on budget, zero punch-list drama. We\'re already talking about Phase II with them.',
    project: 'Cedar Ridge Industrial Park',
  },
  {
    id: 6,
    name: 'David & Linda H.',
    role: 'Homeowners',
    stars: 5,
    quote:
      'From the first meeting to move-in day, Cornerstone treated our home like it was their own. Absolutely stunning craftsmanship.',
    project: 'Birchwood Estates',
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={i < count ? 'text-amber-400' : 'text-slate-600'}
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface ReviewsSectionProps {
  /** Show only the first N reviews (used on homepage) */
  limit?: number;
}

export default function ReviewsSection({ limit }: ReviewsSectionProps) {
  const displayed = limit ? reviews.slice(0, limit) : reviews;

  return (
    <section className="relative bg-[#071014] py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,rgba(255,184,77,0.05),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Client Testimonials
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              What Our Clients Say
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Our reputation is built on results. Here&#39;s what the people we&#39;ve built for have to
              say.
            </p>
          </div>
          {limit && (
            <Link
              href="/reviews"
              className="shrink-0 self-start rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:bg-white/10 md:self-auto"
            >
              Read All Reviews
            </Link>
          )}
        </div>

        {/* Reviews grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((review) => (
            <blockquote
              key={review.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-amber-300/20 hover:bg-amber-500/[0.03]"
            >
              <StarRating count={review.stars} />
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">
                &ldquo;{review.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-white/10 pt-4">
                <p className="text-[13px] font-bold text-white">{review.name}</p>
                <p className="text-[11px] text-slate-400">{review.role}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400/70">
                  {review.project}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
