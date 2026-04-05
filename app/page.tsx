import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

// AI Construction Workspace — Estimating, Automations, Builder + Proposals
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

      {/* ── 4 Core Features ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* Estimating */}
          <Link
            href="/copilot"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-[#1E3A5F]/60 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/60 flex items-center justify-center text-xl mb-4">📐</div>
            <p className="text-xs uppercase tracking-widest text-[#C69C6D] font-semibold mb-1">Estimating</p>
            <h2 className="text-lg font-bold text-white mb-2">AI Construction Estimates</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              16 trade templates, per-sqft scaling, materials + labor breakdown, and timeline sequencing — done in seconds.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#C69C6D] group-hover:gap-2 transition-all">
              Start an estimate <span>→</span>
            </div>
          </Link>

          {/* Proposals */}
          <Link
            href="/copilot"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-amber-500/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-900/40 flex items-center justify-center text-xl mb-4">📄</div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">Proposals</p>
            <h2 className="text-lg font-bold text-white mb-2">Client-Ready Proposals</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              From any estimate, generate a printable proposal with scope of work, itemized costs, Gantt timeline, and signature block.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:gap-2 transition-all">
              Generate a proposal <span>→</span>
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
            href="/copilot"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1826] p-6 hover:border-blue-500/30 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-900/40 flex items-center justify-center text-xl mb-4">🏗️</div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">Builder</p>
            <h2 className="text-lg font-bold text-white mb-2">Pages & Apps</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generate contractor landing pages, CRM dashboards, and internal tools from one prompt — then customize live.
            </p>
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:gap-2 transition-all">
              Build something <span>→</span>
            </div>
          </Link>
        </div>
      </section>

    </main>
  );
}
