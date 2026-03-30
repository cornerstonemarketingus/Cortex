"use client";

import { useRouter } from "next/navigation";

const LIB = [
  { id: 'framing-contractor', label: 'Framing contractor', summary: 'Website, pipeline, and estimate-ready demo.' },
  { id: 'window-door-installer', label: 'Window & Door', summary: 'Service pages and quote follow-up.' },
  { id: 'kitchen-remodeler', label: 'Kitchen remodel', summary: 'Design-to-build pipeline with milestones.' },
  { id: 'landscaping-contractor', label: 'Landscaping', summary: 'Seasonal campaigns and recurring plans.' },
];

export default function TemplatesLibrary() {
  const router = useRouter();

  return (
    <aside className="rounded-2xl border border-white/15 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Templates Library</p>
      <p className="mt-2 text-sm text-slate-300">Browse templates and load them into your workspace.</p>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {LIB.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => router.push(`/workspace?template=${encodeURIComponent(t.id)}`)}
            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-left text-xs hover:bg-white/10"
          >
            <p className="font-semibold text-slate-100">{t.label}</p>
            <p className="mt-1 text-slate-300">{t.summary}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-300">
        <p className="font-semibold text-slate-200">Quick actions</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => router.push('/estimate')} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs">Open Estimator</button>
          <button onClick={() => router.push('/website-builder')} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs">Open Page Builder</button>
          <button onClick={() => router.push('/automations')} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs">Automations</button>
        </div>
      </div>
    </aside>
  );
}
