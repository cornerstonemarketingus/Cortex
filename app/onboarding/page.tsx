import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const options = [
  {
    title: 'Get More Jobs',
    subtitle: 'Bid Build',
    summary: 'Estimating, pipeline, scheduling, and reputation workflows for trades businesses.',
    href: '/bid-build',
    cta: 'Go To Bid Build',
  },
  {
    title: 'Automate My Business',
    subtitle: 'Builder Copilot',
    summary: 'CRM, workflows, messaging, funnels, and AI agents for lead-to-close automation.',
    href: '/builder-copilot',
    cta: 'Go To Builder Copilot',
  },
  {
    title: 'Build Apps / Websites / Games',
    subtitle: 'Cortex',
    summary: 'AI builder product with templates, hosting, and domain lifecycle in one place.',
    href: '/cortex',
    cta: 'Go To Cortex Builder',
  },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#04123a] via-[#0a255f] to-[#061838] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Onboarding Router</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">What Are You Trying To Do?</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90">
            Choose one goal to prevent confusion and enter the right product immediately.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {options.map((option) => (
            <article key={option.title} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{option.subtitle}</p>
              <h2 className="mt-2 text-xl font-semibold">{option.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{option.summary}</p>
              <Link
                href={option.href}
                className="mt-4 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold hover:bg-cyan-500/30"
              >
                {option.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
