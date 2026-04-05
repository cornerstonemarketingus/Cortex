"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  navAction?: string;
};

type ChatApiResponse = {
  responses?: string[];
  results?: Array<{ agent: string; result: string }>;
  error?: string;
};

const STORAGE_KEY = 'cortex.copilot.messages';

// Detect navigation intent from user message — no API call needed
function detectNavIntent(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(go to|open|take me to|show me|navigate to|launch)\b/.test(t)) {
    if (/automat/.test(t)) return '/automations';
    if (/estimat|quote|bid/.test(t)) return '/copilot';
    if (/proposal/.test(t)) return '/copilot';
    if (/builder|build|page|website|app/.test(t)) return '/copilot';
    if (/dashboard/.test(t)) return '/dashboard';
    if (/pricing/.test(t)) return '/pricing';
    if (/onboard/.test(t)) return '/onboarding';
  }
  return null;
}

function getPageSuggestions(pathname: string): string[] {
  if (pathname.startsWith('/automations')) {
    return ['Run the full lead engine', 'Show me automation templates', 'Open the estimator →'];
  }
  if (pathname.startsWith('/dashboard')) {
    return ['Take me to automations', 'Open the AI builder', 'Generate an estimate'];
  }
  return [
    'Open the AI builder',
    'Take me to automations',
    'Generate an estimate for a roof replacement',
  ];
}

export default function GlobalAiAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const listRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      text: 'Builder Copilot is ready. Ask me to generate estimates, build automations, create pages, or navigate anywhere.'
    },
  ]);

  const quickPrompts = useMemo(() => getPageSuggestions(pathname), [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AssistantMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-30));
      }
    } catch {
      // Ignore storage parsing errors.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // Ignore storage quota errors.
    }
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: 'user', text },
    ]);
    setInput('');
    setError(null);

    // Client-side nav intent — instant, no API call needed
    const navTarget = detectNavIntent(text);
    if (navTarget) {
      setMessages((current) => [
        ...current,
        {
          id: `nav-${Date.now()}`,
          role: 'assistant',
          text: `Taking you to ${navTarget}…`,
          navAction: navTarget,
        },
      ]);
      setTimeout(() => router.push(navTarget), 600);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          provider: 'auto',
          tone: 'support',
          systemPrompt:
            `You are Builder Copilot, an AI assistant for TeamBuilderCopilot — an AI platform for contractors. ` +
            `Give direct, practical guidance for estimates, proposals, automations, and page building. ` +
            `Never mention OpenAI, Anthropic, Claude, GPT, or any third-party AI provider names. ` +
            `If the user wants to navigate somewhere, reply with exactly: [NAV:/path] on its own line. ` +
            `Available paths: /copilot (estimates + builder), /automations, /dashboard, /pricing, /onboarding.`,
          message: `${text}\n\nCurrent page: ${pathname}`,
          includeCapabilities: false,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatApiResponse;
      if (!response.ok) {
        throw new Error(parsed.error || `Request failed (${response.status})`);
      }

      const outputs = Array.isArray(parsed.responses) && parsed.responses.length > 0
        ? parsed.responses
        : Array.isArray(parsed.results)
        ? parsed.results.map((item) => item.result)
        : [];

      if (outputs.length === 0) throw new Error('No response returned.');

      for (const raw of outputs) {
        const navMatch = raw.match(/\[NAV:(\/[^\]]*)\]/);
        if (navMatch) {
          const dest = navMatch[1];
          const cleanText = raw.replace(/\[NAV:\/[^\]]*\]/, '').trim() || `Navigating to ${dest}…`;
          setMessages((current) => [
            ...current,
            { id: `a-${Date.now()}`, role: 'assistant', text: cleanText, navAction: dest },
          ]);
          setTimeout(() => router.push(dest), 800);
        } else {
          setMessages((current) => [
            ...current,
            { id: `a-${Date.now()}`, role: 'assistant', text: raw },
          ]);
        }
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Request failed';
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `e-${Date.now()}`, role: 'system', text: `Error: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-4 right-4 z-[60] rounded-full border border-[#C69C6D]/50 bg-[#1E3A5F] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-black/40 hover:bg-[#1E3A5F]/80 transition"
      >
        {open ? '✕ Close' : '✦ Builder Copilot'}
      </button>

      {open ? (
        <section className="fixed bottom-14 right-4 z-[60] flex flex-col h-[min(60vh,520px)] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl border border-[#1E3A5F]/60 bg-[#080c14]/97 shadow-2xl backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <header className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-white/8 flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#C69C6D]">Builder Copilot</p>
              <h2 className="text-sm font-semibold text-white mt-0.5">How can I help?</h2>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/15 bg-white/8 px-2 py-1 text-xs text-slate-300 hover:bg-white/15"
            >
              ✕
            </button>
          </header>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1 flex-shrink-0">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="rounded-md border border-[#1E3A5F]/50 bg-[#1E3A5F]/30 px-2 py-1 text-[10px] text-slate-300 hover:bg-[#1E3A5F]/50 transition"
              >
                {prompt.length > 34 ? prompt.slice(0, 34) + '…' : prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                  message.role === 'user'
                    ? 'border-[#1E3A5F]/60 bg-[#1E3A5F]/35 text-slate-100 ml-4'
                    : message.role === 'assistant'
                    ? 'border-[#C69C6D]/20 bg-[#C69C6D]/8 text-slate-200'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                {message.text}
                {message.navAction ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-[#C69C6D]/20 px-2 py-0.5 text-[10px] text-[#C69C6D]">
                    → {message.navAction}
                  </span>
                ) : null}
              </article>
            ))}
            {loading ? (
              <div className="flex gap-1 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C69C6D] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#C69C6D] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-[#C69C6D] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : null}
          </div>

          {/* Input */}
          <div className="flex gap-2 px-3 pb-3 pt-2 border-t border-white/8 flex-shrink-0">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask anything or say 'open builder'…"
              className="flex-1 rounded-lg border border-white/12 bg-white/6 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#C69C6D]/40"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[#1E3A5F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E3A5F]/80 disabled:opacity-50 transition"
            >
              {loading ? '…' : '↑'}
            </button>
          </div>

          {error ? <p className="px-3 pb-2 text-[11px] text-red-300 flex-shrink-0">{error}</p> : null}

          <div className="flex items-center justify-between px-3 pb-3 flex-shrink-0">
            <p className="text-[10px] text-slate-500">Estimates · Proposals · Automations · Builder</p>
            <Link href="/copilot" className="text-[10px] font-semibold text-[#C69C6D] hover:text-[#C69C6D]/80 transition">
              Full Copilot →
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
