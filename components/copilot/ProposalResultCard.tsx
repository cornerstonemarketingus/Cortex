'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { ProposalRendererProps } from '@/components/copilot/ProposalRenderer';

const ProposalRenderer = dynamic(() => import('@/components/copilot/ProposalRenderer'), { ssr: false }) as React.ComponentType<ProposalRendererProps>;

interface ProposalTrade {
  tradeName: string;
  sqft: number;
  breakdown: {
    materialsTotal: number;
    laborTotal: number;
    subtotal: number;
    overheadAmount: number;
    taxAmount: number;
    profitAmount: number;
    total: number;
  };
}

interface Props {
  proposalData: {
    clientName?: string;
    contractorName?: string;
    projectAddress?: string;
    trades: ProposalTrade[];
    grandTotal: number;
    timeline?: { tradeName: string; startDay: number; durationDays: number }[];
  };
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function ProposalResultCard({ proposalData }: Props) {
  const [open, setOpen] = useState(false);
  const [fullProposal, setFullProposal] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const primaryTrade = proposalData.trades[0];

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      });
      const data = await res.json() as { proposal?: Record<string, unknown> };
      if (data.proposal) {
        setFullProposal(data.proposal);
        setOpen(true);
      }
    } catch {
      // fallback — open with data we have
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Card */}
      <div className="mt-3 rounded-xl border border-[#C69C6D]/30 bg-[#0d1826] overflow-hidden w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-[#150f06]/60 border-b border-[#C69C6D]/20">
          <div>
            <p className="text-xs text-[#C69C6D] uppercase tracking-widest font-semibold">Proposal Ready</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              {primaryTrade?.tradeName ?? 'Construction'} Proposal
            </p>
          </div>
          <span className="text-2xl">📄</span>
        </div>

        <div className="px-4 py-3 text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Client</span>
            <span className="text-slate-300">{proposalData.clientName ?? 'Valued Client'}</span>
          </div>
          <div className="flex justify-between">
            <span>Trade</span>
            <span className="text-slate-300">{primaryTrade?.tradeName ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Value</span>
            <span className="text-[#C69C6D] font-semibold">{fmt(proposalData.grandTotal)}</span>
          </div>
          {proposalData.timeline && proposalData.timeline.length > 0 && (
            <div className="flex justify-between">
              <span>Est. Duration</span>
              <span className="text-slate-300">
                {Math.max(...proposalData.timeline.map((p) => p.startDay + p.durationDays - 1))} working days
              </span>
            </div>
          )}
        </div>

        <div className="px-4 pb-3">
          <button
            onClick={generate}
            disabled={loading}
            className="w-full rounded-lg py-2 text-xs font-semibold bg-[#C69C6D]/20 text-[#C69C6D] border border-[#C69C6D]/30 hover:bg-[#C69C6D]/30 transition disabled:opacity-50"
          >
            {loading ? 'Generating…' : '📄 Open Full Proposal'}
          </button>
        </div>
      </div>

      {/* Full-screen proposal overlay */}
      {open && fullProposal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-white">
          <ProposalRenderer
            proposal={fullProposal as unknown as ProposalRendererProps['proposal']}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
