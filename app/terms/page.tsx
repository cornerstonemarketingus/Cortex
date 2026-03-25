import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/10 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Legal</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-slate-300">Use of Bid Build platform features is subject to these terms and applicable service agreements.</p>
        </header>
      </div>
    </main>
  );
}
