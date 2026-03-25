"use client";

import { useEffect, useRef, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

type ChatApiResponse = {
  responses?: string[];
  results?: Array<{ agent: string; result: string }>;
  error?: string;
};

const STORAGE_KEY = 'bidbuilder.chat.messages';

const QUICK_ACTIONS = [
  'Update my profile settings and improve account onboarding copy.',
  'Make direct code edits to improve my website builder onboarding flow.',
  'Refactor my app build prompt for better production launch readiness.',
  'Generate a launch plan with QA checklist for my current build.',
] as const;

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'system-welcome',
      role: 'system',
      text: 'Carlton is ready. Describe your profile, app, or website change request and I will produce direct implementation steps and executable updates.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-80));
      }
    } catch {
      // Ignore local storage parsing issues.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)));
    } catch {
      // Ignore storage quota issues.
    }
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, loading]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          provider: 'auto',
          tone: 'support',
          systemPrompt:
            'You are Carlton, a senior software and product engineering assistant for Bid Builder. Help users make direct profile updates and app/website build changes with practical implementation steps, safe assumptions, and execution-ready guidance.',
          message: text,
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

      if (outputs.length === 0) {
        throw new Error('No assistant output returned.');
      }

      setMessages((current) => [
        ...current,
        ...outputs.map((textOutput, index) => ({
          id: `assistant-${Date.now()}-${index}`,
          role: 'assistant' as const,
          text: textOutput,
        })),
      ]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Assistant request failed.';
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: 'system',
          text: `Error: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#081b4b] via-[#0d2f72] to-[#0a1d4f] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 md:px-8 md:py-10">
        <header className="rounded-3xl border border-blue-300/35 bg-blue-500/15 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Bid Builder Chat</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Carlton Build Assistant</h1>
          <p className="mt-3 max-w-3xl text-sm text-blue-100/90 md:text-base">
            Ask for direct profile updates, code changes, and app or website build improvements. This chat is dedicated to implementation support.
          </p>
        </header>

        <section className="rounded-2xl border border-white/20 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-200">Quick Actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="rounded-lg border border-blue-300/35 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-500/30"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
          <div ref={listRef} className="h-[52vh] overflow-y-auto rounded-xl border border-white/15 bg-[#06153c]/80 p-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-xl border px-3 py-2 text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'ml-8 border-blue-300/35 bg-blue-500/20'
                      : message.role === 'assistant'
                      ? 'mr-8 border-cyan-300/35 bg-cyan-500/15'
                      : 'border-amber-300/35 bg-amber-500/15'
                  }`}
                >
                  <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-slate-300">{message.role}</p>
                  {message.text}
                </article>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Describe the direct change you want to make..."
              className="min-h-20 flex-1 rounded-xl border border-white/20 bg-[#06153c]/90 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="h-fit rounded-xl bg-blue-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-200 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
