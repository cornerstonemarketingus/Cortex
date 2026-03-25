"use client";

import Link from "next/link";
import { useState } from "react";
import CortexTopTabs from "@/components/navigation/CortexTopTabs";

type ChatResponse = {
  responses?: string[];
  error?: string;
};

export default function AiAutomationSolutionsPage() {
  const [businessType, setBusinessType] = useState("roofing and exterior services");
  const [objective, setObjective] = useState("Book qualified appointments and handle missed calls");
  const [voicemailScript, setVoicemailScript] = useState<string | null>(null);
  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("How should my receptionist handle new leads after hours?");
  const [chatOutput, setChatOutput] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const generateVoicemailScript = async () => {
    if (loadingScript) return;

    setLoadingScript(true);
    setScriptError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assistant",
          tone: "sales",
          message: `Write an AI receptionist voicemail script for a ${businessType} business. Objective: ${objective}. Keep it short, natural, and conversion-focused with a strong callback CTA.`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || !parsed.responses?.[0]) {
        throw new Error(parsed.error || `Script generation failed (${response.status})`);
      }

      setVoicemailScript(parsed.responses[0]);
    } catch (runError) {
      setScriptError(runError instanceof Error ? runError.message : "Unable to generate script right now.");
    } finally {
      setLoadingScript(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || loadingChat) return;

    setLoadingChat(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "assistant",
          tone: "friendly",
          message: chatInput.trim(),
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse;
      if (!response.ok || !parsed.responses?.[0]) {
        throw new Error(parsed.error || `Chat response failed (${response.status})`);
      }

      setChatOutput(parsed.responses[0]);
    } catch (runError) {
      setChatError(runError instanceof Error ? runError.message : "Unable to process chat right now.");
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#121323] via-[#20203a] to-[#121722] text-slate-100">
      <CortexTopTabs />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="glass rise-in rounded-3xl p-7">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-200">AI Automation Destination</p>
          <h1 className="mt-2 text-4xl font-semibold md:text-5xl">AI Voicemail Receptionist + Chat</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-200 md:text-base">
            This page is intentionally focused for client selling: generate receptionist voicemail scripts and run a live
            AI chat experience in one clean interface.
          </p>
        </header>

        <section className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-indigo-300/35 bg-indigo-500/12 p-5">
            <h2 className="text-xl font-semibold text-indigo-100">AI Voicemail Receptionist</h2>

            <label className="mt-3 block text-xs text-indigo-50">
              Business type
              <input
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <label className="mt-3 block text-xs text-indigo-50">
              Objective
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={() => void generateVoicemailScript()}
              disabled={loadingScript}
              className="mt-4 rounded-xl bg-indigo-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-indigo-200 disabled:opacity-60"
            >
              {loadingScript ? "Generating..." : "Generate Receptionist Script"}
            </button>

            {scriptError ? <p className="mt-3 text-sm text-red-300">{scriptError}</p> : null}

            {voicemailScript ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/15 bg-black/25 p-3 text-xs text-slate-200">
                {voicemailScript}
              </pre>
            ) : null}
          </article>

          <article className="rounded-2xl border border-cyan-300/35 bg-cyan-500/12 p-5">
            <h2 className="text-xl font-semibold text-cyan-100">Live AI Chat Box</h2>
            <p className="mt-2 text-sm text-slate-300">
              Use this for sales demos to show real-time objection handling and follow-up guidance.
            </p>

            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="mt-3 min-h-24 w-full rounded-xl border border-white/25 bg-black/30 px-3 py-2 text-sm"
            />

            <button
              type="button"
              onClick={() => void sendChat()}
              disabled={loadingChat}
              className="mt-3 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loadingChat ? "Thinking..." : "Run AI Chat"}
            </button>

            {chatError ? <p className="mt-3 text-sm text-red-300">{chatError}</p> : null}

            {chatOutput ? (
              <div className="mt-4 rounded-xl border border-white/15 bg-black/25 p-3 text-sm text-slate-200 whitespace-pre-wrap">
                {chatOutput}
              </div>
            ) : null}
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
          Need full CRM pipeline and automation delivery? Continue to <Link href="/builder-copilot" className="text-amber-200 underline">Builder Copilot</Link>.
          Need sites and apps to plug this into? Open <Link href="/website-builder" className="text-emerald-200 underline">Cortex Builder</Link>.
        </section>
      </div>
    </main>
  );
}
