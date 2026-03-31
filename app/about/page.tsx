import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import CtaBand from '@/components/construction/CtaBand';
import Link from 'next/link';

const values = [
  {
    icon: '🏆',
    title: 'Uncompromising Quality',
    description:
      'Every material, every joint, every finish is held to the highest standard. We do not cut corners — ever.',
  },
  {
    icon: '🤝',
    title: 'Partnership Mentality',
    description:
      'We treat your project as if it were our own. Open communication, honest timelines, and zero surprises.',
  },
  {
    icon: '📋',
    title: 'Precision Execution',
    description:
      'Our project management systems keep every trade on schedule, every milestone documented, and every risk mitigated.',
  },
  {
    icon: '🌱',
    title: 'Sustainable Building',
    description:
      'We integrate energy-efficient design, responsible sourcing, and LEED-aligned practices across all our projects.',
  },
];

const team = [
  {
    name: 'Marcus Reeves',
    title: 'Founder & CEO',
    bio: '25 years of construction leadership across residential, commercial, and industrial sectors. Former VP of Construction at a Top 50 ENR contractor.',
    initials: 'MR',
  },
  {
    name: 'Elena Torres',
    title: 'VP of Project Management',
    bio: 'PMP-certified with expertise in healthcare and mission-critical facilities. Delivered over $400M in project value.',
    initials: 'ET',
  },
  {
    name: 'James Whitfield',
    title: 'Chief Estimator',
    bio: '18 years of preconstruction experience. Known for building estimates that win bids and protect margins.',
    initials: 'JW',
  },
  {
    name: 'Dana Kline',
    title: 'Director of Field Operations',
    bio: 'Former master carpenter turned field director. Oversees all on-site superintendents and quality control programs.',
    initials: 'DK',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/10 py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,184,77,0.1),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            Our Story
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-6xl">
            Built on Trust. Proven by Results.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Cornerstone Construction has been raising the bar for construction quality across
            Minnesota and the greater Midwest for over 25 years. We started as a small residential
            crew and grew into one of the region&apos;s most respected full-service contractors —
            without ever losing our commitment to the craft.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
                Our Mission
              </p>
              <h2 className="text-4xl font-black tracking-tight text-white">
                Excellence Is the Only Standard
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-400">
                We believe every structure we build is a reflection of the people inside it. That&apos;s
                why we bring the same dedication to a 500 sq ft tenant improvement as we do to a
                22-story tower. No project is too small to deserve our best work.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Our mission is simple: deliver extraordinary results for every client, every time —
                on time, within budget, and with a level of craftsmanship that stands for
                generations.
              </p>
              <Link
                href="/contact"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em] text-slate-900 transition hover:bg-amber-400"
              >
                Start Your Project
              </Link>
            </div>

            <div className="flex flex-col gap-5">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <span className="mt-0.5 text-2xl" aria-hidden="true">
                    {value.icon}
                  </span>
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{value.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="bg-[#0a0e14] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-12">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Leadership
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white">
              The Team Behind the Work
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/30 bg-amber-500/15 text-xl font-black text-amber-200">
                  {member.initials}
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-white">{member.name}</h3>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-400">
                  {member.title}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
