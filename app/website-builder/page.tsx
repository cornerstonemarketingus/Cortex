"use client";

import { useMemo, useEffect, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import BuilderCoppilotPanel from '@/components/copilot/BuilderCopilotPanel';

export default function WebsiteBuilderPage() {
  const [promptParam, setPromptParam] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      setPromptParam(sp.get('prompt') || '');
    }
  }, []);

  const defaultPrompt = useMemo(() => {
    return promptParam || 'Build me a contractor website with lead capture, CRM pipeline, chatbot embed, voice receptionist setup, and SEO/GEO service pages.';
  }, [promptParam]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2c1205] via-[#4a1d0a] to-[#140704] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="glass rounded-3xl border border-amber-300/35 bg-amber-500/10 p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Page Builder</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Chat-driven page and app building</h1>
          <p className="mt-3 max-w-3xl text-sm text-amber-50/90 md:text-base">
            One surface. One copilot. Describe your business and get an 80% complete high-converting website with hosting, chatbot, CRM, and automation setup.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <a href="/automations" className="rounded-lg border border-amber-300/45 bg-amber-400/20 px-3 py-2 font-semibold hover:bg-amber-400/30">Open Automations Hub</a>
            <a href="/dashboard" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-semibold hover:bg-white/20">Open Revenue Dashboard</a>
          </div>
        </header>

        <section className="mt-6">
          <BuilderCoppilotPanel
            title="Built-in Builder Copilot"
            subtitle="Tell it what to build. It generates pages, flow logic, SEO/GEO structure, chatbot install, and voice receptionist setup steps."
            defaultPrompt={defaultPrompt}
            contextLabel="website-builder"
            showProvisioning
            buildMode="website"
          />
        </section>
      </div>
    </main>
  );
}
