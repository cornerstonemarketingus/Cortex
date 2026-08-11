import Link from 'next/link';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';

const resourceCards = [
  {
    icon: '📚',
    title: 'Guides',
    description: 'Playbooks for estimating, lead generation, and CRM automation.',
    href: '/resources/blog',
    cta: 'Open Guides',
  },
  {
    icon: '🔎',
    title: 'SEO Clusters',
    description: 'Contractor, homeowner, and SaaS content clusters linked to the estimator funnel.',
    href: '/resources/blog',
    cta: 'Browse Clusters',
  },
  {
    icon: '🧮',
    title: 'Cost Calculator',
    description: 'Public lead-magnet estimator with location-aware low/avg/high ballpark pricing.',
    href: '/estimate',
    cta: 'Try Calculator',
  },
];

export default function ResourcesPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Resources"
        title="SEO content that produces pipeline"
        subtitle="Customer-intent guides for Minnesota and nationwide local-service markets, routed straight into the estimator and CRM automation demos."
      />

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resourceCards.map((card) => (
            <Link key={card.title} href={card.href} className="group">
              <Card hover className="h-full">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/60 flex items-center justify-center text-xl mb-4">
                  {card.icon}
                </div>
                <h2 className="text-lg font-bold text-white mb-2">{card.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#C69C6D] group-hover:gap-2 transition-all">
                  {card.cta} <span>→</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
