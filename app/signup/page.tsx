"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PublicMarketingNav from "@/components/navigation/PublicMarketingNav";

const intents = [
  {
    id: "get-more-leads",
    label: "Get more leads",
    questions: [
      "What services bring your highest margin jobs?",
      "Which ZIP codes do you want to target first?",
      "How many leads per month do you want?",
      "Do you want instant SMS follow-up turned on by default?",
      "What is your average close rate right now?",
    ],
  },
  {
    id: "create-estimates",
    label: "Create estimates",
    questions: [
      "What trade or project type should we optimize for?",
      "What ZIP code do you bid in most often?",
      "What margin target do you want protected?",
      "Do you want plan upload and takeoff enabled by default?",
      "How fast do you need quote turnaround?",
    ],
  },
  {
    id: "start-a-business",
    label: "Start a business",
    questions: [
      "What should your business be called?",
      "What services do you want to launch first?",
      "What city and ZIP should we launch around?",
      "Do you want website + CRM + estimator all launched together?",
      "What monthly revenue goal should we target?",
    ],
  },
] as const;

const tiers = [
  { value: "starter", label: "Starter ($79/mo)" },
  { value: "growth", label: "Growth ($149/mo)" },
  { value: "pro", label: "Pro ($299/mo)" },
  { value: "unified", label: "Enterprise ($799/mo)" },
] as const;

type StatusResponse = {
  active: boolean;
  email: string;
  tier: string | null;
  includedCredits: number;
  usedCredits: number;
  remainingCredits: number;
};

type Step = 1 | 2 | 3 | 4;

function sanitizeNextPath(value: string | null) {
  if (!value) return "/workspace";
  if (!value.startsWith("/")) return "/workspace";
  if (value.startsWith("//")) return "/workspace";
  if (value === "/signup") return "/workspace";
  if (value.startsWith("/signup?")) return "/workspace";
  return value;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [nextPath, setNextPath] = useState("/workspace");
  const [selectedIntentId, setSelectedIntentId] = useState<(typeof intents)[number]["id"] | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [showDemoMode, setShowDemoMode] = useState(false);

  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<(typeof tiers)[number]["value"]>("pro");
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);

  const selectedIntent = useMemo(
    () => intents.find((intent) => intent.id === selectedIntentId) || null,
    [selectedIntentId]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNextPath(params.get("next")));

    const fromUrlEmail = params.get("email") || "";
    const success = params.get("success") === "1";

    if (fromUrlEmail) setEmail(fromUrlEmail);
    setCheckoutSuccess(success);

    if (success) {
      setStep(4);
    }
  }, []);

  useEffect(() => {
    if (!email || !checkoutSuccess) return;

    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`, {
          cache: "no-store",
        });
        const parsed = (await response.json().catch(() => ({}))) as StatusResponse;
        if (active && response.ok) {
          setStatus(parsed);
        }
      } catch {
        // Keep onboarding flow resilient if status endpoint is unavailable.
      }
    };

    void loadStatus();
    return () => {
      active = false;
    };
  }, [checkoutSuccess, email]);

  const startQuestions = (intentId: (typeof intents)[number]["id"]) => {
    setSelectedIntentId(intentId);
    setStep(2);
  };

  const finishQuestions = () => {
    if (!selectedIntent) return;
    const seedBusiness = answers[0]?.trim() || "Builder Copilot Project";
    setBusinessName(seedBusiness);
    setStep(3);
  };

  const submitTrial = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("Business email is required.");
      }

      if (businessName.trim() || websiteUrl.trim() || businessPhone.trim()) {
        await fetch("/api/builder-copilot/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName,
            websiteUrl,
            phoneNumber: businessPhone,
            email: normalizedEmail,
            context: "guided-signup",
            provider: "cortex-voice-core",
          }),
        }).catch(() => null);
      }

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          tier,
          successUrl: `${window.location.origin}/signup?success=1&email=${encodeURIComponent(
            normalizedEmail
          )}&next=${encodeURIComponent(nextPath)}`,
          cancelUrl: `${window.location.origin}/signup?next=${encodeURIComponent(nextPath)}`,
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as {
        error?: string;
        checkout?: { checkoutUrl?: string };
      };

      if (!response.ok || !parsed.checkout?.checkoutUrl) {
        throw new Error(parsed.error || "Unable to launch checkout.");
      }

      window.location.assign(parsed.checkout.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to launch trial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#3d1b00_0%,#1a0d03_45%,#0a0502_100%)] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <section className="rounded-3xl border border-amber-300/35 bg-amber-500/10 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Builder Copilot Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-5xl">Tell us the outcome. We build the system live.</h1>
          <p className="mt-3 max-w-3xl text-sm text-amber-50/90 md:text-base">
            Chat-controlled workspace powered by Builder Copilot technology. Website, estimator, CRM, and automations are generated from your intent.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowDemoMode(true)}
              className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200"
            >
              Try Demo
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20"
            >
              Launch My Business
            </button>
          </div>
        </section>

        {showDemoMode ? (
          <section className="mt-5 rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Demo Mode (No Signup)</p>
            <h2 className="mt-1 text-xl font-semibold">Pre-built construction business is loaded</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs text-slate-200">
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">Website preview with hero, services, testimonials, and CTA.</div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">Sample estimate: Deck build range $18,400 - $24,900.</div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">CRM demo lane with 3 sample leads and follow-up automation.</div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => router.push("/workspace")}
                className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold hover:bg-cyan-500/30"
              >
                Open Demo Workspace
              </button>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-5 rounded-2xl border border-white/20 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Step 1</p>
            <h2 className="mt-1 text-xl font-semibold">What do you want to do?</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {intents.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => startQuestions(intent.id)}
                  className="rounded-xl border border-amber-300/35 bg-amber-500/12 p-4 text-left hover:bg-amber-500/18"
                >
                  <p className="text-sm font-semibold text-amber-100">{intent.label}</p>
                  <p className="mt-2 text-xs text-slate-200">AI will ask 4-6 setup questions and build your workspace instantly.</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 2 && selectedIntent ? (
          <section className="mt-5 rounded-2xl border border-white/20 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200">Step 2</p>
            <h2 className="mt-1 text-xl font-semibold">{selectedIntent.label}: AI setup questions</h2>
            <div className="mt-3 space-y-3">
              {selectedIntent.questions.map((question, index) => (
                <label key={question} className="block text-xs text-slate-300">
                  {question}
                  <input
                    value={answers[index] || ""}
                    onChange={(event) => {
                      setAnswers((current) => {
                        const next = [...current];
                        next[index] = event.target.value;
                        return next;
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={finishQuestions}
              className="mt-4 rounded-lg bg-amber-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-200"
            >
              Generate My Result
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-5 rounded-2xl border border-emerald-300/35 bg-emerald-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200">Step 3</p>
            <h2 className="mt-1 text-xl font-semibold">Your result is ready immediately</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3 text-xs text-slate-200">
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="font-semibold text-emerald-100">Website Preview</p>
                <p className="mt-1">Hero, services, testimonials, and CTA generated for {businessName || "your business"}.</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="font-semibold text-emerald-100">Estimate Example</p>
                <p className="mt-1">Live estimate sample with ZIP-aware pricing confidence and line-item assumptions.</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3">
                <p className="font-semibold text-emerald-100">CRM + Sample Lead</p>
                <p className="mt-1">Pipeline seeded with sample lead and follow-up automation sequence.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDemoMode(true);
                  router.push("/workspace");
                }}
                className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20"
              >
                Try Demo
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
              >
                Launch My Business
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="mt-5 rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Step 4 - Free Trial (Signup Required)</p>
            <h2 className="mt-1 text-xl font-semibold">Save this setup and launch your real business workspace</h2>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-200">
                Business email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                />
              </label>

              <label className="text-xs text-slate-200">
                Plan
                <select
                  value={tier}
                  onChange={(event) => setTier(event.target.value as (typeof tiers)[number]["value"])}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
                >
                  {tiers.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Business name"
                className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="Website URL (optional)"
                className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
              <input
                value={businessPhone}
                onChange={(event) => setBusinessPhone(event.target.value)}
                placeholder="Business phone"
                className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => void submitTrial()}
              disabled={loading || !email.trim()}
              className="mt-4 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
            >
              {loading ? "Redirecting..." : "Launch My Business"}
            </button>

            {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

            {checkoutSuccess && status?.active ? (
              <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-500/15 p-3 text-xs text-emerald-100">
                Subscription active ({status.tier || "enterprise"}). Tokens remaining: {status.remainingCredits} / {status.includedCredits}.
                <div className="mt-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-200"
                    onClick={() => {
                      router.push(nextPath);
                      router.refresh();
                    }}
                  >
                    Continue To Workspace
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
