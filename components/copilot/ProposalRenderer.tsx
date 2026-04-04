'use client';

interface ProposalTrade {
  name: string;
  sqft?: number;
  materials?: string;
  labor?: string;
  overhead?: string;
  tax?: string;
  profit?: string;
  subtotal: string;
  scope?: string;
}

interface TimelinePhase {
  tradeName: string;
  startDay: number;
  durationDays: number;
}

interface ProposalMeta {
  proposalDate: string;
  clientName: string;
  projectAddress: string;
  contractorName: string;
  validUntil: string;
}

interface ProposalSection {
  id: string;
  title: string;
  content?: string;
  trades?: ProposalTrade[];
  grandTotal?: string;
  phases?: TimelinePhase[];
}

interface Proposal {
  meta: ProposalMeta;
  sections: ProposalSection[];
}

interface Props {
  proposal: Proposal;
  onClose?: () => void;
}

export type ProposalRendererProps = Props;

function fmt(s?: string) {
  return s ?? '—';
}

export default function ProposalRenderer({ proposal, onClose }: Props) {
  const { meta, sections } = proposal;

  const scope = sections.find((s) => s.id === 'scope');
  const overview = sections.find((s) => s.id === 'overview');
  const estimate = sections.find((s) => s.id === 'estimate');
  const timeline = sections.find((s) => s.id === 'timeline');
  const notes = sections.find((s) => s.id === 'notes');
  const terms = sections.find((s) => s.id === 'terms');

  const maxDuration = timeline?.phases
    ? Math.max(...timeline.phases.map((p) => p.startDay + p.durationDays - 1), 1)
    : 1;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="proposal-wrapper bg-white text-gray-900 min-h-screen font-sans print:p-0">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden flex items-center justify-between bg-[#0b0d12] border-b border-white/10 px-6 py-3">
        <p className="text-sm font-semibold text-white">Client Proposal Preview</p>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A5F]/80 transition"
          >
            Print / Save PDF
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Proposal document */}
      <div className="mx-auto max-w-4xl px-8 py-10 print:px-0 print:py-0">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Construction Proposal</p>
            <h1 className="text-2xl font-bold text-gray-900">{meta.contractorName}</h1>
            <p className="text-sm text-gray-500 mt-1">Prepared for {meta.clientName}</p>
            {meta.projectAddress && meta.projectAddress !== 'TBD' && (
              <p className="text-sm text-gray-500">{meta.projectAddress}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400 space-y-1">
            <p>Date: <span className="text-gray-700 font-medium">{meta.proposalDate}</span></p>
            <p>Valid Until: <span className="text-gray-700 font-medium">{meta.validUntil}</span></p>
          </div>
        </div>

        {/* Project Overview */}
        {overview && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Project Overview
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{overview.content}</p>
          </section>
        )}

        {/* Scope of Work */}
        {scope && scope.trades && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Scope of Work
            </h2>
            <div className="space-y-4">
              {scope.trades.map((trade) => (
                <div key={trade.name} className="pl-4 border-l-2 border-gray-200">
                  <p className="text-sm font-semibold text-gray-800">{trade.name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{trade.scope ?? `Professional ${trade.name.toLowerCase()} services.`}</p>
                  {trade.sqft && <p className="text-xs text-gray-400 mt-0.5">{trade.sqft.toLocaleString()} sqft</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Itemized Estimate */}
        {estimate && estimate.trades && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Itemized Estimate
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Trade</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Materials</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Labor</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Overhead + Tax</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {estimate.trades.map((trade, i) => (
                  <tr key={trade.name} className={i % 2 === 0 ? 'bg-white border border-gray-100' : 'bg-gray-50/60 border border-gray-100'}>
                    <td className="px-3 py-2 font-medium text-gray-800">{trade.name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(trade.materials)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(trade.labor)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {trade.overhead && trade.tax ? `${trade.overhead} / ${trade.tax}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">{trade.subtotal}</td>
                  </tr>
                ))}
                <tr className="bg-gray-900 text-white">
                  <td className="px-3 py-2.5 font-bold" colSpan={4}>Total Project Cost</td>
                  <td className="px-3 py-2.5 text-right font-bold text-lg">{estimate.grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Timeline */}
        {timeline && timeline.phases && timeline.phases.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Project Timeline
            </h2>
            <div className="space-y-2">
              {timeline.phases.map((phase) => {
                const leftPct = ((phase.startDay - 1) / maxDuration) * 100;
                const widthPct = Math.max(4, (phase.durationDays / maxDuration) * 100);
                return (
                  <div key={phase.tradeName} className="flex items-center gap-3">
                    <div className="w-36 text-xs text-gray-600 text-right pr-2 shrink-0">{phase.tradeName}</div>
                    <div className="flex-1 h-6 bg-gray-100 rounded relative overflow-hidden">
                      <div
                        className="absolute top-0 h-full rounded bg-[#1E3A5F] flex items-center justify-center"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        <span className="text-[9px] text-white font-medium px-1 truncate">{phase.durationDays}d</span>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-gray-400 shrink-0">Day {phase.startDay}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-400">Total estimated duration: {maxDuration} working days</p>
          </section>
        )}

        {/* Notes */}
        {notes && notes.content && notes.content !== 'No additional notes.' && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Project Notes
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{notes.content}</p>
          </section>
        )}

        {/* Terms */}
        {terms && (
          <section className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 border-b border-gray-100 pb-1">
              Terms & Conditions
            </h2>
            <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed font-sans">{terms.content}</pre>
          </section>
        )}

        {/* Signature block */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">Contractor Signature</p>
              <div className="border-b border-gray-300 mb-2 h-8" />
              <p className="text-xs text-gray-500">{meta.contractorName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">Client Signature</p>
              <div className="border-b border-gray-300 mb-2 h-8" />
              <p className="text-xs text-gray-500">{meta.clientName}</p>
            </div>
          </div>
          <p className="mt-6 text-xs text-gray-400 text-center">
            By signing above, both parties agree to the scope, cost, and terms outlined in this proposal.
          </p>
        </section>
      </div>
    </div>
  );
}
