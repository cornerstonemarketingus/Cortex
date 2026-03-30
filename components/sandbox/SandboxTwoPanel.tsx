"use client";

import { useState } from "react";

export default function SandboxTwoPanel() {
  const [messages, setMessages] = useState<{id:string, role:'user'|'assistant', text:string}[]>([]);
  const [input, setInput] = useState("");

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const id = `u-${Date.now()}`;
    setMessages((m) => [...m, { id, role: 'user', text }]);
    setInput("");

    // simple echo assistant for offline preview
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: `Preview: ${text}` }]);
    }, 400);
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Chat</h3>
          <div className="mt-3 h-[60vh] overflow-y-auto rounded-lg border border-slate-700 bg-black/30 p-3 text-xs text-slate-200">
            {messages.length === 0 ? <p className="text-slate-400">Start the conversation to preview live output.</p> : null}
            {messages.map((m) => (
              <div key={m.id} className={`mb-2 rounded-md px-3 py-2 ${m.role === 'user' ? 'bg-blue-700/30 text-blue-100' : 'bg-cyan-700/20 text-cyan-100'}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-md border border-white/10 bg-[var(--bg-900)]/40 px-3 py-2 text-sm text-slate-100" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(); } }} />
            <button onClick={() => void send()} className="rounded-md bg-[var(--brand-600)] px-3 py-2 text-sm font-semibold text-white">Send</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Live Output</h3>
          <div className="mt-3 h-[60vh] overflow-y-auto rounded-lg border border-slate-700 bg-black/20 p-3 text-xs text-slate-200">
            <p className="text-slate-400">Outputs appear here as you chat — preview of actions, pages, and generated content.</p>
            {messages.filter(m => m.role === 'assistant').map((m) => (
              <div key={m.id} className="mb-3 rounded-md bg-slate-900/40 px-3 py-2 text-slate-100">
                {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
