import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const resourceCards = [
  {
    title: 'Guides',
    description: 'Playbooks for estimating, lead generation, and CRM automation.',
    href: '/resources/blog',
    cta: 'Open Guides',
  },
  {
    title: 'SEO Clusters',
    description: 'Contractor, homeowner, and SaaS content clusters linked to the estimator funnel.',
    href: '/resources/blog',
    cta: 'Browse Clusters',
  },
  {
    title: 'Cost Calculator',
    description: 'Public lead-magnet estimator with location-aware low/avg/high ballpark pricing.',
    href: '/estimate',
    cta: 'Try Calculator',
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#221714] via-[#2d221c] to-[#161110] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <header className="rounded-3xl border border-orange-300/30 bg-orange-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Resources</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">SEO Content That Produces Pipeline</h1>
          <p className="mt-3 max-w-3xl text-sm text-orange-100/90">
            Publish customer-intent guides for Minnesota and nationwide local-service markets, then route traffic into estimator and CRM automation demos.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {resourceCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-xs font-semibold hover:bg-amber-500/30"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
