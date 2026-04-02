import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import EstimatorTool from '@/components/estimator/EstimatorTool';
import Link from 'next/link';

export default function HomePage() {
	return (
		<main className="min-h-screen bg-[#071014] text-slate-100">
			<PublicMarketingNav />

			{/* Quick Estimator Tool */}
			<EstimatorTool />

			{/* Quick Action Links Below */}
			<div className="mx-auto max-w-6xl px-4 py-12">
				<div className="flex flex-wrap justify-center gap-3">
					<Link href={'/estimate'} className="rounded-lg bg-amber-300 px-5 py-3 font-semibold text-slate-900">Start Estimate</Link>
					<Link href={'/estimate'} className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 font-semibold">Upload Plans</Link>
					<Link href={'/website-builder'} className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 font-semibold">Build a Page</Link>
					<Link href={'/automations'} className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 font-semibold">Create Automation</Link>
				</div>

				{/* Feature Cards */}
				<section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
					<div className="rounded-xl border border-white/10 bg-black/25 p-4">
						<h3 className="font-semibold">🎯 Estimate Drafts</h3>
						<p className="mt-2 text-sm text-slate-300">AI-generated estimates with confidence scoring and assumptions.</p>
					</div>
					<div className="rounded-xl border border-white/10 bg-black/25 p-4">
						<h3 className="font-semibold">🏗️ Page Builder</h3>
						<p className="mt-2 text-sm text-slate-300">Generate landing pages, hero sections, and CTAs.</p>
					</div>
					<div className="rounded-xl border border-white/10 bg-black/25 p-4">
						<h3 className="font-semibold">⚙️ Automations</h3>
						<p className="mt-2 text-sm text-slate-300">Create workflows, triggers, and automation sequences.</p>
					</div>
				</section>
			</div>
		</main>
	);
}
