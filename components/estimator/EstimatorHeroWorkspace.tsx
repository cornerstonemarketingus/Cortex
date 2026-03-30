"use client";

import { useState } from "react";
import { useBuilderDispatch } from '@/components/ai/BuilderStateProvider';
import { useRouter } from 'next/navigation';

export default function EstimatorHeroWorkspace() {
  const dispatch = useBuilderDispatch();
  const router = useRouter();

  const [sqft, setSqft] = useState(800);
  const [zip, setZip] = useState(55401);
  const [windows, setWindows] = useState(4);
  const [description, setDescription] = useState('General residential remodel');

  const quickPrompt = () => `Estimate a ${description} project: ${sqft} sqft, ${windows} windows, ZIP ${zip}`;

  const startEstimate = () => {
    const prompt = quickPrompt();
    // dispatch into builder state so BuilderCopilotPanel and other consumers can prefill
    dispatch({ type: 'CREATE_ESTIMATE', payload: { prompt, sqft, zip, windows, description, source: 'hero' } });
    // navigate to estimate page with prefill hint
    router.push(`/estimate?prefill=1&zip=${zip}&sqft=${sqft}`);
  };

  return (
    <section className="mt-6 rounded-3xl border p-6 md:p-8" style={{ borderColor: 'rgba(11,74,115,0.28)', background: 'linear-gradient(160deg, var(--brand-900) 0%, var(--brand-800) 42%, rgba(19,38,46,0.65) 100%)' }}>
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--accent-500)' }}>Estimator Workspace</p>
      <h2 className="mt-2 text-3xl font-semibold text-white md:text-5xl">Get a quick estimate</h2>
      <p className="mt-3 max-w-3xl text-sm md:text-base" style={{ color: 'var(--muted-400)' }}>Enter a few project details and start a Copilot-guided estimate with location-aware pricing.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-card-bg p-4 bg-[var(--card-bg)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs" style={{ color: 'var(--muted-400)' }}>Project size (sqft)
              <input value={sqft} onChange={(e) => setSqft(Number(e.target.value))} type="number" className="mt-2 w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--muted-400)' }} />
            </label>

            <label className="text-xs" style={{ color: 'var(--muted-400)' }}>ZIP code
              <input value={zip} onChange={(e) => setZip(Number(e.target.value))} type="number" className="mt-2 w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--muted-400)' }} />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs" style={{ color: 'var(--muted-400)' }}>Windows
              <input value={windows} onChange={(e) => setWindows(Number(e.target.value))} type="number" className="mt-2 w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--muted-400)' }} />
            </label>

            <label className="text-xs" style={{ color: 'var(--muted-400)' }}>Short description
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--muted-400)' }} />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => startEstimate()} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ background: 'var(--accent-600)', color: '#0f1216' }}>Start Your Free Estimate</button>
            <button onClick={() => dispatch({ type: 'CREATE_ESTIMATE', payload: { prompt: quickPrompt(), sqft, zip, windows, description } })} className="rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-400)' }}>Save to Builder</button>
          </div>
        </article>

        <article className="rounded-2xl border border-card-bg p-4 bg-[var(--card-bg)]">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--muted-400)' }}>Estimator Assistant</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-400)' }}>Copilot will use ZIP-aware market pricing and show assumptions, confidence, and suggested follow-ups on the estimate page.</p>

          <div className="mt-3 space-y-2 text-xs" style={{ color: 'var(--muted-400)' }}>
            <div className="rounded-lg px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.08)' }}>Tip: include site notes to improve accuracy (roof access, deck height, permit needs).</div>
            <div className="rounded-lg px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.08)' }}>Tip: enter a phone or email to get a generated follow-up sequence with the estimate.</div>
          </div>
        </article>
      </div>
    </section>
  );
}
