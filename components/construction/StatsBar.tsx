const stats = [
  { value: '25+', label: 'Years of Experience' },
  { value: '500+', label: 'Projects Completed' },
  { value: '98%', label: 'Client Satisfaction' },
  { value: '$2B+', label: 'Project Value Delivered' },
];

export default function StatsBar() {
  return (
    <section className="border-y border-white/10 bg-[#0b0d12]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="text-3xl font-black tracking-tight text-amber-400 md:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
