"use client";

import { useState, useRef, useEffect } from "react";

export default function HomeWebsiteBuilderChat({ defaultPrompt = "Build a landing page for framing services" }: { defaultPrompt?: string }) {
  const [input, setInput] = useState(defaultPrompt);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [loading, setLoading] = useState(false);
  const assistantRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!assistantRef.current) return;
    assistantRef.current.scrollTop = assistantRef.current.scrollHeight;
  }, [messages]);

  const fakeGen = async () => {
    if (loading) return;
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', text: input }]);

    // Simulate streaming assistant response with typing
    const response = `Generated page sections: hero with headline \"Framing Services\", services list for framing, call-to-action to request quote.`;
    let idx = 0;
    setMessages((m) => [...m, { role: 'assistant', text: '' }]);

    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        idx += 2;
        setMessages((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            last.text = response.slice(0, idx);
          }
          return copy;
        });

        if (idx >= response.length) {
          clearInterval(interval);
          setLoading(false);
          resolve();
        }
      }, 24);
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#071018] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Website Builder (Preview)</p>
      <div ref={assistantRef} className="mt-2 max-h-44 overflow-auto space-y-2 text-sm">
        {messages.length === 0 ? <p className="text-slate-400 text-xs">No preview yet — generate a page from Copilot or a prompt.</p> : null}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-md p-2 ${m.role === 'user' ? 'bg-white/5 text-slate-200' : 'bg-cyan-500/10 text-cyan-100'}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full min-h-20 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-sm" />
        <div className="mt-2 flex gap-2">
          <button onClick={() => void fakeGen()} disabled={loading} className="rounded-lg bg-amber-300 px-3 py-1 text-xs font-semibold text-slate-900">Generate Page</button>
          <button onClick={() => { setInput(defaultPrompt); }} className="rounded-lg border border-white/10 px-3 py-1 text-xs">Reset</button>
        </div>
      </div>
    </div>
  );
}
