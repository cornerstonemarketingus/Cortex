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
        </section>
      </div>
    </main>
  );
}
