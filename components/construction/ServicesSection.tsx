import Link from 'next/link';

const services = [
  {
    icon: '🏗️',
    title: 'Commercial Construction',
    description:
      'Office complexes, retail centers, industrial facilities, and mixed-use developments built to exacting standards.',
  },
  {
    icon: '🏡',
    title: 'Luxury Residential',
    description:
      'Custom homes and high-end residential builds crafted with premium materials and meticulous attention to detail.',
  },
  {
    icon: '🔨',
    title: 'Renovation & Remodeling',
    description:
      'Transformative renovations that respect the bones of existing structures while delivering a modern, elevated result.',
  },
  {
    icon: '📐',
    title: 'Design-Build',
    description:
      'Integrated design and construction services that streamline delivery, reduce cost, and eliminate coordination gaps.',
  },
  {
    icon: '🏢',
    title: 'Project Management',
    description:
      'Full-service project management from concept through certificate of occupancy, ensuring every milestone is met.',
  },
  {
    icon: '⚡',
    title: 'Tenant Improvements',
    description:
      'Fast-tracked interior fit-outs and tenant improvement work that keeps businesses running with minimal disruption.',
  },
];

export default function ServicesSection() {
  return (
    <section className="relative bg-[#071014] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        {/* Section header */}
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.4em] text-amber-400">
            What We Build
          </p>
          <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
            Full-Spectrum Construction Services
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            From groundbreaking to ribbon cutting, we handle every phase of your project with
            precision, transparency, and professionalism.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-amber-300/30 hover:bg-amber-500/[0.04]"
            >
              <span className="text-3xl" aria-hidden="true">
                {service.icon}
              </span>
              <h3 className="mt-4 text-[15px] font-bold tracking-tight text-white">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{service.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em] text-amber-200 transition hover:bg-amber-500/20"
          >
            Explore All Services
          </Link>
        </div>
      </div>
    </section>
  );
}
