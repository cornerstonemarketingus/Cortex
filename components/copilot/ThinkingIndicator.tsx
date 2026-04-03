'use client';

import { useEffect, useState } from 'react';

interface ThinkingIndicatorProps {
  steps: string[];
  isActive: boolean;
}

export default function ThinkingIndicator({ steps, isActive }: ThinkingIndicatorProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setVisibleCount(steps.length);
      return;
    }
    setVisibleCount(0);
    if (steps.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= steps.length) clearInterval(interval);
    }, 420);
    return () => clearInterval(interval);
  }, [steps, isActive]);

  return (
    <div className="flex flex-col gap-1.5 py-2">
      {/* Thinking header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span className="text-[11px] uppercase tracking-widest text-amber-400/80 font-medium">
          {isActive ? 'Thinking…' : 'Done thinking'}
        </span>
      </div>

      {/* Step list */}
      <div className="border-l border-amber-500/30 pl-3 space-y-1.5">
        {steps.slice(0, visibleCount).map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 text-xs text-slate-400 animate-fade-in"
            style={{ animationDuration: '300ms' }}
          >
            <svg
              className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500/70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{step}</span>
          </div>
        ))}
        {isActive && visibleCount < steps.length && (
          <div className="text-xs text-slate-500 italic pl-5 animate-pulse">Processing…</div>
        )}
      </div>
    </div>
  );
}
