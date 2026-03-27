"use client";

import { useState } from "react";

type ChatResponse = {
  responses?: string[];
  teamDecision?: string;
  error?: string;
};

type IntakeResponse = {
  summary?: string;
  chatbotSnippet?: string;
  voiceReceptionistPlan?: string[];
  hostingOffer?: string[];
  tokenRecommendation?: {
    id: string;
    name: string;
    tokens: number;
    priceUsd: number;
    notes: string;
  };
  businessBoosterPlan?: string[];
  error?: string;
};

type BuildResponse = {
  response?: {
    summary?: string;
    nextActions?: string[];
  };
  error?: string;
};

type PreviewResponse = {
  preview?: {
    html?: string;
  };
  error?: string;
};

type BuilderCopilotPanelProps = {
  title?: string;
  subtitle?: string;
  defaultPrompt?: string;
  contextLabel?: string;
  showProvisioning?: boolean;
  buildMode?: "website" | "app";
};

export default function BuilderCopilotPanel({
  title = "Builder Copilot",
  subtitle = "Ask for implementation-ready code, conversion improvements, and launch steps.",
  defaultPrompt = "Help me improve conversion and generate exact implementation steps.",
  contextLabel = "general",
  showProvisioning = true,
  buildMode,
}: BuilderCopilotPanelProps) {
  const [assistantMode, setAssistantMode] = useState<"execute" | "discuss" | "confirm">("execute");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [provisioning, setProvisioning] = useState<IntakeResponse | null>(null);
  const [provisioningLoading, setProvisioningLoading] = useState(false);
  const [provider, setProvider] = useState<"twilio" | "cortex-voice-core">("cortex-voice-core");
  const [showBoosterIntake, setShowBoosterIntake] = useState(buildMode !== "website");

  const [buildLoading, setBuildLoading] = useState(false);
  const [buildSummary, setBuildSummary] = useState<string | null>(null);
  const [buildActions, setBuildActions] = useState<string[]>([]);
  const [buildPreviewHtml, setBuildPreviewHtml] = useState<string | null>(null);

  const runCopilot = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bots",
          botIds: [1, 2, 4, 6],
          includeTeamDecision: true,
          tone: "support",
          message:
            assistantMode === "discuss"
              ? `Builder Copilot discuss mode for ${contextLabel}. Help plan, reason, and sequence work without executing actions. Request: ${prompt}`
              : assistantMode === "confirm"
                ? `Builder Copilot confirm mode for ${contextLabel}. Propose staged actions and risk checks before execution. Request: ${prompt}`
                : `Builder Copilot execute mode for ${contextLabel}. Provide implementation-ready steps, precise code actions, and quality checks. Request: ${prompt}`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || (!parsed.teamDecision && !parsed.responses?.[0])) {
        throw new Error(parsed.error || `Copilot request failed (${response.status})`);
      }

      setOutput(parsed.teamDecision || parsed.responses?.[0] || null);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to run Builder Copilot right now.");
    } finally {
      setLoading(false);
    }
  };

  const configureBusiness = async () => {
    if (provisioningLoading) return;
    if (!businessName.trim() && !websiteUrl.trim() && !phoneNumber.trim()) return;

    setProvisioningLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/builder-copilot/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          websiteUrl,
          phoneNumber,
          email,
          context: contextLabel,
          provider,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as IntakeResponse;
      if (!response.ok || !parsed.summary) {
        throw new Error(parsed.error || `Provisioning failed (${response.status})`);
      }

      setProvisioning(parsed);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to configure business booster right now.");
    } finally {
      setProvisioningLoading(false);
    }
  };

  const runInstantBuild = async () => {
    if (!buildMode || !prompt.trim() || buildLoading) return;

    setBuildLoading(true);
    setError(null);

    try {
      const planResponse = await fetch("/api/builder/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          blueprint: buildMode,
          mode: "visitor",
          includeDomainSales: true,
          includeAutonomousIdeas: true,
        }),
      });

      const planParsed = (await planResponse.json().catch(() => ({}))) as BuildResponse;
      if (!planResponse.ok || !planParsed.response?.summary) {
        throw new Error(planParsed.error || `Build planning failed (${planResponse.status})`);
      }

      setBuildSummary(planParsed.response.summary);
      setBuildActions(planParsed.response.nextActions || []);

      const previewResponse = await fetch("/api/sandbox/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: buildMode,
          prompt,
          projectName: businessName.trim() || "Builder Copilot Project",
        }),
      });

      const previewParsed = (await previewResponse.json().catch(() => ({}))) as PreviewResponse;
      if (previewResponse.ok && previewParsed.preview?.html) {
        setBuildPreviewHtml(previewParsed.preview.html);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unable to generate instant build right now.");
    } finally {
      setBuildLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
      <h2 className="text-lg font-semibold text-cyan-100">{title}</h2>
      <p className="mt-1 text-xs text-cyan-50/90">{subtitle}</p>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-3 min-h-20 w-full rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-sm"
      />

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {([
          { id: "execute", label: "Execute" },
          { id: "discuss", label: "Discuss" },
          { id: "confirm", label: "Confirm" },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAssistantMode(item.id)}
            className={`rounded border px-2 py-1 font-semibold ${assistantMode === item.id ? "border-cyan-300/55 bg-cyan-500/20 text-cyan-50" : "border-white/20 bg-white/5 text-slate-300"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        {[
          "Build my website",
          "Create estimate for a deck",
          "Turn on autopilot",
        ].map((quick) => (
          <button
            key={quick}
            type="button"
            onClick={() => setPrompt(quick)}
            className="rounded border border-cyan-300/35 bg-cyan-500/10 px-2 py-1 text-cyan-50 hover:bg-cyan-500/20"
          >
            {quick}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void runCopilot()}
        disabled={loading}
        className="mt-3 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
      >
        {loading ? "Running..." : "Run Builder Copilot"}
      </button>

      {buildMode ? (
        <button
          type="button"
          onClick={() => void runInstantBuild()}
          disabled={buildLoading}
          className="ml-2 mt-3 rounded-lg border border-cyan-300/45 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/30 disabled:opacity-60"
        >
          {buildLoading ? "Building..." : "Generate 80% Build Instantly"}
        </button>
      ) : null}

      {output ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">
          {output}
        </pre>
      ) : null}

      {buildPreviewHtml && !provisioning?.chatbotSnippet ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-white">
          <iframe title="Builder Copilot preview" srcDoc={buildPreviewHtml} className="h-[460px] w-full border-0" />
        </div>
      ) : null}

      {showProvisioning ? (
        <div className="mt-5 rounded-xl border border-white/15 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Business Booster Intake</p>
          <p className="mt-1 text-xs text-slate-300">Enter business details to generate voice receptionist + chatbot setup instructions and embed code.</p>

          {buildMode === "website" ? (
            <button
              type="button"
              onClick={() => setShowBoosterIntake((current) => !current)}
              className="mt-3 rounded-lg border border-cyan-300/45 bg-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/30"
            >
              {showBoosterIntake ? "Hide Intake Fields" : "Open Business Booster Intake"}
            </button>
          ) : null}

          {showBoosterIntake ? (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Business name"
              className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Business email"
              className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
            />
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="Business phone for voice AI"
              className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
            />
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              placeholder="Website URL for chatbot"
              className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
            />
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as "twilio" | "cortex-voice-core")}
              className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-xs"
            >
              <option value="cortex-voice-core">Builder Copilot Voice Cloud</option>
              <option value="twilio">Builder Copilot Voice Bridge</option>
            </select>
          </div>
          ) : null}

          <button
            type="button"
            onClick={() => void configureBusiness()}
            disabled={provisioningLoading}
            className="mt-3 rounded-lg border border-cyan-300/45 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {provisioningLoading ? "Configuring..." : "Configure Voice + Chatbot"}
          </button>

          {provisioning ? (
            <div className="mt-3 space-y-3 text-xs text-slate-200">
              <p>{provisioning.summary}</p>

              {provisioning.voiceReceptionistPlan?.length ? (
                <div>
                  <p className="text-cyan-100">Voice receptionist steps</p>
                  <ul className="mt-1 space-y-1 text-slate-300">
                    {provisioning.voiceReceptionistPlan.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {provisioning.hostingOffer?.length ? (
                <div>
                  <p className="text-cyan-100">Managed hosting offer</p>
                  <ul className="mt-1 space-y-1 text-slate-300">
                    {provisioning.hostingOffer.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {provisioning.tokenRecommendation ? (
                <div className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 p-2">
                  <p className="text-cyan-100">Recommended token package: {provisioning.tokenRecommendation.name}</p>
                  <p className="mt-1 text-slate-300">{provisioning.tokenRecommendation.tokens.toLocaleString()} tokens at ${provisioning.tokenRecommendation.priceUsd}/mo</p>
                  <p className="mt-1 text-slate-400">{provisioning.tokenRecommendation.notes}</p>
                </div>
              ) : null}

              {provisioning.businessBoosterPlan?.length ? (
                <div>
                  <p className="text-cyan-100">Business booster checklist</p>
                  <ul className="mt-1 space-y-1 text-slate-300">
                    {provisioning.businessBoosterPlan.map((step) => (
                      <li key={step}>- {step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {provisioning.chatbotSnippet ? (
                <div>
                  <p className="text-cyan-100">Copilot-generated embed code</p>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-white/15 bg-black/40 p-2 text-[11px] text-slate-200">{provisioning.chatbotSnippet}</pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      {buildSummary ? (
        <div className="mt-4 rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">
          <p>{buildSummary}</p>
          {buildActions.length ? (
            <ul className="mt-2 space-y-1 text-slate-300">
              {buildActions.slice(0, 6).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {buildPreviewHtml && provisioning?.chatbotSnippet ? (
        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-white/15 bg-white">
            <iframe title="Builder Copilot live sandbox" srcDoc={buildPreviewHtml} className="h-[460px] w-full border-0" />
          </div>
          <div className="rounded-xl border border-white/15 bg-black/25 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Copilot Typed Code</p>
            <pre className="mt-2 h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/15 bg-black/40 p-2 text-[11px] text-slate-200">{provisioning.chatbotSnippet}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
