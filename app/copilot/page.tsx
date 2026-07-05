'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import EstimateResultCard from '@/components/copilot/EstimateResultCard';
import ProposalResultCard from '@/components/copilot/ProposalResultCard';

// ── Types ──────────────────────────────────────────────────────────────────
type Mode = 'estimator' | 'builder';

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

interface ProposalPayload {
  clientName?: string;
  contractorName?: string;
  projectAddress?: string;
  trades: Array<{
    tradeName: string;
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
  }>;
  grandTotal: number;
  timeline?: Array<{ tradeName: string; startDay: number; durationDays: number }>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  actionType?: string;
  estimatePayload?: EstimatePayload;
  pagePayload?: PagePayload;
  proposalPayload?: ProposalPayload;
}

// ── Suggestion sets ────────────────────────────────────────────────────────
const ESTIMATOR_SUGGESTIONS = [
  'Asphalt shingle roofing for 2,400 sqft',
  'Residential framing for 3,200 sqft',
  'Drywall and finishing for 1,800 sqft',
  'Hardwood flooring for 1,200 sqft',
  'Electrical rough-in for 2,000 sqft',
  'Plumbing rough-in for 1,600 sqft',
];

const BUILDER_SUGGESTIONS = [
  'Build a landing page for my roofing company',
  'Create a plumbing services website',
  'Generate a contractor CRM dashboard',
  'Build an HVAC company landing page',
];

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: '#C69C6D', animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
          />
        ))}
      </span>
      <span className="text-xs" style={{ color: '#6B7A8F' }}>Working on it…</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CopilotPage() {
  const [mode, setMode] = useState<Mode>('estimator');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0;
  const suggestions = mode === 'estimator' ? ESTIMATOR_SUGGESTIONS : BUILDER_SUGGESTIONS;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  function prefillRevision(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  async function send(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt || isLoading) return;

    setInput('');
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt, mode }),
      });

      const data = await res.json() as {
        text?: string;
        action?: { type: string; payload?: Record<string, unknown> };
        error?: string;
      };

      const responseText = data.text ?? '';
      const action = data.action ?? { type: 'NOOP' };

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: responseText,
        actionType: action.type,
      };

      if (action.type === 'CREATE_ESTIMATE' && action.payload) {
        assistantMsg.estimatePayload = action.payload as unknown as EstimatePayload;
      }
      if (action.type === 'CREATE_PAGE' && action.payload) {
        assistantMsg.pagePayload = action.payload as unknown as PagePayload;
      }
      if (action.type === 'GENERATE_PROPOSAL' && action.payload) {
        assistantMsg.proposalPayload = action.payload as unknown as ProposalPayload;
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'system', text: 'Connection error — please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#060c15' }}
    >
      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 h-14"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,12,21,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Back to home">
            <svg className="w-4 h-4" style={{ color: '#4A5568' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-sm font-semibold text-white">TeamBuilder Copilot</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div
            className="flex items-center rounded-lg p-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {(['estimator', 'builder'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessages([]); setInput(''); }}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-all"
                style={mode === m
                  ? { background: 'rgba(255,255,255,0.09)', color: '#E2E8F0' }
                  : { color: '#4A5568' }}
              >
                {m === 'estimator' ? 'Estimator' : 'Builder'}
              </button>
            ))}
          </div>

          {!isEmpty && (
            <button
              onClick={() => { setMessages([]); setInput(''); }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#4A5568' }}
            >
              New
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-8">

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center text-center pt-10 pb-8 select-none">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-2xl"
                style={{ background: 'rgba(198,156,109,0.12)', border: '1px solid rgba(198,156,109,0.2)' }}
              >
                {mode === 'estimator' ? '📐' : '🏗️'}
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">
                {mode === 'estimator' ? 'What are we estimating?' : 'What should I build?'}
              </h1>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: '#6B7A8F' }}>
                {mode === 'estimator'
                  ? 'Describe your project and get a detailed trade estimate with materials, labor, and cost breakdown.'
                  : 'Describe what you want — a landing page, dashboard, or any contractor tool.'}
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-md">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="text-xs px-3 py-2 rounded-full transition"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#8B9CB5',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message feed */}
          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div
                      className="max-w-sm rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white"
                      style={{ background: 'linear-gradient(135deg, #1a3456 0%, #15294a 100%)', border: '1px solid rgba(59,130,246,0.15)' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ) : msg.role === 'system' ? (
                  <div className="flex justify-center">
                    <div
                      className="text-xs px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#F87171' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* AI text */}
                    {msg.text && (
                      <p className="text-sm leading-relaxed" style={{ color: '#B0BEC8' }}>
                        {msg.text}
                      </p>
                    )}

                    {/* Estimate card */}
                    {msg.estimatePayload && (
                      <EstimateResultCard
                        breakdown={{
                          ...msg.estimatePayload.breakdown,
                          templateName: msg.estimatePayload.templateName,
                          sqft: msg.estimatePayload.sqft,
                        }}
                        onRevise={prefillRevision}
                      />
                    )}

                    {/* Page built card */}
                    {msg.pagePayload && (
                      <PageBuiltCard pageTitle={msg.pagePayload.pageTitle} sectionCount={msg.pagePayload.sections.length} sections={msg.pagePayload.sections} />
                    )}

                    {/* Proposal card */}
                    {msg.proposalPayload && <ProposalResultCard proposalData={msg.proposalPayload} />}
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-start">
                <Spinner />
              </div>
            )}
          </div>

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input bar ── */}
      <div
        className="flex-shrink-0 px-4 pb-5 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(6,12,21,0.96)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto max-w-2xl">
          <div
            className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(198,156,109,0.3)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              placeholder={mode === 'estimator'
                ? 'Describe a project to estimate… e.g. "Roofing for 2,400 sqft"'
                : 'Describe what to build…'}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
              style={{ color: '#E2E8F0', caretColor: '#C69C6D', maxHeight: '128px', overflow: 'auto' }}
            />
            <button
              onClick={() => void send()}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition disabled:opacity-25"
              style={{
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #1E3A5F, #C69C6D)'
                  : 'rgba(255,255,255,0.06)',
              }}
              aria-label="Send"
            >
              {isLoading ? (
                <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          <p className="mt-2 text-center text-[10px]" style={{ color: '#2D3748' }}>
            TeamBuilder Copilot · AI-powered construction estimates
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page built mini-card ───────────────────────────────────────────────────
function PageBuiltCard({ pageTitle, sectionCount, sections }: { pageTitle: string; sectionCount: number; sections: Array<{ id: string; type: string; props: Record<string, unknown> }> }) {
  function openInBuilder() {
    const encoded = btoa(JSON.stringify(sections));
    window.location.href = `/json-builder?s=${encoded}`;
  }
  return (
    <div
      className="rounded-2xl overflow-hidden w-full max-w-xl"
      style={{ background: '#0e1929', border: '1px solid rgba(59,130,246,0.15)' }}
    >
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#60A5FA' }}>Page Built</p>
          <p className="text-sm font-semibold text-white">{pageTitle}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7A8F' }}>{sectionCount} sections</p>
        </div>
        <span className="text-2xl">🌐</span>
      </div>
      <div className="px-5 py-4 flex gap-2">
        <button
          onClick={openInBuilder}
          className="flex-1 rounded-lg py-2 text-xs font-semibold text-center transition"
          style={{ background: 'rgba(30,58,95,0.6)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
        >
          Open in Builder
        </button>
      </div>
    </div>
  );
}

