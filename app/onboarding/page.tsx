import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

const intents = ['Get more leads', 'Estimate jobs', 'Manage crews', 'Build a website'] as const;
const templates = [
  'Framing',
  'Windows & Doors',
  'Roofing',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Painting',
  'Flooring',
  'Concrete',
  'Landscaping',
  'Kitchen Remodel',
  'Bath Remodel',
  'Siding',
  'Drywall',
  'Masonry',
  'Fencing',
  'Solar',
  'Excavation',
  'Garage Door',
  'Builder / Investor',
] as const;
const activation = ['Upload your first plan', 'Add your first job', 'Send your first bid'] as const;

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#020617] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 space-y-6">
        <header className="rounded-3xl border border-cyan-300/30 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Onboarding Router</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Business-in-a-box activation</h1>
          <p className="mt-3 max-w-3xl text-sm text-cyan-50/90">
            Chat-first onboarding inspired by Base44: choose intent, auto-generate assets, then activate with guided tasks.
          </p>
        </header>

        <section className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Step 1: What are you trying to do?</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            {intents.map((intent) => (
              <Link key={intent} href={`/workspace?goal=${encodeURIComponent(intent)}`} className="rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-center text-xs font-semibold hover:bg-cyan-500/25">
                {intent}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Step 2: AI builds everything</p>
          <p className="mt-2 text-sm text-slate-300">Immediately generate website, CRM, estimate defaults, pipeline, sample leads, and automations from one trade template.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
            {templates.map((template) => (
              <div key={template} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">{template}</div>
            ))}
          </div>
          <Link href="/workspace" className="mt-3 inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">
            Open Instant Internal Copilot Workspace
          </Link>
        </section>

        <section className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Step 3: Guided activation</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {activation.map((task) => (
              <div key={task} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-slate-200">{task}</div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/15 bg-black/25 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Step 4: Pre-built templates</p>
          <p className="mt-2 text-sm text-slate-300">Use trade templates first, then let copilot regenerate blocks, estimate defaults, and automations.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Framing</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Windows & Doors</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Builder / Investor</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Roofing</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Electrical</Link>
            <Link href="/workspace" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Plumbing</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
