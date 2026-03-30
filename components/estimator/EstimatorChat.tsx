"use client";

import { useEffect, useRef, useState } from 'react';
import engine, { EstimateInput } from '@/lib/estimator/engine';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  estimate?: typeof engine.calculateEstimate extends (arg: any) => infer R ? R : never;
};

type ChatApiResponse = {
  responses?: string[];
  error?: string;
};

const STORAGE_KEY = 'cortex.estimator.chat';

export default function EstimatorChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      text: `Hey! I'm your Estimator Copilot. Describe your project and I'll calculate a detailed estimate.

Try saying something like:
• "I need a roof replacement for 2000 sqft in 55123 zip code"
• "Estimate a kitchen remodel, roughly 500 square feet"
• "Commercial HVAC system for 10000 sqft building"`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-50));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
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
  }, [messages]);

  const extractProjectData = (text: string) => {
    const sqftMatch = text.match(/(\d+)\s*(?:sqft|square\s*feet|sf)/i);
    const zipMatch = text.match(/(\d{5})/);

    return {
      sqft: sqftMatch ? parseInt(sqftMatch[1], 10) : 1000,
      zip: zipMatch ? zipMatch[1] : '55123',
      description: text,
    };
  };

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
      const projectData = extractProjectData(text);

      // Build estimate from engine
      const estimateInput: EstimateInput = {
        materials: [
          {
            name: 'Materials',
            quantity: projectData.sqft,
            unit: 'sqft',
            unitCost: 2.5,
          },
        ],
        labor: [
          {
            trade: 'Labor',
            hours: projectData.sqft * 0.02,
            hourlyRate: 55,
          },
        ],
        multipliers: {
          overheadRate: 0.12,
          taxRate: 0.07,
          profitMarginRate: 0.12,
          locationFactor: projectData.zip.startsWith('9') ? 1.08 : 1,
          complexityFactor: 1.05,
        },
      };

      const breakdown = engine.calculateEstimate(estimateInput);

      // Get AI response
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assistant',
          provider: 'auto',
          tone: 'professional',
          systemPrompt:
            'You are Estimator Copilot. Given project details and calculated estimate, provide concise, helpful analysis. Keep responses brief and actionable. Format dollars with $ sign.',
          message: `Project: ${text}\n\nCalculated estimate total: $${breakdown.total.toFixed(2)}\nMaterials: $${breakdown.materialsTotal.toFixed(2)}\nLabor: $${breakdown.laborTotal.toFixed(2)}\nOverhead: $${breakdown.overheadAmount.toFixed(2)}\nTax: $${breakdown.taxAmount.toFixed(2)}\nProfit: $${breakdown.profitAmount.toFixed(2)}`,
        }),
      });

      const parsed = (await aiResponse.json().catch(() => ({}))) as ChatApiResponse;
      const responseText = Array.isArray(parsed.responses)
        ? parsed.responses.join('\n')
        : parsed.error || `Estimate: $${breakdown.total.toFixed(2)}`;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: responseText,
          estimate: breakdown,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Estimation failed';
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
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div ref={listRef} className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[var(--brand-600)]/40 border border-[var(--brand-600)]/60'
                    : msg.role === 'assistant'
                    ? 'bg-[var(--accent-600)]/25 border border-[var(--accent-600)]/40'
                    : 'bg-[var(--muted-400)]/15 border border-[var(--muted-400)]/30 text-slate-300'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                {msg.estimate && (
                  <div className="mt-3 space-y-1 border-t border-white/20 pt-3 text-xs text-slate-300">
                    <p className="font-semibold text-white">
                      Total: ${msg.estimate.total.toFixed(2)}
                    </p>
                    <p>Materials: ${msg.estimate.materialsTotal.toFixed(2)}</p>
                    <p>Labor: ${msg.estimate.laborTotal.toFixed(2)}</p>
                    <p>Overhead + Tax + Profit: ${(msg.estimate.overheadAmount + msg.estimate.taxAmount + msg.estimate.profitAmount).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-[var(--accent-600)]/25 border border-[var(--accent-600)]/40 rounded-xl px-4 py-3">
                <p className="text-sm">Calculating estimate...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input section */}
      <div className="border-t border-white/10 bg-[#0b0d12]/95 backdrop-blur px-4 py-4 md:px-6">
        <div className="mx-auto max-w-3xl">
          {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Describe your project... (include sqft and zip code for better estimates)"
              className="flex-1 rounded-lg border border-white/20 bg-white/8 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-[var(--brand-600)]/60 focus:outline-none"
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-600)]/90 disabled:opacity-50"
            >
              {loading ? '...' : 'Estimate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
