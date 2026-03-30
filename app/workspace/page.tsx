"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import WorkspaceCopilot from '@/components/workspace/WorkspaceCopilot';
import TemplatesLibrary from '@/components/workspace/TemplatesLibrary';
import type { AppAction, AppModel, TemplateId } from '@/lib/copilot/appModel';
import { createTemplateModel } from '@/lib/copilot/appModel';
import type { CopilotMode } from '@/lib/copilot/actionEngine';

type CopilotMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type CopilotCommandResponse = {
  mode: CopilotMode;
  intent: string;
  actions: AppAction[];
  discussion?: string;
  preview?: {
    summary: string;
    impact: string;
  };
  requires_confirmation?: boolean;
  confidence?: number;
  ui_feedback: {
    message: string;
    highlight?: string;
  };
  suggestions: string[];
};

type Revision = {
  id: number;
  label: string;
  createdAt: string;
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
  {
    id: 'electrical-contractor',
    label: 'Electrical template',
    summary: 'Panel/service upgrade funnel with permit-friendly estimate defaults.',
  },
  {
    id: 'plumbing-contractor',
    label: 'Plumbing template',
    summary: 'Emergency lead response and maintenance plan conversion flows.',
  },
  {
    id: 'hvac-contractor',
    label: 'HVAC template',
    summary: 'Seasonal campaigns, service memberships, and replacement estimates.',
  },
  {
    id: 'painting-contractor',
    label: 'Painting template',
    summary: 'Interior/exterior quote packs with upsell automation.',
  },
  {
    id: 'flooring-contractor',
    label: 'Flooring template',
    summary: 'Material-first estimate builder and showroom follow-up automations.',
  },
  {
    id: 'landscaping-contractor',
    label: 'Landscaping template',
    summary: 'Seasonal service bundles, recurring plans, and route optimization.',
  },
  {
    id: 'concrete-contractor',
    label: 'Concrete template',
    summary: 'Flatwork/foundation estimating with schedule-based reminders.',
  },
  {
    id: 'kitchen-remodeler',
    label: 'Kitchen remodel template',
    summary: 'Design-to-build pipeline with milestone payments and change orders.',
  },
];

// AI team panel removed from UI; AI team functionality remains available programmatically.

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
  const router = useRouter();
  const [goal, setGoal] = useState('Get more leads');
  const [ownerKey, setOwnerKey] = useState('default-user');
  const [model, setModel] = useState<AppModel | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [activePageId, setActivePageId] = useState('home');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Internal Copilot is active. I can update estimates, automations, sections, and CRM instantly.' },
  ]);
  const [chatInput, setChatInput] = useState('Add testimonials section under services with 3 reviews.');
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>(['Build my website', 'Create estimate for a deck', 'Turn on autopilot']);
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('EXECUTE');
  const [pendingConfirmActions, setPendingConfirmActions] = useState<AppAction[]>([]);
  const [pendingConfirmSummary, setPendingConfirmSummary] = useState<string | null>(null);
  const [lastDiscussMessage, setLastDiscussMessage] = useState<string | null>(null);
  const [showGuideRail, setShowGuideRail] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const activePage = useMemo(() => model?.pages.find((page) => page.id === activePageId) || model?.pages[0] || null, [model, activePageId]);

  const guideSteps = useMemo(() => {
    const hasTemplate = Boolean(model);
    const hasEstimate = Boolean((model?.estimates || []).length > 0);
    const hasAutopilot = Boolean(model?.automations.some((item) => item.autopilot));
    const hasPipelineGrowth = Boolean((model?.crm.leads || []).length >= 3);

    return [
      { id: 'template', label: 'Load a trade template', done: hasTemplate },
      { id: 'estimate', label: 'Create first estimate draft', done: hasEstimate },
      { id: 'autopilot', label: 'Turn on autopilot workflows', done: hasAutopilot },
      { id: 'lead', label: 'Add a new lead to pipeline', done: hasPipelineGrowth },
    ];
  }, [model]);

  const loadWorkspaceState = async (userKey: string) => {
    try {
      setLoadingState(true);
      const response = await fetch(`/api/workspace/state?ownerKey=${encodeURIComponent(userKey)}`, { cache: 'no-store' });
      const parsed = (await response.json().catch(() => ({}))) as {
        workspace?: { model?: AppModel } | null;
        revisions?: Revision[];
      };
      if (response.ok) {
        setModel(parsed.workspace?.model || null);
        setRevisions(parsed.revisions || []);
      }
    } catch {
      // Ignore initial load failures and allow template-first flow.
    } finally {
      setLoadingState(false);
    }
  };

  const saveWorkspaceState = async (nextModel: AppModel, label: string) => {
    await postJson('/api/workspace/state', {
      ownerKey,
      model: nextModel,
      label,
    });
    await loadWorkspaceState(ownerKey);
  };

  useEffect(() => {
    const userKey = window.localStorage.getItem('buildercopilot.ownerKey') || 'default-user';
    setOwnerKey(userKey);
    void loadWorkspaceState(userKey);

    const params = new URLSearchParams(window.location.search);
    if (params.get('guide') === 'demo') {
      setShowGuideRail(true);
    }
  }, []);

  const initialize = async (templateId: TemplateId) => {
    const next = createTemplateModel(templateId);
    setModel(next);
    setActivePageId(next.pages[0]?.id || 'home');
    await saveWorkspaceState(next, `template-${templateId}`);
  };

  const routePromptIntent = (promptText: string) => {
    const prompt = promptText.trim();
    if (!prompt) return false;

    const lowered = prompt.toLowerCase();
    if (lowered.includes('estimate') || lowered.includes('quote') || lowered.includes('plans') || lowered.includes('takeoff')) {
      router.push(`/estimate?prompt=${encodeURIComponent(prompt)}`);
      return true;
    }

    if (lowered.includes('page') || lowered.includes('website') || lowered.includes('landing')) {
      router.push(`/builder?prompt=${encodeURIComponent(prompt)}&blueprint=website`);
      return true;
    }

    if (lowered.includes('automation') || lowered.includes('follow-up') || lowered.includes('autopilot') || lowered.includes('pipeline')) {
      router.push(`/automations?prompt=${encodeURIComponent(prompt)}`);
      return true;
    }

    return false;
  };

  const runCopilotCommandCenter = async () => {
    const prompt = chatInput.trim();
    if (!prompt || loading) return;

    if (routePromptIntent(prompt)) {
      return;
    }

    await runChatCommand(prompt);
  };

  const runChatCommand = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? chatInput).trim();
    if (!prompt || !model || loading) return;
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text: prompt }]);
    setError(null);
    setLoading(true);

    try {
      const command = await postJson<CopilotCommandResponse>('/api/copilot/command', {
        message: prompt,
        mode: copilotMode,
        context: {
          currentPage: activePageId,
        },
      });

      const typedCommand = command;

      if (typedCommand.mode === 'DISCUSS') {
        setLastDiscussMessage(prompt);
        setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: typedCommand.discussion || typedCommand.ui_feedback?.message || 'Discuss mode response ready.' }]);
        setCopilotSuggestions(typedCommand.suggestions || []);
        return;
      }

      if (typedCommand.mode === 'CONFIRM') {
        setPendingConfirmActions(typedCommand.actions || []);
        setPendingConfirmSummary(typedCommand.preview?.summary || typedCommand.ui_feedback.message);
        setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: `${typedCommand.ui_feedback.message}\n${typedCommand.preview?.summary || ''}`.trim() }]);
        setCopilotSuggestions(typedCommand.suggestions || []);
        return;
      }

      if (!typedCommand.actions?.length) {
        setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: typedCommand.ui_feedback?.message || 'No action returned.' }]);
        setCopilotSuggestions(typedCommand.suggestions || []);
        return;
      }

      const executed = await postJson<{ model: AppModel }>('/api/copilot/action', {
        model,
        actions: typedCommand.actions,
      });

      setModel(executed.model);
      await saveWorkspaceState(executed.model, `intent-${typedCommand.intent.toLowerCase()}`);
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: typedCommand.ui_feedback.message }]);
      setCopilotSuggestions(typedCommand.suggestions || []);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to run command.');
    } finally {
      setLoading(false);
      if (copilotMode !== 'DISCUSS' && !promptOverride) {
        setChatInput('');
      }
    }
  };

  const runPendingConfirmation = async () => {
    if (!model || pendingConfirmActions.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const executed = await postJson<{ model: AppModel }>('/api/copilot/action', {
        model,
        actions: pendingConfirmActions,
      });
      setModel(executed.model);
      await saveWorkspaceState(executed.model, 'confirmed-actions');
      setMessages((current) => [...current, { id: `a-${Date.now()}`, role: 'assistant', text: 'Confirmed and executed staged actions.' }]);
      setPendingConfirmActions([]);
      setPendingConfirmSummary(null);
      setCopilotMode('EXECUTE');
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to execute confirmed actions.');
    } finally {
      setLoading(false);
    }
  };

  const convertDiscussToAction = async () => {
    if (!lastDiscussMessage) return;
    setCopilotMode('EXECUTE');
    setChatInput(lastDiscussMessage);
  };

  const regenerateSection = async (sectionId: string) => {
    if (!model || !activePage) return;

    const target = activePage.sections.find((section) => section.id === sectionId);
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const regenerated = await postJson<{ content: string }>('/api/workspace/section/regenerate', {
        sectionType: target.type,
        title: target.title,
        currentContent: target.content,
        businessName: model.business_profile.name,
        services: model.business_profile.services,
      });

      const executed = await postJson<{ model: AppModel }>('/api/copilot/action', {
        model,
        action: {
          type: 'update_section_text',
          pageId: activePage.id,
          sectionId,
          content: regenerated.content,
        } as AppAction,
      });

      setModel(executed.model);
      await saveWorkspaceState(executed.model, `regenerate-section-${sectionId}`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to regenerate section.');
    } finally {
      setLoading(false);
    }
  };

  const rollbackToRevision = async (revisionId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/workspace/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerKey, revisionId }),
      });
      const parsed = (await response.json().catch(() => ({}))) as { model?: AppModel; error?: string };
      if (!response.ok || !parsed.model) {
        throw new Error(parsed.error || `Rollback failed (${response.status})`);
      }

      setModel(parsed.model);
      await loadWorkspaceState(ownerKey);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to rollback revision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#7c2d12_0%,#3f160a_44%,#110603_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        <header className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Internal Copilot Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">Chat-driven estimates and automation operations</h1>
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
          <p className="mt-3 text-sm text-amber-100/90">Current goal: {goal}. Instant setup generates website, CRM, estimate defaults, pipeline stages, and automations.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/dashboard" className="rounded-lg border border-amber-300/45 bg-amber-400/20 px-3 py-2 font-semibold hover:bg-amber-400/30">Open Unified Dashboard View</Link>
            <Link href="/automations" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-semibold hover:bg-white/20">Open Automations Hub</Link>
            <button
              type="button"
              onClick={() => setShowSidebar((current) => !current)}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 font-semibold hover:bg-cyan-500/25"
            >
              {showSidebar ? 'Hide Navigation' : 'Show Navigation'}
            </button>
          </div>
        </header>

        {/* Workspace split: Copilot (left) and Templates (right) */}
        <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <WorkspaceCopilot defaultPrompt={"Create an estimate for a residential build"} />
          </div>
          <div>
            <TemplatesLibrary />
          </div>
        </section>

        <section className="mt-5 min-h-[60vh] rounded-3xl border border-amber-300/30 bg-black/30 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Copilot Operating System</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-5xl">Tell me what you want to build, estimate, or automate</h2>
          <p className="mt-3 max-w-3xl text-sm text-amber-100/90 md:text-base">Type a command once and Builder Copilot routes you to the right tool with prefilled context.</p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 md:p-5">
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-sm"
              placeholder="Describe your project, and I'll build it for you"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runCopilotCommandCenter()}
                disabled={loading}
                className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
              >
                {loading ? 'Working...' : 'Run With Copilot'}
              </button>
              <button type="button" onClick={() => setChatInput('Create an estimate for a residential build')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Start Estimate</button>
              <button type="button" onClick={() => setChatInput('Build a landing page for my construction business')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Build a Page</button>
              <button type="button" onClick={() => setChatInput('Create a lead follow-up automation with day 1 day 3 day 7 sequence')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Create Automation</button>
              <button type="button" onClick={() => router.push('/estimate')} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Upload Plans</button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-50">
              Suggested prompts:
              <p className="mt-1">- Create an estimate for a residential build</p>
              <p>- Build a landing page for framing services</p>
              <p>- Set up a lead follow-up system</p>
            </div>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-3 text-xs text-cyan-50">
              AI-first rule:
              <p className="mt-1">User types → system routes → work starts instantly.</p>
            </div>
          </div>
        </section>

        {/* AI Team panel hidden from workspace UI; assignment and automation tooling remain available programmatically */}

        {showGuideRail ? (
          <section className="mt-4 rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Start Here Guide</p>
                <p className="mt-1 text-sm text-cyan-50/90">Follow this checklist so you always know what to do next.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideRail(false)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/20"
              >
                Hide Guide
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
              {guideSteps.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-xs">
                  <p className="text-slate-300">Step {index + 1}</p>
                  <p className="mt-1 font-semibold text-slate-100">{item.label}</p>
                  <p className={`mt-1 ${item.done ? 'text-emerald-200' : 'text-amber-200'}`}>{item.done ? 'Completed' : 'Pending'}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => void initialize('framing-contractor')}
                className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 font-semibold hover:bg-cyan-500/30"
              >
                1) Load Framing Template
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopilotMode('EXECUTE');
                  void runChatCommand('Create estimate for a deck');
                }}
                disabled={!model || loading}
                className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 font-semibold hover:bg-amber-500/30 disabled:opacity-60"
              >
                2) Create Estimate Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopilotMode('EXECUTE');
                  void runChatCommand('Turn on autopilot');
                }}
                disabled={!model || loading}
                className="rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 font-semibold hover:bg-emerald-500/30 disabled:opacity-60"
              >
                3) Turn On Autopilot
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopilotMode('EXECUTE');
                  void runChatCommand('Add lead');
                }}
                disabled={!model || loading}
                className="rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 font-semibold hover:bg-indigo-500/30 disabled:opacity-60"
              >
                4) Add Pipeline Lead
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowGuideRail(true)}
              className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25"
            >
              Show Start Here Guide
            </button>
          </div>
        )}

        <section className={`mt-5 grid grid-cols-1 gap-4 ${showSidebar ? 'xl:grid-cols-[260px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[minmax(0,1fr)_340px]'}`}>
          {showSidebar ? (
          <aside className="rounded-2xl border border-white/15 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Navigation</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Link href="/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">Dashboard</Link>
              <Link href="/estimate" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">Estimator</Link>
              <Link href="/automations" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">Automations</Link>
              <Link href="/builder" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">Page Builder</Link>
            </div>

            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Trade Templates</p>
            <div className="mt-2 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => void initialize(template.id)}
                  className="w-full rounded-lg border border-cyan-300/35 bg-cyan-500/12 p-2 text-left text-xs hover:bg-cyan-500/18"
                >
                  <p className="font-semibold text-cyan-100">{template.label}</p>
                  <p className="mt-1 text-slate-300">{template.summary}</p>
                </button>
              ))}
            </div>

            {/* Guided activation removed from UI to reduce clutter. Use Copilot to start workflows instead. */}

            <div className="mt-5 rounded-lg border border-white/15 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Revisions</p>
              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto text-xs text-slate-300">
                {revisions.length === 0 ? <p>No revisions yet.</p> : null}
                {revisions.map((revision) => (
                  <button
                    key={revision.id}
                    type="button"
                    onClick={() => void rollbackToRevision(revision.id)}
                    className="w-full rounded border border-white/10 bg-black/25 px-2 py-1 text-left hover:bg-black/35"
                  >
                    <p className="text-cyan-100">{revision.label}</p>
                    <p>{new Date(revision.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>
          ) : null}

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
                          <button
                            type="button"
                            onClick={() => void regenerateSection(section.id)}
                            className="mt-2 rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/20"
                          >
                            Regenerate Section
                          </button>
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

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Estimator Intelligence</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {(model.estimates || []).slice(0, 3).map((estimate) => (
                        <p key={estimate.id}>{estimate.projectType}: ${estimate.budget.toLocaleString()} ({estimate.confidence} confidence)</p>
                      ))}
                      {(model.estimates || []).length === 0 ? <p>No estimate drafts yet.</p> : null}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Autopilot Status</p>
                    <p className="mt-2 text-xs text-slate-300">
                      {model.automations.some((item) => item.autopilot)
                        ? 'Enabled: lead qualification, estimate draft, missed-call response, and follow-up sequences are active.'
                        : 'Disabled: ask copilot to "Turn on autopilot" to activate bundled automations.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">CRM Schema</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-300">
                      {model.crm.schema.map((field) => (
                        <p key={field.key}>{field.label} ({field.type})</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Estimate Settings</p>
                    <p className="mt-2 text-xs text-slate-300">Default margin: {(model.estimateSettings.defaultMargin * 100).toFixed(0)}%</p>
                    <p className="text-xs text-slate-300">Labor rate: ${model.estimateSettings.laborRate}/hr</p>
                    <p className="text-xs text-slate-300">Tax rate: {(model.estimateSettings.taxRate * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Automations</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    {model.automations.map((automation) => (
                        <p key={automation.id}>{automation.name}: {automation.trigger} {'->'} {automation.action}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Workspace copilot aside removed to keep workspace focused on active work. Use the top Copilot command center instead. */}
        </section>
      </div>
    </main>
  );
}
