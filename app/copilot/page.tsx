'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ThinkingIndicator from '@/components/copilot/ThinkingIndicator';
import EstimateResultCard from '@/components/copilot/EstimateResultCard';
import PageBuilderResultCard from '@/components/copilot/PageBuilderResultCard';

// ── Types ──────────────────────────────────────────────────────────────────
interface EstimatePayload {
  templateName: string;
  sqft: number;
  breakdown: {
    materialsTotal: number;
    laborTotal: number;
    subtotal: number;
    overheadAmount: number;
    taxAmount: number;
    profitAmount: number;
    total: number;
  };
}

interface PagePayload {
  pageTitle: string;
  sections: Array<{ id: string; type: string; props: Record<string, unknown> }>;
}

interface AutomationPayload {
  workflow: Record<string, unknown> | null;
  description: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  thinking?: string[];
  actionType?: string;
  estimatePayload?: EstimatePayload;
  pagePayload?: PagePayload;
  automationPayload?: AutomationPayload;
}

// ── Suggestion chips ───────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Estimate residential framing for 2,500 sqft',
  'Build a roofing company landing page',
  'Set up a missed call automation',
  'Quote drywall finishing for 1,800 sqft',
  'Create a plumbing services page',
  'Estimate hardwood flooring for 1,200 sqft',
];

// ── Automation display ─────────────────────────────────────────────────────
function AutomationResultCard({ payload }: { payload: AutomationPayload }) {
  const wf = payload.workflow as Record<string, unknown> | null;
  return (
    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-[#0d1826] overflow-hidden w-full max-w-lg">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-950/40 border-b border-emerald-500/20">
        <div>
          <p className="text-xs text-emerald-400 uppercase tracking-widest font-semibold">Automation</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {wf ? String(wf.name ?? 'New Workflow') : 'Workflow Created'}
          </p>
        </div>
        <span className="text-2xl">⚡</span>
      </div>
      <div className="px-4 py-3 text-xs text-slate-400">
        <p>{payload.description}</p>
        {wf && (wf.actions as unknown[])?.length && (
          <p className="mt-1 text-emerald-400/70">
            {(wf.actions as unknown[]).length} action{(wf.actions as unknown[]).length !== 1 ? 's' : ''} configured
          </p>
        )}
      </div>
      <div className="px-4 pb-3">
        <Link
          href="/os"
          className="block text-center rounded-lg py-2 text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/80 transition"
        >
          Manage Automations
        </Link>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [thinkingActive, setThinkingActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingSteps, scrollToBottom]);

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || isLoading) return;

    setInput('');
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setThinkingSteps([]);
    setThinkingActive(true);

    // Start thinking simulation while waiting for API
    const baseSteps = ['Analyzing your request…'];
    setThinkingSteps(baseSteps);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt }),
      });

      const data = await res.json() as {
        text?: string;
        thinking?: string[];
        action?: { type: string; payload?: Record<string, unknown> };
        error?: string;
      };

      const thinking: string[] = data.thinking ?? ['Processing…'];
      const responseText = data.text ?? data.error ?? 'Something went wrong.';
      const action = data.action ?? { type: 'NOOP' };

      // Show thinking steps from server
      setThinkingSteps(thinking);
      setThinkingActive(false);

      // Build the assistant message
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        thinking,
        actionType: action.type,
      };

      if (action.type === 'CREATE_ESTIMATE' && action.payload) {
        assistantMsg.estimatePayload = action.payload as unknown as EstimatePayload;
      }
      if (action.type === 'CREATE_PAGE' && action.payload) {
        assistantMsg.pagePayload = action.payload as unknown as PagePayload;
      }
      if (action.type === 'CREATE_AUTOMATION' && action.payload) {
        assistantMsg.automationPayload = action.payload as unknown as AutomationPayload;
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setThinkingActive(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          text: '⚠️ Connection error — please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
      setThinkingSteps([]);
      inputRef.current?.focus();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0f1f38 0%, #080c14 50%, #050709 100%)',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1E3A5F, #C69C6D)' }}
          >
            <span className="text-white text-[10px] font-black">TB</span>
          </div>
          <span className="text-sm font-semibold text-white/90">TeamBuilder Copilot</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/os" className="text-xs text-slate-500 hover:text-slate-300 transition">
            OS
          </Link>
          <Link href="/json-builder" className="text-xs text-slate-500 hover:text-slate-300 transition">
            Builder
          </Link>
          <Link href="/estimates" className="text-xs text-slate-500 hover:text-slate-300 transition">
            Estimates
          </Link>
        </div>
      </header>

      {/* Messages area */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Empty state */}
          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center pt-16 pb-8 text-center select-none">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-xl"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #C69C6D 100%)' }}
              >
                <span className="text-white text-2xl font-black">TB</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                What can I build for you?
              </h1>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                Ask me to create a construction estimate, build a website page, or set up an automation workflow.
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                <div
                  className="max-w-xl rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #1a3350 100%)', border: '1px solid rgba(198,156,109,0.2)' }}
                >
                  {msg.text}
                </div>
              ) : msg.role === 'system' ? (
                <div className="text-xs text-red-400/80 bg-red-950/30 rounded-lg px-3 py-2 border border-red-500/20">
                  {msg.text}
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-w-xl w-full">
                  {/* Thinking steps (collapsed, shown inline) */}
                  {msg.thinking && msg.thinking.length > 0 && (
                    <ThinkingIndicator steps={msg.thinking} isActive={false} />
                  )}

                  {/* Response bubble */}
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-slate-100 bg-white/[0.05] border border-white/[0.08]">
                    {msg.text}
                  </div>

                  {/* Result cards */}
                  {msg.estimatePayload && (
                    <EstimateResultCard
                      breakdown={{
                        ...msg.estimatePayload.breakdown,
                        templateName: msg.estimatePayload.templateName,
                        sqft: msg.estimatePayload.sqft,
                      }}
                    />
                  )}
                  {msg.pagePayload && (
                    <PageBuilderResultCard
                      pageTitle={msg.pagePayload.pageTitle}
                      sections={msg.pagePayload.sections}
                    />
                  )}
                  {msg.automationPayload && (
                    <AutomationResultCard payload={msg.automationPayload} />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Active thinking indicator */}
          {isLoading && thinkingSteps.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-xl w-full rounded-2xl rounded-tl-sm px-4 py-3 bg-white/[0.04] border border-white/[0.07]">
                <ThinkingIndicator steps={thinkingSteps} isActive={thinkingActive} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Bottom input */}
      <div className="relative z-10 border-t border-white/[0.06] bg-[#080c14]/80 backdrop-blur-xl px-4 py-4">
        <div className="mx-auto max-w-2xl">
          {/* Suggestion chips (only when empty) */}
          {isEmpty && !isLoading && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/[0.09] transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div
            className="flex items-end gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-4 py-3 focus-within:border-[#C69C6D]/40 transition"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask anything — estimate, page, automation, or chat…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              onClick={() => void send()}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition disabled:opacity-30"
              style={{
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #1E3A5F, #C69C6D)'
                  : 'rgba(255,255,255,0.06)',
              }}
              aria-label="Send"
            >
              {isLoading ? (
                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-600">
            TeamBuilderCopilot — AI for contractors &amp; construction businesses
          </p>
        </div>
      </div>
    </div>
  );
}
