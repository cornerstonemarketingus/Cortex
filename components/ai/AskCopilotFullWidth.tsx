"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AskCopilotFullWidth() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const sendQuick = async () => {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      // route to the chat page with a prompt param for now
      const url = `/chat?prompt=${encodeURIComponent(value)}&from=${encodeURIComponent(pathname)}`;
      router.push(url);
    } finally {
      setLoading(false);
      setText("");
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-gradient-to-t from-slate-900/80 via-transparent px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex gap-3">
          <input
            aria-label="Ask Copilot"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendQuick();
              }
            }}
            placeholder="Ask Copilot — try: 'Create a follow-up sequence for estimate #123'"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400"
          />

          <button
            onClick={() => void sendQuick()}
            disabled={loading || !text.trim()}
            className="rounded-xl bg-[var(--brand-600)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "..." : "Ask Copilot"}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Copilot quick commands • routed to Chat</span>
          <a href="/chat" className="font-medium text-blue-300 hover:underline">Open full chat</a>
        </div>
      </div>
    </div>
  );
}
