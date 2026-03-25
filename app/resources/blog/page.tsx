import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

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
    <main className="min-h-screen bg-gradient-to-b from-[#211713] via-[#2e221d] to-[#161110] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <header className="rounded-3xl border border-orange-300/30 bg-orange-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Resources / Blog</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Customer-Intent Clusters That Drive Revenue</h1>
          <p className="mt-3 max-w-3xl text-sm text-orange-100/90">
            Every article is mapped to one of three outcomes: estimate request, automation consult, or business-growth onboarding.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {clusters.map((cluster) => (
            <article key={cluster.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <h2 className="text-xl font-semibold text-amber-100">{cluster.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{cluster.summary}</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-200">
                {cluster.posts.map((post) => (
                  <li key={post.title} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <p className="font-semibold">{post.title}</p>
                    <p className="mt-1 text-slate-400">Keyword: {post.keyword}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-orange-300/30 bg-orange-500/10 p-5">
          <h2 className="text-xl font-semibold text-orange-100">Conversion Funnel</h2>
          <p className="mt-2 text-sm text-orange-50/90">Move blog traffic into estimator actions and CRM automation setup without extra navigation friction.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/estimate"
              className="rounded-lg bg-orange-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-orange-300"
            >
              Try Cost Calculator
            </Link>
            <Link
              href="/construction-solutions"
              className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-4 py-2 text-xs font-semibold hover:bg-amber-500/30"
            >
              Book Contractor Demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
