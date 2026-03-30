"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeCopilot({ defaultPrompt = '' }: { defaultPrompt?: string }) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const detectIntent = (input: string) => {
    const txt = input.toLowerCase();
    const intent: { type: 'estimate' | 'page' | 'automation' | 'unknown'; payload?: Record<string, any> } = { type: 'unknown' };
    if (/estimate|quote|bid|sqft|square foot|square footage/.test(txt)) intent.type = 'estimate';
    if (/page|website|landing|hero|headline/.test(txt)) intent.type = 'page';
    if (/automation|workflow|follow up|autopilot|sequence|trigger/.test(txt)) intent.type = 'automation';

    const sqftMatch = txt.match(/(\d{3,6})\s*(sqft|sq ft|square feet|square foot)/);
    const windowsMatch = txt.match(/(\d+)\s*(windows|window)/);
    const zipMatch = txt.match(/\b(\d{5})\b/);
    if (sqftMatch) intent.payload = { ...(intent.payload || {}), sqft: Number(sqftMatch[1]) };
    if (windowsMatch) intent.payload = { ...(intent.payload || {}), windows: Number(windowsMatch[1]) };
    if (zipMatch) intent.payload = { ...(intent.payload || {}), zip: zipMatch[1] };

    return intent;
  };

  const handleRun = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      // Quick local intent detection for snappy routing
      const detected = detectIntent(prompt);
      if (detected.type === 'estimate') {
        const params = new URLSearchParams();
        params.set('prompt', prompt);
        if (detected.payload?.sqft) params.set('sqft', String(detected.payload.sqft));
        if (detected.payload?.zip) params.set('zip', detected.payload.zip);
        router.push(`/estimate?${params.toString()}`);
        setLoading(false);
        return;
      }

      if (detected.type === 'page') {
        router.push(`/website-builder?prompt=${encodeURIComponent(prompt)}`);
        setLoading(false);
        return;
      }

      if (detected.type === 'automation') {
        router.push(`/automations?prompt=${encodeURIComponent(prompt)}`);
        setLoading(false);
        return;
      }

      // fallback to Copilot API for ambiguous inputs
      const resp = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt }),
      });

      const parsed = await resp.json().catch(() => ({}));
      const action = parsed.action || { type: 'NOOP', payload: { prompt } };

      switch (action.type) {
        case 'CREATE_ESTIMATE':
          router.push(`/estimate?prompt=${encodeURIComponent(prompt)}`);
          break;
        case 'CREATE_PAGE':
          router.push(`/website-builder?prompt=${encodeURIComponent(prompt)}`);
          break;
        case 'CREATE_AUTOMATION':
          router.push(`/automations?prompt=${encodeURIComponent(prompt)}`);
          break;
        default:
          router.push(`/start?prompt=${encodeURIComponent(prompt)}`);
      }
    } catch (err) {
      setError('Unable to reach Copilot API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your project, and I'll build it for you"
        className="mt-3 min-h-40 w-full rounded-2xl border-2 border-amber-300/30 bg-black/25 px-4 py-4 text-xl font-medium placeholder:text-slate-400"
      />

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {[
          'Estimate a 2,000 sq ft house',
          'Build a landing page for framing services',
          'Create a lead follow-up automation',
          'Estimate windows for 2-story addition',
        ].map((c) => (
          <button
            key={c}
            onClick={() => setPrompt(c)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 hover:bg-white/10"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <button onClick={handleRun} disabled={loading} className="rounded-2xl bg-amber-400 px-6 py-3 font-bold text-slate-950 shadow-md hover:bg-amber-300 disabled:opacity-60">
          {loading ? 'Routing...' : 'Start Estimate'}
        </button>
        <button onClick={() => router.push('/estimate')} className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 font-semibold">Upload Plans</button>
        <button onClick={() => router.push('/website-builder')} className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 font-semibold">Build a Page</button>
        <button onClick={() => router.push('/automations')} className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 font-semibold">Create Automation</button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
