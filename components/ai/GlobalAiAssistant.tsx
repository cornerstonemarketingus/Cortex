"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

type ChatApiResponse = {
  responses?: string[];
  results?: Array<{ agent: string; result: string }>;
  error?: string;
};

const STORAGE_KEY = 'bidbuilder.carlton.messages';

function getStarterPrompt(pathname: string): string {
  if (pathname.startsWith('/website-builder')) {
    return 'Help me improve my website build flow and launch quality.';
  }

  if (pathname.startsWith('/app-builder')) {
    return 'Help me improve my app build architecture and launch checklist.';
  }

  if (pathname.startsWith('/bidbuilder')) {
    return 'Help me run estimator-first growth strategy and automation activation.';
  }

  return 'Help me make direct profile and build updates.';
}

export default function GlobalAiAssistant() {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      text: 'Carlton is online. Ask for direct build, profile, or automation updates.',
    },
  ]);

  const quickPrompts = useMemo(
    () => [
      'Improve my estimator conversion and follow-up flow.',
      'Refine my website launch checklist and publish steps.',
      'Create a practical app build optimization plan.',
      getStarterPrompt(pathname),
    ],
    [pathname]
  );

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
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
      },
    ]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'assistant',
          provider: 'auto',
          tone: 'support',
          systemPrompt:
            'You are Carlton, a premium build assistant for Bid Builder. Give direct, practical guidance for app, website, profile, estimator, and automation improvements.',
          message: `${text}\n\nCurrent page: ${pathname}`,
          includeCapabilities: false,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatApiResponse;
      if (!response.ok) {
        throw new Error(parsed.error || `Assistant request failed (${response.status})`);
      }

      const outputs = Array.isArray(parsed.responses) && parsed.responses.length > 0
        ? parsed.responses
        : Array.isArray(parsed.results)
        ? parsed.results.map((item) => item.result)
        : [];

      if (outputs.length === 0) {
        throw new Error('Assistant returned no output.');
      }

      setMessages((current) => [
        ...current,
        ...outputs.map((textOutput, index) => ({
          id: `a-${Date.now()}-${index}`,
          role: 'assistant' as const,
          text: textOutput,
        })),
      ]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Assistant request failed';
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          role: 'system',
          text: `Error: ${message}`,
        },
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
        className="fixed bottom-4 right-4 z-[60] rounded-full border border-blue-300/70 bg-blue-500/30 px-4 py-2 text-xs font-semibold text-blue-50 shadow-lg shadow-blue-950/40 hover:bg-blue-500/40"
      >
        {open ? 'Close Carlton' : 'Ask Carlton'}
      </button>

      {open ? (
        <section className="fixed bottom-16 right-4 z-[60] h-[min(44vh,360px)] w-[min(320px,calc(100vw-1rem))] rounded-2xl border border-blue-300/35 bg-[#06153f]/95 p-3 text-white shadow-2xl">
          <header className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200">Carlton Assistant</p>
              <h2 className="text-sm font-semibold">Direct build support</h2>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-slate-100 hover:bg-white/20"
            >
              X
            </button>
          </header>

          <div className="mb-2 flex flex-wrap gap-1">
            {quickPrompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="rounded-md border border-blue-300/30 bg-blue-500/20 px-2 py-1 text-[10px] text-blue-50 hover:bg-blue-500/30"
              >
                {prompt.slice(0, 28)}{prompt.length > 28 ? '...' : ''}
              </button>
            ))}
          </div>

          <div ref={listRef} className="h-[58%] overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2 space-y-2">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded-lg border px-2 py-1.5 text-xs whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'border-blue-300/35 bg-blue-500/20'
                    : message.role === 'assistant'
                    ? 'border-cyan-300/35 bg-cyan-500/15'
                    : 'border-amber-300/35 bg-amber-500/15'
                }`}
              >
                {message.text}
              </article>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask for a change..."
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-blue-300 px-2.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-blue-200 disabled:opacity-60"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>

          {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}

          <div className="mt-1 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">Need full workspace?</p>
            <Link href="/chat" className="text-[10px] font-semibold text-blue-200 hover:text-blue-100">
              Open chat
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
