"use client";

import Link from "next/link";
import { useState } from "react";
import CortexTopTabs from "@/components/navigation/CortexTopTabs";
import PageHero from "@/components/ui/PageHero";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <CortexTopTabs />

      <PageHero
        align="left"
        kicker="AI Automation Destination"
        title="AI voicemail receptionist + chat"
        subtitle="Generate receptionist voicemail scripts and run a live AI chat experience in one clean interface — built for client-facing demos."
      />

      <div className="mx-auto max-w-6xl px-6 pb-16 space-y-6">
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <h2 className="text-lg font-bold text-white">AI Voicemail Receptionist</h2>

            <label className="mt-4 block text-xs text-slate-400">
              Business type
              <input
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block text-xs text-slate-400">
              Objective
              <input
                value={objective}
                onChange={(event) => setObjective(event.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </label>

            <Button type="button" onClick={() => void generateVoicemailScript()} disabled={loadingScript} className="mt-4 disabled:opacity-60">
              {loadingScript ? "Generating..." : "Generate Receptionist Script"}
            </Button>

            {scriptError ? <p className="mt-3 text-sm text-red-300">{scriptError}</p> : null}

            {voicemailScript ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                {voicemailScript}
              </pre>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-white">Live AI Chat Box</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use this for sales demos to show real-time objection handling and follow-up guidance.
            </p>

            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
            />

            <Button type="button" onClick={() => void sendChat()} disabled={loadingChat} className="mt-3 disabled:opacity-60">
              {loadingChat ? "Thinking..." : "Run AI Chat"}
            </Button>

            {chatError ? <p className="mt-3 text-sm text-red-300">{chatError}</p> : null}

            {chatOutput ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 whitespace-pre-wrap">
                {chatOutput}
              </div>
            ) : null}
          </Card>
        </section>

        <Card>
          <p className="text-sm text-slate-300">
            Need full CRM pipeline and automation delivery? Continue to{' '}
            <Link href="/builder-copilot" className="text-[#C69C6D] underline">
              Builder Copilot
            </Link>
            . Need sites and apps to plug this into? Open{' '}
            <Link href="/website-builder" className="text-[#C69C6D] underline">
              Cortex Builder
            </Link>
            .
          </p>
        </Card>
      </div>
    </main>
  );
}
