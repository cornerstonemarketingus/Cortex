"use client";

import { useState } from 'react';

type Props = {
  setPromptParam: (p: string) => void;
  setScope: (s: string) => void;
};

const STEPS = [
  {
    title: '1) Describe the trigger',
    hint: 'Choose what starts the automation: new lead form, missed call, or payment received.',
    sample: 'Trigger: new lead form submission from website',
  },
  {
    title: '2) Pick the outcome',
    hint: 'Decide the primary outcome: instant reply, create estimate, schedule call, or send proposal.',
    sample: 'Outcome: send instant SMS reply + create draft estimate',
  },
  {
    title: '3) Activate',
    hint: 'Run the pack and monitor delivery in the health panel. You can rollback if needed.',
    sample: 'Activate: enable follow-up pack and monitor health',
  },
];

export default function QuickstartTour({ setPromptParam, setScope }: Props) {
  const [step, setStep] = useState(0);
  const [text, setText] = useState(STEPS[0].sample);

  function applyStep() {
    const prompt = `${STEPS[step].title}: ${text}`;
    setPromptParam(prompt);
    setScope(prompt);
  }

  return (
    <div className="rounded-xl border border-card-bg bg-[var(--card-bg)] p-4">
      <h3 className="text-sm font-semibold text-white">Interactive Quickstart</h3>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted-400)' }}>Step {step + 1} of {STEPS.length}: {STEPS[step].title}</p>

      <p className="mt-3 text-xs" style={{ color: 'var(--muted-400)' }}>{STEPS[step].hint}</p>

      <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-2 w-full rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--muted-400)' }} />

      <div className="mt-2 rounded-md p-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div className="text-xs" style={{ color: 'var(--muted-400)' }}>Preview</div>
        <div className="mt-1 text-sm" style={{ color: 'white' }}>{`${STEPS[step].title}: ${text}`}</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => { applyStep(); if (step < STEPS.length - 1) setStep(step + 1); }} className="rounded-md px-3 py-2 text-sm font-semibold" style={{ background: 'var(--brand-600)', color: 'white' }}>Apply & Next</button>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-400)', opacity: step === 0 ? 0.5 : 1 }}>Back</button>
        <button onClick={() => { applyStep(); }} className="ml-auto rounded-md px-3 py-2 text-sm" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted-400)' }}>Apply to Copilot</button>
      </div>
    </div>
  );
}
