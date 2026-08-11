import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Cluster = {
  title: string;
  summary: string;
  posts: Array<{ title: string; keyword: string }>;
};

const clusters: Cluster[] = [
  {
    title: 'Contractor SEO',
    summary: 'Capture high-intent estimating traffic from contractor pricing and bid workflows.',
    posts: [
      { title: 'Cost to frame a house in Minneapolis', keyword: 'cost to frame a house in [city]' },
      { title: 'Framing cost per sq ft in 2026', keyword: 'framing cost per sq ft 2026' },
      { title: 'How to estimate framing jobs faster', keyword: 'how to estimate framing jobs' },
    ],
  },
  {
    title: 'Homeowner SEO',
    summary: 'Drive homeowners into self-serve estimate flows and contractor quote conversion.',
    posts: [
      { title: 'Cost to build a deck in Minnesota', keyword: 'cost to build a deck' },
      { title: 'Kitchen remodel cost estimator guide', keyword: 'kitchen remodel cost estimator' },
      { title: 'Bathroom renovation cost MN', keyword: 'bathroom renovation cost MN' },
    ],
  },
  {
    title: 'Business / SaaS SEO',
    summary: 'Attract operators searching for lead generation and CRM workflow systems.',
    posts: [
      { title: 'How contractors get more leads in 2026', keyword: 'how contractors get more leads' },
      { title: 'Best CRM for contractors: what matters', keyword: 'best CRM for contractors' },
      { title: 'Estimator + CRM flywheel for local service growth', keyword: 'contractor estimator CRM workflow' },
    ],
  },
];

export default function ResourcesBlogPage() {
  return (
    <PageShell>
      <PageHero
        kicker="Resources / Blog"
        title="Customer-intent clusters that drive revenue"
        subtitle="Every article is mapped to one of three outcomes: estimate request, automation consult, or business-growth onboarding."
      />

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <Card key={cluster.title}>
              <h2 className="text-lg font-bold text-white">{cluster.title}</h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{cluster.summary}</p>
              <ul className="mt-4 space-y-2">
                {cluster.posts.map((post) => (
                  <li key={post.title} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-xs font-semibold text-slate-200">{post.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Keyword: {post.keyword}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Conversion Funnel</p>
          <h2 className="mt-2 text-xl font-bold text-white">Turn blog traffic into pipeline</h2>
          <p className="mt-2 text-sm text-slate-400">Move blog traffic into estimator actions and CRM automation setup without extra navigation friction.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="/estimate">Try Cost Calculator</Button>
            <Button href="/construction-solutions" variant="secondary">Book Contractor Demo</Button>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
