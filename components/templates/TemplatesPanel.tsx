"use client";

import { useMemo, useState } from "react";

type TemplateCard = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  favorite?: boolean;
};

const sample: TemplateCard[] = [
  { id: "t1", title: "Estimate Follow-up Sequence", description: "Email + SMS follow-ups", category: "Automation", favorite: true },
  { id: "t2", title: "Simple Landing Page", description: "Two-section lead capture", category: "Website" },
  { id: "t3", title: "Lead Nurture Flow", description: "7-touch nurture", category: "Automation" },
  { id: "t4", title: "Appointment Reminder", description: "SMS + calendar sync", category: "Productivity" },
];

export default function TemplatesPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const categories = useMemo(() => ["All", "Automation", "Website", "Productivity"], []);

  const filtered = useMemo(() => {
    return sample.filter((t) => {
      if (favoritesOnly && !t.favorite) return false;
      if (category !== "All" && t.category !== category) return false;
      if (query && !(`${t.title} ${t.description} ${t.category}`).toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, category, favoritesOnly]);

  return (
    <aside className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates..."
            className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100"
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
            Favorites
          </label>
          <button className="rounded-md bg-[var(--brand-600)] px-3 py-2 text-sm font-semibold text-white">Add Template</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <article key={t.id} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">{t.title}</h3>
              <div className="text-xs text-slate-400">{t.category}</div>
            </div>
            <p className="mt-2 text-xs text-slate-300">{t.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-400">Recent</div>
              <div className="flex items-center gap-2">
                <button className="rounded-md bg-slate-700/50 px-2 py-1 text-xs text-white">Use</button>
                <button className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200">Preview</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
