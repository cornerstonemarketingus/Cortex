"use client";

import { useEffect, useRef, useState } from "react";
import PublicMarketingNav from "@/components/navigation/PublicMarketingNav";
import { handleCopilotRequest } from "@/core/copilot/copilot.service";
import { loadContextFromStorage, type CopilotContext } from "@/core/copilot/context.store";
import type { Intent } from "@/core/copilot/intent.classifier";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  intent?: Intent;
  estimate?: any;
};

const STORAGE_KEY = "bidbuilder.chat.messages";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "system-welcome",
      role: "system",
      text: "I'm your AI Copilot. I can help with estimates, websites, automations, or general questions. What would you like to do?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<CopilotContext>(() =>
    loadContextFromStorage()
  );
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages([messages[0], ...parsed.slice(-30)]);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(1).slice(-30)));
    } catch {
      // Ignore quota errors
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

    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const copilotResponse = await handleCopilotRequest(text, context);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: copilotResponse.response,
          intent: copilotResponse.classification.intent,
          estimate: copilotResponse.toolResult.data?.breakdown,
        },
      ]);
      setContext(copilotResponse.context);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: "system", text: `Error: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col">
      <PublicMarketingNav />
      <div className="flex-1 overflow-y-auto p-6">
        <div ref={listRef} className="mx-auto max-w-4xl space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[var(--brand-600)]/40 border border-[var(--brand-600)]/60"
                    : msg.role === "assistant"
                    ? "bg-[var(--accent-600)]/25 border border-[var(--accent-600)]/40"
                    : "bg-[var(--muted-400)]/15 border border-[var(--muted-400)]/30 text-slate-300"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                {msg.estimate && (
                  <div className="mt-3 space-y-1 border-t border-white/20 pt-3 text-xs text-slate-300">
                    <p className="font-semibold text-white">Total: ${msg.estimate.total.toFixed(2)}</p>
                    <p>Materials: ${msg.estimate.materialsTotal.toFixed(2)}</p>
                    <p>Labor: ${msg.estimate.laborTotal.toFixed(2)}</p>
                  </div>
                )}
                {msg.intent && msg.role === "assistant" && (
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-slate-400">Intent: {msg.intent}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--accent-600)]/25 border border-[var(--accent-600)]/40 rounded-lg px-4 py-3">
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#0b0d12]/95 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl">
          {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask Copilot..."
              className="flex-1 rounded-lg border border-white/20 bg-white/8 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-[var(--brand-600)]/60 focus:outline-none"
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-600)]/90 disabled:opacity-50"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
