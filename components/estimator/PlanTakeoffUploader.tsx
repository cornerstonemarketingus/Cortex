"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type CategoryOption = { id: string; label: string };

type MaterialLine = { item: string; quantity: number; unit: string; unitCost: number; totalCost: number };
type LaborLine = { trade: string; hours: number; hourlyRate: number; totalCost: number };
type AiFindingItem = { item: string; quantity: number; unit: string; estimatedUnitCost: number; estimatedTotalCost: number };

type AiPlanFindings = {
  analyzed: boolean;
  scopeNotes: string[];
  items: AiFindingItem[];
  estimatedSubtotal: number;
};

type EstimateResult = {
  estimateId: string;
  categoryLabel: string;
  confidence: number;
  confidenceBreakdown: Record<string, number>;
  regionalFactor: number;
  inputSummary: string;
  calibrationBand: { low: number; expected: number; high: number; variancePercent: number };
  riskAdjustments: Array<{ factor: string; impactPercent: number; reason: string }>;
  materials: MaterialLine[];
  labor: LaborLine[];
  totals: { materials: number; labor: number; overhead: number; profit: number; grandTotal: number };
  timeline: { estimatedDays: number; crewSize: number };
  assumptions: string[];
  proposalMarkdown: string;
  aiPlanFindings: AiPlanFindings | null;
};

type TakeoffApiResponse = {
  estimate?: EstimateResult;
  usage?: { remainingCredits: number; tier: string | null };
  error?: string;
  code?: string;
};

type MetaResponse = {
  categories?: CategoryOption[];
  aiVision?: { enabled: boolean; supportedTypes: string[]; notes: string };
};

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string | null;
};

const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILES = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fileIcon(file: File): string {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return '\u{1F4C4}';
  return '\u{1F5BC}️';
}

function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildTakeoffCsv(estimate: EstimateResult): string {
  const rows: string[] = ['Section,Item,Quantity,Unit,Unit Cost,Total Cost'];

  estimate.materials.forEach((line) => {
    rows.push(
      `Materials,"${line.item.replace(/"/g, '""')}",${line.quantity},${line.unit},${line.unitCost},${line.totalCost}`
    );
  });
  estimate.labor.forEach((line) => {
    rows.push(
      `Labor,"${line.trade.replace(/"/g, '""')}",${line.hours},hours,${line.hourlyRate},${line.totalCost}`
    );
  });
  if (estimate.aiPlanFindings?.analyzed) {
    estimate.aiPlanFindings.items.forEach((line) => {
      rows.push(
        `AI-Detected (from plans),"${line.item.replace(/"/g, '""')}",${line.quantity},${line.unit},${line.estimatedUnitCost},${line.estimatedTotalCost}`
      );
    });
  }

  rows.push('');
  rows.push(`Totals,Materials,,,,${estimate.totals.materials}`);
  rows.push(`Totals,Labor,,,,${estimate.totals.labor}`);
  rows.push(`Totals,Overhead,,,,${estimate.totals.overhead}`);
  rows.push(`Totals,Profit,,,,${estimate.totals.profit}`);
  rows.push(`Totals,Grand Total,,,,${estimate.totals.grandTotal}`);

  return rows.join('\n');
}

export default function PlanTakeoffUploader() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [description, setDescription] = useState('');
  const [projectCategory, setProjectCategory] = useState('auto');
  const [zipCode, setZipCode] = useState('');
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [aiVisionEnabled, setAiVisionEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/estimating/takeoff', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: MetaResponse) => {
        if (cancelled) return;
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (data.aiVision) setAiVisionEnabled(Boolean(data.aiVision.enabled));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter((file) => {
      const lower = file.name.toLowerCase();
      return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    });

    setFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) break;
        next.push({
          id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        });
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      if (event.dataTransfer.files?.length) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const canSubmit = useMemo(() => {
    return (files.length > 0 || description.trim().length > 0) && subscriberEmail.trim().length > 3 && !loading;
  }, [files, description, subscriberEmail, loading]);

  const runTakeoff = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setEstimate(null);

    try {
      const formData = new FormData();
      files.forEach((entry) => formData.append('files', entry.file));
      if (description.trim()) formData.append('description', description.trim());
      if (projectCategory && projectCategory !== 'auto') formData.append('projectCategory', projectCategory);
      if (zipCode.trim()) formData.append('zipCode', zipCode.trim());
      formData.append('subscriberEmail', subscriberEmail.trim());

      const res = await fetch('/api/estimating/takeoff', { method: 'POST', body: formData });
      const data = (await res.json()) as TakeoffApiResponse;

      if (!res.ok || !data.estimate) {
        setError({ message: data.error || 'Unable to run takeoff analysis.', code: data.code });
        return;
      }

      setEstimate(data.estimate);
      setRemainingCredits(data.usage?.remainingCredits ?? null);
    } catch {
      setError({ message: 'Network error while running the takeoff. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [canSubmit, files, description, projectCategory, zipCode, subscriberEmail]);

  const isBillingError = error?.code === 'SUBSCRIPTION_REQUIRED' || error?.code === 'CREDITS_EXHAUSTED';

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
        {/* Upload + form column */}
        <Card className="lg:sticky lg:top-20">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold mb-3">1. Upload Plans</p>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? 'border-[#C69C6D] bg-[#C69C6D]/10' : 'border-white/15 bg-white/[0.02] hover:border-white/30'
            }`}
          >
            <p className="text-3xl mb-2">{'\u{1F4E4}'}</p>
            <p className="text-sm font-semibold text-slate-200">Drag & drop plans here, or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPG, WEBP &middot; up to {MAX_FILES} files</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(',')}
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) addFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>

          {files.length > 0 ? (
            <ul className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
              {files.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  {entry.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.previewUrl} alt="" className="h-9 w-9 rounded object-cover border border-white/10" />
                  ) : (
                    <span className="text-lg">{fileIcon(entry.file)}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">{entry.file.name}</p>
                    <p className="text-[11px] text-slate-500">{formatBytes(entry.file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFile(entry.id);
                    }}
                    aria-label={`Remove ${entry.file.name}`}
                    className="text-slate-500 hover:text-red-400 transition text-sm px-1"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-[11px] text-slate-500">
            {aiVisionEnabled
              ? 'AI vision reads PNG/JPG/WEBP plan images directly. PDFs contribute file-name and notes signal.'
              : 'AI vision analysis is not yet enabled on this environment — the estimator will use file names and your notes.'}
          </p>

          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold mb-3">2. Project Details</p>

          <div className="space-y-3">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='Describe the scope, e.g. "16x16 deck with composite railing and stairs"'
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#C69C6D]/50 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={projectCategory}
                onChange={(event) => setProjectCategory(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              >
                <option value="auto">Auto-detect category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>

              <input
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                placeholder="Zip code"
                inputMode="numeric"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </div>

            <input
              value={subscriberEmail}
              onChange={(event) => setSubscriberEmail(event.target.value)}
              placeholder="Account email (required for billing/usage)"
              type="email"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#C69C6D]/50 focus:outline-none"
            />
          </div>

          <Button
            type="button"
            onClick={runTakeoff}
            disabled={!canSubmit}
            className="mt-5 w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Running AI takeoff…' : 'Run AI Takeoff'}
          </Button>

          {remainingCredits !== null ? (
            <p className="mt-2 text-center text-[11px] text-slate-500">{remainingCredits} estimate-reader credits remaining</p>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-xs text-red-200">
              <p>{error.message}</p>
              {isBillingError ? (
                <Link href="/pricing#packages" className="mt-2 inline-block font-semibold text-red-100 underline">
                  View plans &amp; subscribe →
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Results column */}
        <div className="min-w-0">
          {loading ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C69C6D] border-t-transparent" />
              <p className="text-sm text-slate-300">Analyzing plans and building your quantity takeoff…</p>
            </Card>
          ) : !estimate ? (
            <Card className="py-20 text-center">
              <p className="text-4xl mb-3">{'\u{1F4D0}'}</p>
              <h2 className="text-lg font-semibold text-white">Your takeoff will appear here</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
                Upload plans and project details, then run AI takeoff to get a full itemized estimate with quantities, line items, and totals.
              </p>
            </Card>
          ) : (
            <TakeoffResults estimate={estimate} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent || 'text-white'}`}>{value}</p>
    </div>
  );
}

function LineItemsTable({
  title,
  columns,
  rows,
  totalLabel,
  total,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string>>;
  totalLabel: string;
  total: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/[0.04] text-slate-400 uppercase tracking-wide">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-white/5 text-slate-200">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-3 py-2 ${cellIndex === 0 ? '' : 'text-right tabular-nums'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/[0.03] font-semibold text-white">
              <td className="px-3 py-2" colSpan={columns.length - 1}>
                {totalLabel}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TakeoffResults({ estimate }: { estimate: EstimateResult }) {
  const bandSpan = Math.max(estimate.calibrationBand.high - estimate.calibrationBand.low, 1);
  const expectedPosition = ((estimate.calibrationBand.expected - estimate.calibrationBand.low) / bandSpan) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">{estimate.categoryLabel}</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(estimate.totals.grandTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">{estimate.inputSummary}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadBlob(buildTakeoffCsv(estimate), `takeoff-${estimate.estimateId.slice(0, 8)}.csv`, 'text/csv')}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                downloadBlob(estimate.proposalMarkdown, `proposal-${estimate.estimateId.slice(0, 8)}.md`, 'text/markdown')
              }
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Export Proposal
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Confidence" value={`${Math.round(estimate.confidenceBreakdown.overall * 100)}%`} accent="text-[#C69C6D]" />
          <StatTile label="Materials" value={formatCurrency(estimate.totals.materials)} />
          <StatTile label="Labor" value={formatCurrency(estimate.totals.labor)} />
          <StatTile label="Timeline" value={`${estimate.timeline.estimatedDays}d · ${estimate.timeline.crewSize} crew`} />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>{formatCurrency(estimate.calibrationBand.low)}</span>
            <span>Calibration band (&plusmn;{estimate.calibrationBand.variancePercent}%)</span>
            <span>{formatCurrency(estimate.calibrationBand.high)}</span>
          </div>
          <div className="relative h-2 rounded-full bg-white/10">
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-[#070b10] bg-[#C69C6D]"
              style={{ left: `calc(${Math.min(100, Math.max(0, expectedPosition))}% - 6px)` }}
            />
          </div>
        </div>
      </Card>

      {estimate.aiPlanFindings?.analyzed ? (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <span>{'✨'}</span> What the AI saw in your plans
          </h3>
          <ul className="space-y-1.5 text-sm text-slate-300 list-disc list-inside">
            {estimate.aiPlanFindings.scopeNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>

          {estimate.aiPlanFindings.items.length > 0 ? (
            <div className="mt-4">
              <LineItemsTable
                title="AI-detected quantities (rough placeholder pricing — verify against your supplier costs)"
                columns={['Item', 'Quantity', 'Unit', 'Est. Cost']}
                rows={estimate.aiPlanFindings.items.map((line) => [
                  line.item,
                  formatNumber(line.quantity),
                  line.unit,
                  formatCurrency(line.estimatedTotalCost),
                ])}
                totalLabel="AI-detected subtotal"
                total={formatCurrency(estimate.aiPlanFindings.estimatedSubtotal)}
              />
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <LineItemsTable
          title="Materials"
          columns={['Item', 'Quantity', 'Unit', 'Unit Cost', 'Total']}
          rows={estimate.materials.map((line) => [
            line.item,
            formatNumber(line.quantity),
            line.unit,
            formatCurrency(line.unitCost),
            formatCurrency(line.totalCost),
          ])}
          totalLabel="Materials total"
          total={formatCurrency(estimate.totals.materials)}
        />
      </Card>

      <Card>
        <LineItemsTable
          title="Labor"
          columns={['Trade', 'Hours', 'Rate', 'Total']}
          rows={estimate.labor.map((line) => [
            line.trade,
            formatNumber(line.hours),
            formatCurrency(line.hourlyRate),
            formatCurrency(line.totalCost),
          ])}
          totalLabel="Labor total"
          total={formatCurrency(estimate.totals.labor)}
        />
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Financial Summary</h3>
        <dl className="space-y-1.5 text-sm">
          {[
            ['Materials', estimate.totals.materials],
            ['Labor', estimate.totals.labor],
            ['Overhead', estimate.totals.overhead],
            ['Profit', estimate.totals.profit],
          ].map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-slate-300">
              <dt>{label}</dt>
              <dd className="tabular-nums">{formatCurrency(value as number)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-white">
            <dt>Grand Total</dt>
            <dd className="tabular-nums">{formatCurrency(estimate.totals.grandTotal)}</dd>
          </div>
        </dl>
      </Card>

      {estimate.assumptions.length > 0 ? (
        <Card>
          <h3 className="text-sm font-semibold text-white mb-2">Assumptions</h3>
          <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
            {estimate.assumptions.map((assumption, index) => (
              <li key={index}>{assumption}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
