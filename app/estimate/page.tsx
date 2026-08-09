"use client";

import Link from 'next/link';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import EstimatorChat from '@/components/estimator/EstimatorChat';

export default function EstimatePage() {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col">
      <PublicMarketingNav />

      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <Link
          href="/estimate/takeoff"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#C69C6D]/30 bg-[#C69C6D]/10 px-4 py-3 text-sm text-[#f0dcb8] transition hover:bg-[#C69C6D]/15"
        >
          <span>
            <span className="font-semibold">Have plans to upload?</span> Run a full AI takeoff with quantities and line items instead.
          </span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="flex-1">
        <EstimatorChat />
      </div>
    </main>
  );
}
