"use client";

import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import EstimatorChat from '@/components/estimator/EstimatorChat';

export default function EstimatePage() {
  return (
    <main className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col">
      <PublicMarketingNav />
      <div className="flex-1">
        <EstimatorChat />
      </div>
    </main>
  );
}
