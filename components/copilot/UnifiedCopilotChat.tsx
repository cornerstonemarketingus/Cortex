"use client";

import { useEffect, useRef, useState } from "react";
import { handleCopilotRequest } from "@/core/copilot/copilot.service";
import { loadContextFromStorage, type CopilotContext } from "@/core/copilot/context.store";
import type { Intent, ClassificationResult } from "@/core/copilot/intent.classifier";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  intent?: Intent;
  toolData?: {
    estimate?: any;
    pageSection?: any;
    automation?: any;
  };
};

const STORAGE_KEY = "cortex.copilot.messages";

export default function UnifiedCopilotChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "system-welcome",
      role: "system",
      text: "I'm your AI Copilot Assistant. I can help you with:\n\n📋 **Estimates** — \"Get a quote for a 2,000 sqft commercial roof\"\n🏗️ **Page Builder** — \"Create a landing page for my HVAC business\"\n⚙️ **Automations** — \"Set up a lead follow-up workflow\"\n💬 **General Chat** — Ask me anything about your projects\n\nWhat would you like to do?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<CopilotContext>(() =>
    loadContextFromStorage()
  );
  const [activePanel, setActivePanel] = useState<Intent | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages([messages[0], ...parsed.slice(-50)]);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(1).slice(-50)));
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

    // Add user message
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const copilotResponse = await handleCopilotRequest(text, context);
      const intent = copilotResponse.classification.intent;

      // Set active panel based on intent
      if (intent === "estimate" || intent === "builder" || intent === "automation") {
        setActivePanel(intent);
      }

      // Add assistant message with toolData
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: copilotResponse.response,
          intent,
          toolData: {
            estimate: copilotResponse.toolResult.data?.breakdown,
            pageSection: copilotResponse.toolResult.data?.sections,
            automation: copilotResponse.toolResult.data?.workflow,
          },
        },
      ]);

      setContext(copilotResponse.context);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `error-${Date.now()}`, role: "system", text: `⚠️ Error: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div ref={listRef} className="mx-auto max-w-3xl space-y-4">
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
                    {msg.intent && msg.role === "assistant" && (
                      <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-400/80">
                        🎯 Intent: {msg.intent}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--accent-600)]/25 border border-[var(--accent-600)]/40 rounded-lg px-4 py-3 space-y-2">
                    <p className="text-sm font-medium">Processing your request...</p>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-600)] animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-600)] animate-bounce delay-100" />
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-600)] animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 bg-[#0b0d12]/95 backdrop-blur px-6 py-4">
            <div className="mx-auto max-w-3xl">
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
                  placeholder="Ask Copilot anything... estimate, page, automation, or chat"
                  className="flex-1 rounded-lg border border-white/20 bg-white/8 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-[var(--brand-600)]/60 focus:outline-none transition"
                />
                <button
                  onClick={() => void send()}
                  disabled={loading || !input.trim()}
                  className="rounded-lg bg-[var(--brand-600)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-600)]/90 disabled:opacity-50 transition"
                >
                  {loading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Tool Results */}
        {activePanel && (
          <div className="w-96 border-l border-white/10 bg-[#0a0c10]/90 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Close Panel */}
              <button
                onClick={() => setActivePanel(null)}
                className="text-xs uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
              >
                ✕ Close Panel
              </button>

              {activePanel === "estimate" && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--accent-500)]">Estimate Breakdown</p>
                  <div className="space-y-2 text-sm">
                    {messages
                      .filter((m) => m.role === "assistant" && m.intent === "estimate")
                      .slice(-1)
                      .map((msg) =>
                        msg.toolData?.estimate ? (
                          <div key={msg.id} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-300">Materials</span>
                              <span className="font-semibold text-white">
                                ${msg.toolData.estimate.materialsTotal?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">Labor</span>
                              <span className="font-semibold text-white">
                                ${msg.toolData.estimate.laborTotal?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="border-t border-white/10 pt-2 flex justify-between">
                              <span className="text-slate-200 font-semibold">Total</span>
                              <span className="text-lg font-bold text-[var(--accent-400)]">
                                ${msg.toolData.estimate.total?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p key={msg.id} className="text-slate-400">No estimate data available</p>
                        )
                      )}
                  </div>
                </div>
              )}

              {activePanel === "builder" && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--brand-500)]">Page Sections</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400">
                      Page builder sections will be previewed here. You can regenerate individual sections or view the full page.
                    </p>
                    <button className="w-full rounded-lg bg-[var(--brand-600)]/40 border border-[var(--brand-600)]/60 px-3 py-2 text-xs font-semibold text-[var(--brand-300)] hover:bg-[var(--brand-600)]/50 transition">
                      View Full Page
                    </button>
                  </div>
                </div>
              )}

              {activePanel === "automation" && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-500">Automation Workflow</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-400">
                      Your automation triggers and actions will appear here. You can edit workflows and preview the flow.
                    </p>
                    <button className="w-full rounded-lg bg-emerald-600/40 border border-emerald-600/60 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/50 transition">
                      Edit Workflow
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
