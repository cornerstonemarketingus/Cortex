import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <PublicMarketingNav />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C69C6D] mb-4">TeamBuilder Copilot</p>
        <h1 className="text-4xl font-bold leading-tight md:text-6xl text-white">
          The complete AI platform<br className="hidden md:block" /> for contractors
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-base text-slate-400 leading-relaxed">
          Generate professional estimates in seconds, automate your follow-up workflows,
          and build high-converting pages — all from one AI-powered platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/copilot"
            className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #C69C6D 100%)' }}
          >
            Open Copilot
          </Link>
          <Link
            href="/onboarding"
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── 3 Core Features ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          {/* Estimating */}
          <Link
            href="/estimate"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-[#1E3A5F]/60 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/60 flex items-center justify-center text-xl mb-4">📐</div>
            <p className="text-xs uppercase tracking-widest text-[#C69C6D] font-semibold mb-1">Estimating</p>
            <h2 className="text-lg font-bold text-white mb-2">AI Construction Estimates</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              16 trade templates with per-sqft scaling, materials + labor breakdown, location pricing, and PDF export — ready in seconds.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#C69C6D] group-hover:gap-2 transition-all">
              Start an estimate <span>→</span>
            </div>
          </Link>

          {/* Automations */}
          <Link
            href="/automations"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-emerald-500/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 flex items-center justify-center text-xl mb-4">⚡</div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-1">Automations</p>
            <h2 className="text-lg font-bold text-white mb-2">Smart Workflow Engine</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trigger SMS/email follow-ups, auto-invoice after approval, request reviews on job complete — describe it, Copilot builds it.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:gap-2 transition-all">
              Create a workflow <span>→</span>
            </div>
          </Link>

          {/* Builder */}
          <Link
            href="/json-builder"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-blue-500/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center text-xl mb-4">🏗️</div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">Page Builder</p>
            <h2 className="text-lg font-bold text-white mb-2">Drag-and-Drop Pages</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate contractor landing pages in one prompt — hero, services, testimonials, pricing, contact form — then customize live.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:gap-2 transition-all">
              Build a page <span>→</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Copilot CTA strip ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div
          className="rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: 'linear-gradient(135deg, #0f1f38 0%, #08121e 100%)', border: '1px solid rgba(198,156,109,0.2)' }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-[#C69C6D] mb-1">AI Copilot</p>
            <h3 className="text-xl font-bold text-white">
              Ask Copilot to build anything
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              "Estimate residential framing for 2,400 sqft" or "Build a roofing company page" — done instantly.
            </p>
          </div>
          <Link
            href="/copilot"
            className="flex-shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-white transition whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #C69C6D)' }}
          >
            Open Copilot →
          </Link>
        </div>
      </section>
    </main>
  );
}
