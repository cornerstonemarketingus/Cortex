"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
  const [billingUnavailable, setBillingUnavailable] = useState(false);
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
    setBillingUnavailable(false);

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
        code?: string;
        checkout?: { checkoutUrl?: string };
      };

      if (!response.ok || !parsed.checkout?.checkoutUrl) {
        if (parsed.code === 'STRIPE_KEY_MISSING') {
          setBillingUnavailable(true);
          return;
        }
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
    <PageShell>
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 space-y-5">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C69C6D] font-semibold">Builder Copilot Onboarding</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-5xl">Tell us the outcome. We build the system live.</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-400 md:text-base">
            Chat-controlled workspace powered by Builder Copilot technology. Website, estimator, CRM, and automations are generated from your intent.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setShowDemoMode(true)}>
              Try Demo
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Launch My Business
            </Button>
          </div>
        </Card>

        {showDemoMode ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Demo Mode (No Signup)</p>
            <h2 className="mt-1 text-xl font-bold text-white">Pre-built construction business is loaded</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">Website preview with hero, services, testimonials, and CTA.</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">Sample estimate: Deck build range $18,400 - $24,900.</div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">CRM demo lane with 3 sample leads and follow-up automation.</div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#C69C6D] font-semibold">Start Here (2-Minute Guided Demo)</p>
              <div className="mt-2 space-y-1 text-xs text-slate-300">
                <p>1. Open the demo workspace.</p>
                <p>2. Load a trade template from the left rail.</p>
                <p>3. Click &ldquo;Create estimate for a deck&rdquo; from the guide rail.</p>
                <p>4. Click &ldquo;Turn on autopilot&rdquo; and watch automations activate.</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => router.push("/workspace?guide=demo")}>
                Open Guided Demo Workspace
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDemoMode(false);
                  setStep(1);
                }}
              >
                I Want Setup Questions Instead
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Step 1</p>
            <h2 className="mt-1 text-xl font-bold text-white">What do you want to do?</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {intents.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => startQuestions(intent.id)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-[#C69C6D]/40 hover:bg-white/[0.06]"
                >
                  <p className="text-sm font-semibold text-white">{intent.label}</p>
                  <p className="mt-2 text-xs text-slate-400">AI will ask 4-6 setup questions and build your workspace instantly.</p>
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        {step === 2 && selectedIntent ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Step 2</p>
            <h2 className="mt-1 text-xl font-bold text-white">{selectedIntent.label}: AI setup questions</h2>
            <div className="mt-4 space-y-3">
              {selectedIntent.questions.map((question, index) => (
                <label key={question} className="block text-xs text-slate-400">
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
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <Button type="button" onClick={finishQuestions} className="mt-4">
              Generate My Result
            </Button>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Step 3</p>
            <h2 className="mt-1 text-xl font-bold text-white">Your result is ready immediately</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3 text-xs text-slate-300">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-semibold text-white">Website Preview</p>
                <p className="mt-1">Hero, services, testimonials, and CTA generated for {businessName || "your business"}.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-semibold text-white">Estimate Example</p>
                <p className="mt-1">Live estimate sample with ZIP-aware pricing confidence and line-item assumptions.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-semibold text-white">CRM + Sample Lead</p>
                <p className="mt-1">Pipeline seeded with sample lead and follow-up automation sequence.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDemoMode(true);
                  router.push("/workspace");
                }}
              >
                Try Demo
              </Button>
              <Button type="button" onClick={() => setStep(4)}>
                Launch My Business
              </Button>
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card>
            <p className="text-xs uppercase tracking-[0.16em] text-[#C69C6D] font-semibold">Step 4 &middot; Free Trial (Signup Required)</p>
            <h2 className="mt-1 text-xl font-bold text-white">Save this setup and launch your real business workspace</h2>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs text-slate-400">
                Business email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
                />
              </label>

              <label className="text-xs text-slate-400">
                Plan
                <select
                  value={tier}
                  onChange={(event) => setTier(event.target.value as (typeof tiers)[number]["value"])}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
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
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="Website URL (optional)"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
              <input
                value={businessPhone}
                onChange={(event) => setBusinessPhone(event.target.value)}
                placeholder="Business phone"
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 focus:border-[#C69C6D]/50 focus:outline-none"
              />
            </div>

            <Button type="button" onClick={() => void submitTrial()} disabled={loading || !email.trim()} className="mt-4 disabled:opacity-60">
              {loading ? "Redirecting..." : "Launch My Business"}
            </Button>

            {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

            {billingUnavailable ? (
              <div className="mt-4 rounded-lg border border-[#C69C6D]/30 bg-[#C69C6D]/10 p-3 text-xs text-[#f0dcb8]">
                Billing is not configured in this environment yet, so checkout is unavailable. You can continue in preview mode and complete setup later once Stripe is connected.
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => router.push('/workspace?guide=demo')}>
                    Continue In Preview Workspace
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setBillingUnavailable(false)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : null}

            {checkoutSuccess && status?.active ? (
              <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                Subscription active ({status.tier || "enterprise"}). Tokens remaining: {status.remainingCredits} / {status.includedCredits}.
                <div className="mt-3">
                  <Button
                    type="button"
                    onClick={() => {
                      router.push(nextPath);
                      router.refresh();
                    }}
                  >
                    Continue To Workspace
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
