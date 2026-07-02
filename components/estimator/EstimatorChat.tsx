"use client";

import { useEffect, useRef, useState } from 'react';
import { buildFromTemplate, listTemplates, type TemplateId } from '@/lib/estimator/templates';
import { calculateEstimate } from '@/lib/estimator/engine';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

const STORAGE_KEY = 'cortex.estimator.chat.v2';

// ─── Trade keyword detection ─────────────────────────────────────────────────
const TRADE_MAP: Array<{ keywords: RegExp; id: TemplateId }> = [
  { keywords: /roof|shingle|reroof|asphalt/i, id: 'roofing-shingle' },
  { keywords: /metal roof|standing seam|corrugated/i, id: 'roofing-metal' },
  { keywords: /commercial fram|steel stud|light.gauge/i, id: 'commercial-framing' },
  { keywords: /fram|stud|lumber|wood frame/i, id: 'residential-framing' },
  { keywords: /window/i, id: 'windows-standard' },
  { keywords: /premium window|casement|triple pane/i, id: 'windows-premium' },
  { keywords: /exterior door|entry door|front door/i, id: 'doors-exterior' },
  { keywords: /interior door|bedroom door/i, id: 'doors-interior' },
  { keywords: /drywall|sheetrock|gypsum/i, id: 'drywall-finish' },
  { keywords: /hardwood|wood floor|engineered/i, id: 'flooring-hardwood' },
  { keywords: /tile floor|ceramic|porcelain/i, id: 'flooring-tile' },
  { keywords: /concrete|foundation|slab|footing/i, id: 'concrete-foundation' },
  { keywords: /exterior paint|house paint/i, id: 'painting-exterior' },
  { keywords: /paint|interior paint/i, id: 'painting-interior' },
  { keywords: /electric|wiring|outlet|panel/i, id: 'electrical-rough' },
  { keywords: /plumb|pipe|drain|water/i, id: 'plumbing-rough' },
];

function detectTrade(text: string): TemplateId {
  for (const entry of TRADE_MAP) {
    if (entry.keywords.test(text)) return entry.id;
  }
  return 'residential-framing';
}

function parseSqft(text: string): number {
  const m = text.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|square\s*feet|sqft|sf)\b/i);
  if (m) return Math.min(Math.max(parseInt(m[1].replace(/,/g, ''), 10), 100), 100_000);
  const m2 = text.match(/\b(\d{3,6})\b/);
  if (m2) return Math.min(Math.max(parseInt(m2[1], 10), 100), 100_000);
  return 1_500;
}

function parseZip(text: string): string | null {
  const m = text.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

function locationMultiplier(zip: string): number {
  const pre = parseInt(zip.slice(0, 2), 10);
  if (pre >= 90) return 1.15;   // West Coast
  if (pre >= 60 && pre <= 79) return 1.05; // South/Central
  if (pre <= 9) return 1.10;   // New England
  return 1.0;
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function buildReply(tradeId: TemplateId, sqft: number, zip: string | null): string {
  const template = listTemplates().find((t) => t.id === tradeId) ?? listTemplates()[0];
  const input = buildFromTemplate(tradeId, sqft);
  const locMult = zip ? locationMultiplier(zip) : 1.0;

  // Apply location factor to all unit costs
  const scaledInput = {
    ...input,
    materials: input.materials.map((m) => ({ ...m, unitCost: m.unitCost * locMult })),
    labor: input.labor.map((l) => ({ ...l, hourlyRate: l.hourlyRate * locMult })),
  };

  const bd = calculateEstimate(scaledInput);

  const low = fmt(bd.total * 0.88);
  const high = fmt(bd.total * 1.15);
  const total = fmt(bd.total);
  const materials = fmt(bd.materialsTotal);
  const labor = fmt(bd.laborTotal);
  const rest = fmt(bd.overheadAmount + bd.taxAmount + bd.profitAmount);
  const location = zip ? ` (ZIP ${zip})` : '';

  return [
    `Here's your **${template.name}** estimate for ${sqft.toLocaleString()} sq ft${location}:`,
    ``,
    `  💰  Best estimate:  ${total}`,
    `  📉  Low end:        ${low}`,
    `  📈  High end:       ${high}`,
    ``,
    `Cost breakdown:`,
    `  • Materials    ${materials}`,
    `  • Labor        ${labor}`,
    `  • Overhead/profit  ${rest}`,
    ``,
    `Top materials: ${bd.details.materials.slice(0, 3).map((m) => m.key).join(', ')}.`,
    ``,
    `Tip: mention your ZIP code or refine the scope for a tighter range. Reply "new estimate" to start fresh.`,
  ].join('\n');
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function EstimatorChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      text: `Hey! I'm your Estimator Copilot. Describe your project and I'll compute a detailed estimate instantly — no API key required.

Try:
  • "Roof replacement for 2,000 sqft in 55123"
  • "Residential framing, 3,500 sq ft"
  • "Interior painting 1,200 sqft"
  • "Concrete foundation 900 sqft Chicago"`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Persist chat history
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(-60));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); }
    catch { /* ignore */ }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages]);

  const send = (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    if (/^new estimate$/i.test(text)) {
      setMessages([{
        id: `sys-${Date.now()}`,
        role: 'system',
        text: 'Started fresh. Describe your next project.',
      }]);
      setInput('');
      return;
    }

    setMessages((prev: Message[]) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setLoading(true);

    // Yield to paint the user bubble, then compute synchronously
    setTimeout(() => {
      try {
        const tradeId = detectTrade(text);
        const sqft = parseSqft(text);
        const zip = parseZip(text);
        const reply = buildReply(tradeId, sqft, zip);
        setMessages((prev: Message[]) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: reply }]);
      } catch {
        setMessages((prev: Message[]) => [...prev, {
          id: `a-${Date.now()}`,
          role: 'assistant' as const,
          text: 'I had trouble computing that estimate. Try describing the trade (e.g. "roofing") and square footage.',
        }]);
      } finally {
        setLoading(false);
      }
    }, 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0d12] text-slate-100">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1117]/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold text-white">Estimator Copilot</h1>
          <p className="text-xs text-slate-400">Instant construction cost estimates — describe your project below</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div ref={listRef} className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-blue-600/40 border border-blue-500/50 text-white'
                  : msg.role === 'assistant'
                  ? 'rounded-bl-sm bg-[#131c2e] border border-white/10 text-slate-100'
                  : 'bg-white/5 border border-white/10 text-slate-400 text-xs'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-[#131c2e] px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 bg-[#0b0d12]/95 px-4 py-4 backdrop-blur md:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="e.g. Roof replacement 2,000 sqft in 55123"
              className="flex-1 rounded-xl border border-white/20 bg-white/8 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:outline-none"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              Estimate
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-600">
            All estimates are computed locally — no AI API required
          </p>
        </div>
      </div>
    </div>
  );
}


