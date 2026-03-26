"use client";

import { useMemo, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import type { AppAction, AppModel, TemplateId } from '@/lib/copilot/appModel';
import { createTemplateModel } from '@/lib/copilot/appModel';

type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const templates: Array<{ id: TemplateId; label: string; summary: string }> = [
  {
    id: 'framing-contractor',
    label: 'Framing contractor template',
    summary: 'Framing-focused website, pipeline, and estimate-ready demo setup.',
  },
  {
    id: 'window-door-installer',
    label: 'Window/door installer template',
    summary: 'Service pages, lead routing, and quote follow-up workflow.',
  },
  {
    id: 'builder-investor',
    label: 'Builder/investor template',
    summary: 'High-ticket lead handling, project pipeline, and growth automation.',
  },
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const parsed = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(parsed.error || `Request failed (${response.status})`);
  }

  return parsed as T;
}

export default function WorkspacePage() {
  const [goal, setGoal] = useState('Get more leads');
  const [model, setModel] = useState<AppModel | null>(null);
  const [activePageId, setActivePageId] = useState('home');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Ask Copilot is active. I can add sections, leads, and demo jobs instantly.' },
  ]);
  const [chatInput, setChatInput] = useState('Add testimonials section under services with 3 reviews.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePage = useMemo(() => model?.pages.find((page) => page.id === activePageId) || model?.pages[0] || null, [model, activePageId]);

  const initialize = (templateId: TemplateId) => {
    const next = createTemplateModel(templateId);
    setModel(next);
    setActivePageId(next.pages[0]?.id || 'home');
  };

  const runChatCommand = async () => {
    if (!chatInput.trim() || !model || loading) return;

    const prompt = chatInput.trim();
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text: prompt }]);
    setError(null);
    setLoading(true);

    try {
      const command = await postJson<{ action: AppAction | null; guidance?: string }>('/api/copilot/command', {
        message: prompt,
        pageId: activePageId,
      });

      if (!command.action) {
        const guidance = command.guidance || 'I could not map that command yet.';
        setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: guidance }]);
        return;
      }

      const action = command.action;

      const executed = await postJson<{ model: AppModel }>('/api/copilot/action', {
        model,
        action,
      });

      setModel(executed.model);
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: `Done. Executed action: ${action.type}` }]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run command.');
    } finally {
      setLoading(false);
      setChatInput('');
    }
  };

  return (
    <main className="min-h-screen bg-[#090f18] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        <header className="rounded-2xl border border-white/15 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Builder Copilot Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">Chat-driven building and CRM operations</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {['Get more leads', 'Estimate jobs', 'Manage crews', 'Build a website'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGoal(item)}
                className={`rounded-lg border px-3 py-1.5 ${goal === item ? 'border-cyan-200/70 bg-cyan-500/20 text-cyan-50' : 'border-white/20 bg-white/5 text-slate-200'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-300">Current goal: {goal}. Step 2 instant build creates website, CRM, pipeline, sample leads, and demo project.</p>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
          <aside className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Navigation</p>
            <div className="mt-3 space-y-2 text-sm">
              {['Dashboard', 'Leads', 'CRM', 'Jobs', 'AI Tools', 'Website'].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{item}</div>
              ))}
            </div>

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-cyan-200">Templates</p>
            <div className="mt-2 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => initialize(template.id)}
                  className="w-full rounded-lg border border-cyan-300/35 bg-cyan-500/12 p-2 text-left text-xs hover:bg-cyan-500/18"
                >
                  <p className="font-semibold text-cyan-100">{template.label}</p>
                  <p className="mt-1 text-slate-300">{template.summary}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-lg border border-amber-300/35 bg-amber-500/12 p-3 text-xs text-amber-100">
              Guided activation:
              <p className="mt-1">1. Upload your first plan</p>
              <p>2. Add your first job</p>
              <p>3. Send your first bid</p>
            </div>
          </aside>

          <section className="rounded-2xl border border-white/15 bg-black/25 p-4">
            {!model ? (
              <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-sm text-slate-300">
                Choose a template to instantly generate website, CRM, pipeline, sample leads, and a demo project.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Business Profile</p>
                  <p className="mt-1 text-sm">{model.business_profile.name} - {model.business_profile.location}</p>
                  <p className="mt-1 text-xs text-slate-300">Services: {model.business_profile.services.join(', ')}</p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Website (Live Block Canvas)</p>
                  {activePage ? (
                    <div className="mt-2 space-y-2">
                      {activePage.sections.map((section) => (
                        <article key={section.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-xs text-cyan-100">{section.type.toUpperCase()}</p>
                          <h3 className="mt-1 text-sm font-semibold">{section.title}</h3>
                          <p className="mt-1 text-xs text-slate-300">{section.content}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">CRM Pipeline</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {model.crm.pipeline.map((stage) => (
                        <p key={stage.id}>{stage.name}: {stage.count}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Demo Project</p>
                    <p className="mt-2 text-sm">{model.demo_project.title}</p>
                    <p className="mt-1 text-xs text-slate-300">Estimate: ${model.demo_project.estimate.toLocaleString()} | Margin: {(model.demo_project.margin * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Ask Copilot</p>
            <div className="mt-3 h-[460px] overflow-y-auto rounded-lg border border-white/10 bg-black/25 p-3 space-y-2">
              {messages.map((message) => (
                <article key={message.id} className={`rounded-lg border p-2 text-xs ${message.role === 'user' ? 'border-cyan-300/30 bg-cyan-500/12' : 'border-white/15 bg-white/5'}`}>
                  {message.text}
                </article>
              ))}
            </div>

            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="mt-3 min-h-20 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
              placeholder="Example: Add testimonials section under services with 3 reviews"
            />

            <button
              type="button"
              onClick={() => void runChatCommand()}
              disabled={loading || !model}
              className="mt-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? 'Running...' : 'Run Command'}
            </button>

            {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
          </aside>
        </section>
      </div>
    </main>
  );
}
