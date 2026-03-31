import Link from 'next/link';

const projects = [
  {
    id: 1,
    title: 'The Meridian Tower',
    category: 'Commercial',
    location: 'Minneapolis, MN',
    description:
      '22-story mixed-use development featuring Class A office space and luxury residences with integrated smart building systems.',
    accent: 'from-amber-500/20 to-amber-900/10',
    border: 'border-amber-300/20',
    badge: 'bg-amber-500/15 text-amber-200 border-amber-300/25',
  },
  {
    id: 2,
    title: 'Lakeside Estate — Wayzata',
    category: 'Luxury Residential',
    location: 'Wayzata, MN',
    description:
      '8,400 sq ft custom lakefront home with imported stone, heated floors, and a climate-controlled 12-car garage.',
    accent: 'from-cyan-500/15 to-blue-900/10',
    border: 'border-cyan-300/20',
    badge: 'bg-cyan-500/15 text-cyan-200 border-cyan-300/25',
  },
  {
    id: 3,
    title: 'Northgate Medical Campus',
    category: 'Healthcare',
    location: 'Bloomington, MN',
    description:
      '180,000 sq ft medical office and clinic complex built to LEED Gold standards, completed 3 weeks ahead of schedule.',
    accent: 'from-emerald-500/15 to-emerald-900/10',
    border: 'border-emerald-300/20',
    badge: 'bg-emerald-500/15 text-emerald-200 border-emerald-300/25',
  },
  {
    id: 4,
    title: 'The Quarter — Retail District',
    category: 'Retail / Mixed-Use',
    location: 'St. Paul, MN',
    description:
      'Award-winning 45,000 sq ft urban retail development blending historic preservation with contemporary architecture.',
    accent: 'from-violet-500/15 to-purple-900/10',
    border: 'border-violet-300/20',
    badge: 'bg-violet-500/15 text-violet-200 border-violet-300/25',
  },
  {
    id: 5,
    title: 'Cedar Ridge Industrial Park',
    category: 'Industrial',
    location: 'Plymouth, MN',
    description:
      'Four-building industrial campus totaling 320,000 sq ft with 36-foot clear heights and automated dock systems.',
    accent: 'from-orange-500/15 to-orange-900/10',
    border: 'border-orange-300/20',
    badge: 'bg-orange-500/15 text-orange-200 border-orange-300/25',
  },
  {
    id: 6,
    title: 'Birchwood Estates — Phase II',
    category: 'Residential Community',
    location: 'Edina, MN',
    description:
      '34-lot luxury subdivision with fully custom homes ranging from $1.2M–$3.5M, featuring underground utilities and trail access.',
    accent: 'from-rose-500/15 to-rose-900/10',
    border: 'border-rose-300/20',
    badge: 'bg-rose-500/15 text-rose-200 border-rose-300/25',
  },
];

interface ProjectsSectionProps {
  /** Show only the first N projects (used on homepage) */
  limit?: number;
}

export default function ProjectsSection({ limit }: ProjectsSectionProps) {
  const displayed = limit ? projects.slice(0, limit) : projects;

  return (
    <section className="relative bg-[#0a0e14] py-24 md:py-32">
      {/* Subtle ambient glow */}
      <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-full bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,184,77,0.06),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        {/* Section header */}
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Our Portfolio
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Landmark Projects
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Each project is a testament to our craft — delivered on time, within budget, and built
              to stand for generations.
            </p>
          </div>
          {limit && (
            <Link
              href="/projects"
              className="shrink-0 self-start rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-[12px] font-bold uppercase tracking-[0.1em] text-slate-300 transition hover:bg-white/10 md:self-auto"
            >
              View All Projects
            </Link>
          )}
        </div>

        {/* Projects grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((project) => (
            <article
              key={project.id}
              className={`group relative overflow-hidden rounded-2xl border ${project.border} bg-gradient-to-br ${project.accent} p-6 transition hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Category badge */}
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${project.badge}`}
              >
                {project.category}
              </span>

              <h3 className="mt-4 text-lg font-black tracking-tight text-white">{project.title}</h3>

              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                📍 {project.location}
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">{project.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
