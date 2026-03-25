import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const posts = [
  {
    title: 'How Bid Build helps contractors estimate faster and close better',
    category: 'Estimating',
    summary: 'A practical look at estimator-first operations and modern close workflows for service businesses.',
  },
  {
    title: 'Copilot AI updates: improving automation quality across CRM pipelines',
    category: 'Software',
    summary: 'Product updates covering workflow automation, lifecycle messaging, and operational visibility enhancements.',
  },
  {
    title: 'Construction growth playbook for 2026: operations, marketing, and retention',
    category: 'Construction',
    summary: 'An execution-focused blueprint for regional contractors scaling lead flow, production, and retention.',
  },
  {
    title: 'Building high-performance local SaaS experiences for field teams',
    category: 'Tech',
    summary: 'Design and systems approaches we use to keep business software fast, clear, and adoption-friendly.',
  },
  {
    title: 'Business systems that compound revenue: from quote to repeat customer',
    category: 'Business',
    summary: 'How integrated estimation, automation, and service operations can create durable growth loops.',
  },
  {
    title: 'AI voice receptionist strategies that increase booked opportunities',
    category: 'Automation',
    summary: 'Tactical voice and text-back orchestration patterns for reducing missed opportunities.',
  },
] as const;

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/12 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Bid Build Blog</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Insights on business, tech, software, estimating, and construction</h1>
          <p className="mt-3 max-w-4xl text-sm text-cyan-100/90 md:text-base">
            This is the official Bid Build company blog. We publish practical guidance, product updates, and field-tested playbooks for local service growth.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <article key={post.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{post.category}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">{post.title}</h2>
              <p className="mt-3 text-sm text-slate-300">{post.summary}</p>
              <button
                type="button"
                className="mt-4 rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-50"
              >
                Coming Soon
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
