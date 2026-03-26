"use client";

import { useMemo, useState } from "react";

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
  scopeExtraction?: {
    assumptions?: string[];
  };
  preview?: {
    html?: string;
  };
  error?: string;
};

type HandoffResponse = {
  handoffSummary?: {
    proposalId: string;
    checkoutUrl: string;
  };
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

function generateProjectPrompt(projectType: string, zipCode: string, description: string) {
  return [
    `Build an interactive ${projectType} estimate landing experience.`,
    `Target ZIP: ${zipCode}.`,
    `Project context: ${description}`,
    "Include one clear CTA to request an exact quote and one trust section.",
  ].join(" ");
}

export default function EstimatorChatbotPanel({
  projectType,
  zipCode,
  description,
  onZipCodeChange,
  onDescriptionChange,
}: EstimatorChatbotPanelProps) {
  const [chatInput, setChatInput] = useState("Give me a fast range and show me a live landing preview for this project.");
  const [firstName, setFirstName] = useState("Jordan");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "assistant-1",
      role: "assistant",
      text: "Estimator Chat is ready. Add ZIP + project description, then I will return a cost range and generate a live project preview.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [sandboxHtml, setSandboxHtml] = useState<string | null>(null);
  const [lastEstimate, setLastEstimate] = useState<EstimatorSessionResponse | null>(null);
  const [scopeAssumptions, setScopeAssumptions] = useState<string[]>([]);
  const [handoffLink, setHandoffLink] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => zipCode.trim().length >= 5 && description.trim().length >= 12, [zipCode, description]);

  const pushMessage = (role: ChatMessage["role"], text: string) => {
    setChatMessages((current) => [
      ...current,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
      },
    ]);
  };

  const runEstimatorChat = async () => {
    if (loading || !canRun) return;

    const userText = chatInput.trim() || "Run estimate and generate preview.";
    pushMessage("user", userText);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/estimating/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          firstName,
          email,
          phone,
          projectType,
          zipCode,
          squareFootage: undefined,
          description,
          budget: "",
          timeline: "",
          userMessage: userText,
          files: attachedFiles.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as EstimatorSessionResponse;
      if (!response.ok || !parsed.estimateRange) {
        throw new Error(parsed.error || `Estimator request failed (${response.status})`);
      }

      if (parsed.lead?.id) {
        setLeadId(parsed.lead.id);
      }

      if (parsed.preview?.html) {
        setSandboxHtml(parsed.preview.html);
      }

      setScopeAssumptions(parsed.scopeExtraction?.assumptions || []);
      setLastEstimate(parsed);
      setHandoffLink(null);

      const estimateText = `Range: $${parsed.estimateRange.low.toLocaleString("en-US")} - $${parsed.estimateRange.high.toLocaleString("en-US")} (avg $${parsed.estimateRange.average.toLocaleString("en-US")}).`;
      const confidence = typeof parsed.confidenceScore === "number" ? ` Confidence: ${parsed.confidenceScore}%.` : "";
      const scopeNote = parsed.scopeExtraction?.assumptions?.length ? ` Scope assumptions extracted: ${parsed.scopeExtraction.assumptions.length}.` : "";
      pushMessage(
        "assistant",
        `${estimateText}${confidence} Live preview re-rendered from your command.${scopeNote}`
      );
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Unable to run estimator chat right now.";
      setError(message);
      pushMessage("assistant", `I hit an issue: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const runOneClickHandoff = async () => {
    if (!leadId || !lastEstimate?.estimate || handoffLoading) return;

    setHandoffLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/estimating/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          estimate: lastEstimate.estimate,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as HandoffResponse;
      if (!response.ok || !parsed.handoffSummary?.checkoutUrl) {
        throw new Error(parsed.error || `Handoff failed (${response.status})`);
      }

      setHandoffLink(parsed.handoffSummary.checkoutUrl);
      pushMessage(
        "assistant",
        `Handoff complete. Proposal ${parsed.handoffSummary.proposalId} is ready and payment link has been generated.`
      );
    } catch (handoffError) {
      const message = handoffError instanceof Error ? handoffError.message : "Unable to complete one-click handoff.";
      setError(message);
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">Main Estimator Chat</p>
      <h2 className="mt-2 text-xl font-semibold text-cyan-50">Chat-first estimate intake with live sandbox preview</h2>
      <p className="mt-2 text-sm text-slate-200">
        Enter ZIP and project description below, then chat to generate an estimate range plus a live landing preview tailored to this project.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs text-slate-200">
          ZIP code
          <input
            value={zipCode}
            onChange={(event) => onZipCodeChange(event.target.value)}
            placeholder="55123"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-xs text-slate-200">
          Project description
          <input
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Replace roof, update flashing, and improve ventilation."
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <input
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name"
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email for lead resume"
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Phone"
          className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        />
      </div>

      <label className="mt-2 block text-xs text-slate-200">
        Drag plans/photos (or browse) for auto scope extraction
        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(event) => setAttachedFiles(Array.from(event.target.files || []))}
          className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
        />
      </label>

      {attachedFiles.length > 0 ? (
        <p className="mt-2 text-xs text-cyan-100">Attached files: {attachedFiles.map((file) => file.name).join(", ")}</p>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/15 bg-black/25 p-3">
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "assistant"
                  ? "rounded-lg border border-cyan-200/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-50"
                  : "rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100"
              }
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            className="w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
            placeholder="Ask for price range, scope cuts, and conversion improvements"
          />
          <button
            type="button"
            onClick={() => void runEstimatorChat()}
            disabled={loading || !canRun}
            className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {loading ? "Running..." : "Run Estimator Chat"}
          </button>
        </div>
      </div>

      {lastEstimate?.estimateRange ? (
        <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          Latest range: ${lastEstimate.estimateRange.low.toLocaleString("en-US")} - ${lastEstimate.estimateRange.high.toLocaleString("en-US")} (avg
          {' '}${lastEstimate.estimateRange.average.toLocaleString("en-US")})
          {lastEstimate.confidenceScore ? ` | Confidence ${lastEstimate.confidenceScore}%` : ""}
        </div>
      ) : null}

      {scopeAssumptions.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-semibold">Scope assumptions from uploads/chat context</p>
          <ul className="mt-1 space-y-1">
            {scopeAssumptions.slice(0, 8).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {leadId && lastEstimate?.estimate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runOneClickHandoff()}
            disabled={handoffLoading}
            className="rounded-lg border border-amber-300/45 bg-amber-400/80 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-60"
          >
            {handoffLoading ? "Handing Off..." : "One-Click Handoff: Proposal + Payment + Follow-up"}
          </button>
          {handoffLink ? (
            <a href={handoffLink} target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
              Open Payment Link
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

      {sandboxHtml ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-white">
          <iframe title="Estimator live project preview" srcDoc={sandboxHtml} className="h-[460px] w-full border-0" />
        </div>
      ) : null}
    </section>
  );
}
