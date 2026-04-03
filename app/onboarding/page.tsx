import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const TRADES = [
  { label: 'Framing', icon: '🪵' },
  { label: 'Roofing', icon: '🏠' },
  { label: 'Windows & Doors', icon: '🪟' },
  { label: 'Electrical', icon: '⚡' },
  { label: 'Plumbing', icon: '🔧' },
  { label: 'HVAC', icon: '❄️' },
  { label: 'Painting', icon: '🖌️' },
  { label: 'Flooring', icon: '🪵' },
  { label: 'Concrete', icon: '🏗️' },
  { label: 'Drywall', icon: '📐' },
  { label: 'Landscaping', icon: '🌿' },
  { label: 'General Contractor', icon: '🔨' },
] as const;

const STEPS = [
  {
    num: '01',
    label: 'Pick your trade',
    description: 'We personalize your estimate templates, automation presets, and page content for your trade.',
  },
  {
    num: '02',
    label: 'Copilot sets it up',
    description: 'Your first estimate template, follow-up automation, and lead-gen page are generated instantly.',
  },
  {
    num: '03',
    label: 'Start winning jobs',
    description: 'Send your first estimate, activate your first automation, and publish your first page — all in minutes.',
  },
] as const;

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-4xl px-6 py-14 md:px-10 space-y-10">

        {/* Header */}
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-[#C69C6D] mb-3">Get Started</p>
          <h1 className="text-3xl font-bold md:text-5xl text-white">
            Set up your contractor workspace
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-sm text-slate-400 leading-relaxed">
            TeamBuilderCopilot configures your estimating, automations, and page builder
            around your trade — ready in under 3 minutes.
          </p>
        </header>

        {/* How it works */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-white/8 bg-[#0d1826] p-5"
            >
              <p className="text-3xl font-black text-[#1E3A5F] mb-3">{step.num}</p>
              <h3 className="text-sm font-semibold text-white mb-1">{step.label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </section>

        {/* Trade picker */}
        <section className="rounded-2xl border border-[#C69C6D]/20 bg-[#0d1826] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#C69C6D] font-semibold mb-1">Step 1</p>
          <h2 className="text-lg font-bold text-white mb-4">What's your trade?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {TRADES.map((trade) => (
              <Link
                key={trade.label}
                href={`/copilot?trade=${encodeURIComponent(trade.label)}`}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/4 px-3 py-3 text-sm font-medium text-slate-200 hover:border-[#C69C6D]/40 hover:bg-[#1E3A5F]/30 transition"
              >
                <span className="text-base">{trade.icon}</span>
                {trade.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Don't see yours? <Link href="/copilot" className="text-[#C69C6D] hover:underline">Open Copilot</Link> and describe your trade — it handles any specialty.
          </p>
        </section>

        {/* 3 product CTAs */}
        <section>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold mb-4 text-center">Or jump straight in</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/estimate"
              className="rounded-xl border border-white/10 bg-[#0d1826] p-5 hover:border-[#1E3A5F]/60 transition group"
            >
              <div className="text-2xl mb-2">📐</div>
              <h3 className="font-semibold text-white text-sm">Run your first estimate</h3>
              <p className="mt-1 text-xs text-slate-400">Materials, labor, overhead, profit — all in one bid.</p>
              <p className="mt-3 text-xs font-semibold text-[#C69C6D] group-hover:translate-x-0.5 transition">Start estimating →</p>
            </Link>

            <Link
              href="/automations"
              className="rounded-xl border border-white/10 bg-[#0d1826] p-5 hover:border-emerald-500/30 transition group"
            >
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-white text-sm">Activate your first automation</h3>
              <p className="mt-1 text-xs text-slate-400">Missed call → SMS reply. Estimate approved → auto-invoice.</p>
              <p className="mt-3 text-xs font-semibold text-emerald-400 group-hover:translate-x-0.5 transition">Set up automation →</p>
            </Link>

            <Link
              href="/json-builder"
              className="rounded-xl border border-white/10 bg-[#0d1826] p-5 hover:border-blue-500/30 transition group"
            >
              <div className="text-2xl mb-2">🏗️</div>
              <h3 className="font-semibold text-white text-sm">Build your first page</h3>
              <p className="mt-1 text-xs text-slate-400">Hero, services, testimonials, contact form — drag and drop live.</p>
              <p className="mt-3 text-xs font-semibold text-blue-400 group-hover:translate-x-0.5 transition">Open builder →</p>
            </Link>
          </div>
        </section>

        {/* Copilot shortcut */}
        <div className="text-center">
          <Link
            href="/copilot"
            className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #C69C6D 100%)' }}
          >
            ✦ Just open Copilot and tell it what you need
          </Link>
        </div>
      </div>
    </main>
  );
}

