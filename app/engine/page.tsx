import Link from 'next/link';
import { getPreferredProductHost } from '@/lib/subdomains';

const hierarchy = [
  {
    id: 'engine',
    title: 'Engine',
    description: 'Core runtime: auth, tenancy, billing, AI orchestration, and shared data model.',
    href: '/dashboard',
    cta: 'Open Engine Dashboard',
  },
  {
    id: 'builder',
    title: 'Builder',
    description: 'Website/app/business builders that turn ideas into production-ready surfaces.',
    href: '/website-builder',
    cta: 'Open Builder Layer',
  },
  {
    id: 'automations',
    title: 'Automations',
    description: 'Lead capture, nurture, and conversion workflows with AI-assisted execution.',
    href: '/ai-automation-solutions',
    cta: 'Open Automation Layer',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    description: 'External services and connectors that complete delivery and monetization loops.',
    href: '/marketplace',
    cta: 'Open Integration Layer',
  },
];

export default function EnginePage() {
  const subdomainRows = [
    {
      product: 'Bid Build',
      host: getPreferredProductHost('tradesos'),
      route: '/tradesos',
      verb: 'Run jobs',
    },
    {
      product: 'AIBoost',
      host: getPreferredProductHost('autoflow'),
      route: '/autoflow',
      verb: 'Automate',
    },
    {
      product: 'Cortex',
      host: getPreferredProductHost('creatoros'),
      route: '/creatoros',
      verb: 'Build',
    },
    {
      product: 'Cortex Engine',
      host: getPreferredProductHost('engine'),
      route: '/engine',
      verb: 'Operate core',
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#041338] via-[#0a245f] to-[#061433] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">System Architecture</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Engine to Integrations Hierarchy</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Keep UI clean by navigating from core platform to builder surfaces, then automations, then integration controls.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {hierarchy.map((layer, index) => (
            <article key={layer.id} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Step {index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold text-blue-100">{layer.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{layer.description}</p>
              <Link
                href={layer.href}
                className="mt-4 inline-flex rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-2 text-xs font-semibold hover:bg-blue-500/30"
              >
                {layer.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
          <h2 className="text-xl font-semibold text-cyan-100">Subdomain Model</h2>
          <p className="mt-2 text-sm text-cyan-50/90">
            Cortex remains the primary engine site. Product subdomains map into standalone product dashboards via middleware routing.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/10 text-slate-100">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Host</th>
                  <th className="px-3 py-2">Route Prefix</th>
                  <th className="px-3 py-2">Primary Verb</th>
                </tr>
              </thead>
              <tbody>
                {subdomainRows.map((row, index) => (
                  <tr key={row.product} className={index % 2 === 0 ? 'bg-black/20' : 'bg-black/35'}>
                    <td className="px-3 py-2 font-semibold text-slate-100">{row.product}</td>
                    <td className="px-3 py-2 text-slate-200">{row.host}</td>
                    <td className="px-3 py-2 text-slate-200">{row.route}</td>
                    <td className="px-3 py-2 text-slate-300">{row.verb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
