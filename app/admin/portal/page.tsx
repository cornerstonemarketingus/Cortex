import Link from 'next/link';

export default function AdminPortalPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#071638] via-[#0a2a63] to-[#081739] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Admin Portal</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Protected Admin Controls</h1>
          <p className="mt-3 text-sm text-slate-300">
            Self-coding and system execution tools are available only to authenticated admins.
          </p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/devboard?tab=build-cortex"
            className="rounded-2xl border border-cyan-300/30 bg-cyan-500/12 p-5 hover:bg-cyan-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Self-Coding Agent</p>
            <h2 className="mt-2 text-xl font-semibold">Open Self-Builder Console</h2>
            <p className="mt-2 text-sm text-slate-300">Run propose/apply workflows with guardrails and admin session protection.</p>
          </Link>

          <Link
            href="/devboard?tab=agents"
            className="rounded-2xl border border-blue-300/30 bg-blue-500/12 p-5 hover:bg-blue-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200">Agent Runner</p>
            <h2 className="mt-2 text-xl font-semibold">Open Agent Operations</h2>
            <p className="mt-2 text-sm text-slate-300">Manage protected runtime agents and execution diagnostics.</p>
          </Link>

          <Link
            href="/devboard?tab=builders"
            className="rounded-2xl border border-violet-300/30 bg-violet-500/12 p-5 hover:bg-violet-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-violet-200">Copilot Operations</p>
            <h2 className="mt-2 text-xl font-semibold">Software Optimization Loop</h2>
            <p className="mt-2 text-sm text-slate-300">Run approved self-improvement passes for product quality, conversion, and reliability.</p>
          </Link>

          <Link
            href="/blog"
            className="rounded-2xl border border-emerald-300/30 bg-emerald-500/12 p-5 hover:bg-emerald-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Content Engine</p>
            <h2 className="mt-2 text-xl font-semibold">Blog + SEO Automation</h2>
            <p className="mt-2 text-sm text-slate-300">Create posts, configure weekly schedules, and run publishing from one panel.</p>
          </Link>

          <Link
            href="/workspace"
            className="rounded-2xl border border-amber-300/30 bg-amber-500/12 p-5 hover:bg-amber-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Workspace Editor</p>
            <h2 className="mt-2 text-xl font-semibold">Direct Website / App Edits</h2>
            <p className="mt-2 text-sm text-slate-300">Regenerate sections, adjust CRM schema, and update automations via workspace commands.</p>
          </Link>

          <Link
            href="/chat"
            className="rounded-2xl border border-sky-300/30 bg-sky-500/12 p-5 hover:bg-sky-500/20"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200">Strategy Copilot</p>
            <h2 className="mt-2 text-xl font-semibold">Copilot Strategy Chat</h2>
            <p className="mt-2 text-sm text-slate-300">Get execution-ready growth and engineering plans mapped to your product surfaces.</p>
          </Link>
        </section>

        <section className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Recommended Weekly Sequence</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4 text-sm text-amber-50/90">
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">1. Run estimate + pipeline diagnostics.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">2. Apply one conversion-focused automation upgrade.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">3. Publish one local SEO blog article.</div>
            <div className="rounded-lg border border-amber-200/25 bg-black/25 p-3">4. Deploy one landing page copy improvement.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
