import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export default function PaymentsPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-100">
      <PublicMarketingNav />
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-white/20 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Payments</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Revenue Automation</h1>
          <p className="mt-3 text-sm text-slate-300">Estimate to proposal to invoice flow and reminder automation for unpaid balances.</p>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link href="/business-builder" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Run Revenue Chain</Link>
          <Link href="/subscription" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Usage & Billing</Link>
          <Link href="/pricing" className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm hover:bg-white/10">Plans</Link>
        </section>
      </div>
    </main>
  );
}
