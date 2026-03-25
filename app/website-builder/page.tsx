"use client";

import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import BuilderCopilotPanel from '@/components/copilot/BuilderCopilotPanel';

export default function WebsiteBuilderPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#020617] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="glass rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Website Builder</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Chat-driven website building</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
            One surface. One copilot. Describe your business and get an 80% complete high-converting website with hosting, chatbot, CRM, and automation setup.
          </p>
        </header>

        <section className="mt-6">
          <BuilderCopilotPanel
            title="Built-in Builder Copilot"
            subtitle="Tell it what to build. It generates pages, flow logic, SEO/GEO structure, chatbot install, and voice receptionist setup steps."
            defaultPrompt="Build me a contractor website with lead capture, CRM pipeline, chatbot embed, voice receptionist setup, and SEO/GEO service pages."
            contextLabel="website-builder"
            showProvisioning
            buildMode="website"
          />
        </section>
      </div>
    </main>
  );
}
