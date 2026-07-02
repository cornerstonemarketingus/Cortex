"use client";

import { useMemo, useState } from "react";
import { useBuilderDispatch } from '@/components/ai/BuilderStateProvider';

type EstimatorSessionResponse = {
  lead?: {
    id: string;
    firstName: string;
    email?: string | null;
    phone?: string | null;
    stage?: string;
  } | null;
  estimateRange?: {
    low: number;
    average: number;
    high: number;
    spreadPercent: number;
  };
  confidenceScore?: number;
  estimate?: {
    estimateId?: string;
    categoryLabel?: string;
    totals?: {
      grandTotal?: number;
      materials?: number;
      labor?: number;
      overhead?: number;
      profit?: number;
    };
    materials?: Array<{ item: string; quantity: number; unit: string; totalCost?: number }>;
    labor?: Array<{ trade: string; hours: number; totalCost?: number }>;
    assumptions?: string[];
  };
  scopeExtraction?: { assumptions?: string[] };
  preview?: { html?: string };
  error?: string;
};

type HandoffResponse = {
  handoffSummary?: { proposalId: string; checkoutUrl: string };
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type EstimatorChatbotPanelProps = {
  projectType: string;
  zipCode: string;
  description: string;
  onZipCodeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export default function EstimatorChatbotPanel({
  projectType,
  zipCode,
  description,
  onZipCodeChange,
  onDescriptionChange,
}: EstimatorChatbotPanelProps) {
  const [chatInput, setChatInput] = useState("Give me a fast range for this project.");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ready. Enter your ZIP code and project description, then click Run to get a cost range.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sandboxHtml, setSandboxHtml] = useState<string | null>(null);
  const [lastEstimate, setLastEstimate] = useState<EstimatorSessionResponse | null>(null);
  const [scopeAssumptions, setScopeAssumptions] = useState<string[]>([]);
  const [handoffLink, setHandoffLink] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(
    () => zipCode.trim().length >= 5 && description.trim().length >= 10,
    [zipCode, description],
  );

  const dispatch = useBuilderDispatch();

  const push = (role: ChatMessage["role"], text: string) => {
    setChatMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text },
    ]);
  };

  // Alias to avoid closure lint warnings
  const setChatMessages = setMessages;

  const runEstimate = async () => {
    if (loading || !canRun) return;
    const userText = chatInput.trim() || "Run estimate.";
    push("user", userText);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/estimating/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          firstName: firstName || "Guest",
          email: email || undefined,
          phone: phone || undefined,
          projectType,
          zipCode,
          description,
          userMessage: userText,
          files: attachedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as EstimatorSessionResponse;
      if (!res.ok || !data.estimateRange) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (data.lead?.id) setLeadId(data.lead.id);
      if (data.preview?.html) setSandboxHtml(data.preview.html);
      setScopeAssumptions(data.scopeExtraction?.assumptions ?? []);
      setLastEstimate(data);
      setHandoffLink(null);

      try {
        dispatch({
          type: "CREATE_ESTIMATE",
          payload: { scope: data.scopeExtraction?.assumptions ?? [], zip: zipCode, estimateRange: data.estimateRange },
        });
      } catch { /* ignore */ }

      const range = data.estimateRange;
      const conf = typeof data.confidenceScore === "number" ? ` · ${data.confidenceScore}% confidence` : "";
      push(
        "assistant",
        `Estimate ready${conf}\n\nRange:  ${fmt(range.low)} – ${fmt(range.high)}\nBest:   ${fmt(range.average)}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to run estimate right now.";
      setError(msg);
      push("assistant", `Something went wrong: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const runHandoff = async () => {
    if (!leadId || !lastEstimate?.estimate || handoffLoading) return;
    setHandoffLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/estimating/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, estimate: lastEstimate.estimate }),
      });

      const data = (await res.json().catch(() => ({}))) as HandoffResponse;
      if (!res.ok || !data.handoffSummary?.checkoutUrl) {
        throw new Error(data.error || `Handoff failed (${res.status})`);
      }

      setHandoffLink(data.handoffSummary.checkoutUrl);
      push("assistant", `Proposal ${data.handoffSummary.proposalId} created. Payment link is ready.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Handoff unavailable.";
      setError(msg);
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1117] p-5">
      <p className="text-xs uppercase tracking-widest text-slate-400">Estimator Chat</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-100">Instant cost range + live preview</h2>
      <p className="mt-1 text-sm text-slate-400">
        Enter project details below and click Run — no AI API key needed.
      </p>

      {/* Inputs */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs text-slate-400">
          ZIP code
          <input
            value={zipCode}
            onChange={(e) => onZipCodeChange(e.target.value)}
            placeholder="55123"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Project description
          <input
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Replace roof, update flashing, improve ventilation"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name (optional)" className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100" />
        <input value={email}     onChange={(e) => setEmail(e.target.value)}     placeholder="Email (optional)"      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100" />
        <input value={phone}     onChange={(e) => setPhone(e.target.value)}     placeholder="Phone (optional)"      className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100" />
      </div>

      <label className="mt-3 block text-xs text-slate-400">
        Plans / photos (optional — for scope extraction)
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setAttachedFiles(Array.from(e.target.files ?? []))}
          className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
        />
      </label>
      {attachedFiles.length > 0 && (
        <p className="mt-1 text-xs text-slate-400">{attachedFiles.map((f) => f.name).join(", ")}</p>
      )}

      {/* Chat window */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "border border-blue-500/20 bg-blue-500/10 text-blue-50"
                  : "border border-white/15 bg-white/8 text-slate-100"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void runEstimate(); }}
            placeholder="e.g. Focus on materials breakdown"
            className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => void runEstimate()}
            disabled={loading || !canRun}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {/* Estimate summary strip */}
      {lastEstimate?.estimateRange && (
        <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <span className="font-semibold">Latest range: </span>
          {fmt(lastEstimate.estimateRange.low)} – {fmt(lastEstimate.estimateRange.high)}
          <span className="text-slate-400"> · avg {fmt(lastEstimate.estimateRange.average)}</span>
          {lastEstimate.confidenceScore ? (
            <span className="text-slate-400"> · {lastEstimate.confidenceScore}% confidence</span>
          ) : null}
        </div>
      )}

      {/* Scope assumptions */}
      {scopeAssumptions.length > 0 && (
        <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-semibold">Extracted scope assumptions</p>
          <ul className="mt-1 space-y-0.5">
            {scopeAssumptions.slice(0, 8).map((a) => <li key={a}>· {a}</li>)}
          </ul>
        </div>
      )}

      {/* Handoff */}
      {leadId && lastEstimate?.estimate && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runHandoff()}
            disabled={handoffLoading}
            className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
          >
            {handoffLoading ? "Processing…" : "One-Click Handoff"}
          </button>
          {handoffLink && (
            <a
              href={handoffLink}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-xs font-semibold hover:bg-white/15"
            >
              Open Payment Link
            </a>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {/* Sandbox preview */}
      {sandboxHtml && (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white">
          <iframe title="Live project preview" srcDoc={sandboxHtml} className="h-[460px] w-full border-0" />
        </div>
      )}
    </section>
  );
}


