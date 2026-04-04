'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  code: string;
  appTitle: string;
  appType: string;
}

export default function AppPreviewCard({ code, appTitle, appType }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeLabel = appType === 'crm' ? 'CRM Dashboard' : appType === 'dashboard' ? 'Dashboard' : 'Landing Page';

  return (
    <div className="mt-3 rounded-xl border border-blue-500/30 bg-[#0d1826] overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-950/40 border-b border-blue-500/20">
        <div>
          <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">{typeLabel}</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate max-w-xs">{appTitle}</p>
        </div>
        <span className="text-2xl">{appType === 'crm' ? '🗂️' : '🌐'}</span>
      </div>

      {/* Code preview */}
      <div className="relative">
        <div className="px-4 py-3 max-h-40 overflow-hidden">
          <pre className="text-[10px] text-slate-400 leading-relaxed overflow-hidden whitespace-pre-wrap">
            {code.slice(0, 400)}{code.length > 400 ? '\n…' : ''}
          </pre>
          {/* Fade gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d1826] to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2 border-t border-white/5">
        <button
          onClick={handleCopy}
          className="flex-1 min-w-[100px] rounded-lg py-2 text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-500/30 hover:bg-blue-900/80 transition text-center"
        >
          {copied ? '✓ Copied' : 'Copy Code'}
        </button>
        <Link
          href="/json-builder"
          className="flex-1 min-w-[100px] rounded-lg py-2 text-xs font-semibold bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition text-center"
        >
          Open Builder →
        </Link>
      </div>

      <p className="px-4 pb-3 text-[10px] text-slate-500">
        Paste this component into your project or open in Builder to customize.
      </p>
    </div>
  );
}
