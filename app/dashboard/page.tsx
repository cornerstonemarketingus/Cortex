"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';
import BuilderCopilotPanel from '@/components/copilot/BuilderCopilotPanel';

type ConversionSummary = {
	totals?: {
		events?: number;
		ctaClicks?: number;
		demoCompletions?: number;
	};
};

type BlogSummary = {
	summary?: {
		total?: number;
		ready?: number;
		draft?: number;
	};
};

export default function Dashboard() {
	const [conversionSummary, setConversionSummary] = useState<ConversionSummary | null>(null);
	const [blogSummary, setBlogSummary] = useState<BlogSummary | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const [conversionRes, blogRes] = await Promise.all([
					fetch('/api/analytics/conversions', { cache: 'no-store' }),
					fetch('/api/content/blog?limit=5', { cache: 'no-store' }),
				]);

				const conversionData = (await conversionRes.json().catch(() => ({}))) as ConversionSummary & { error?: string };
				const blogData = (await blogRes.json().catch(() => ({}))) as BlogSummary & { error?: string };

				if (!conversionRes.ok) {
					throw new Error(conversionData.error || `Failed to load conversion summary (${conversionRes.status})`);
				}

				if (!blogRes.ok) {
					throw new Error(blogData.error || `Failed to load blog summary (${blogRes.status})`);
				}

				setConversionSummary(conversionData);
				setBlogSummary(blogData);
			} catch (loadError) {
				const message = loadError instanceof Error ? loadError.message : 'Failed to load dashboard data';
				setError(message);
			}
		};

		void load();
	}, []);

	return (
		<main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#111827] to-[#020617] text-slate-100">
			<CortexTopTabs />

			<div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
				<header className="rounded-3xl border border-white/20 bg-black/25 p-6 mb-6">
					<p className="text-xs uppercase tracking-[0.2em] text-cyan-200">ContractorPro Revenue OS</p>
					<h1 className="mt-2 text-3xl font-semibold md:text-4xl">Estimates + Automations Dashboard</h1>
					<p className="mt-3 max-w-3xl text-sm text-slate-200">
						Run your full bid pipeline, lead capture, takeoff workflow, and internal copilot execution from one command surface.
					</p>
					<div className="mt-4 flex flex-wrap gap-2">
						<Link href="/estimate" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold hover:bg-cyan-500/30">Run AI Estimate</Link>
						<Link href="/automations" className="rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-xs font-semibold hover:bg-indigo-500/30">Open Automations</Link>
						<Link href="/website-builder" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Open Website Builder</Link>
						<Link href="/internal-copilot" className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold hover:bg-amber-500/25">Internal Copilot</Link>
					</div>
				</header>

				<section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Revenue Pipeline</p>
						<p className="mt-1 text-2xl font-semibold">$0</p>
						<p className="text-xs text-slate-500">0 active bids</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Won Revenue</p>
						<p className="mt-1 text-2xl font-semibold">$0</p>
						<p className="text-xs text-slate-500">0 accepted</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Bids Viewed</p>
						<p className="mt-1 text-2xl font-semibold">0</p>
						<p className="text-xs text-slate-500">clients engaged</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Win Rate</p>
						<p className="mt-1 text-2xl font-semibold">0%</p>
						<p className="text-xs text-slate-500">0 of 0 sent</p>
					</article>
				</section>

				<section className="rounded-2xl border border-white/15 bg-black/25 p-5 mb-6">
					<h2 className="text-lg font-semibold">Pipeline Stages</h2>
					<div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
						{[
							{ label: 'Estimate', value: '0' },
							{ label: 'Proposal Sent', value: '0' },
							{ label: 'Client Viewed', value: '0' },
							{ label: 'Client Accepted', value: '0' },
							{ label: 'Project Won', value: '$0' },
						].map((stage) => (
							<div key={stage.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
								<p className="text-xs text-slate-400">{stage.label}</p>
								<p className="mt-1 text-xl font-semibold">{stage.value}</p>
							</div>
						))}
					</div>
				</section>

				<section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					<article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4">
						<p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Lead Capture</p>
						<h2 className="mt-1 text-lg font-semibold">Your Lead Capture Page</h2>
						<p className="mt-2 text-sm text-slate-200">Share this link on Google, Facebook, or Nextdoor to collect leads automatically.</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<button type="button" className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-xs font-semibold">Copy Link</button>
							<Link href="/website-builder" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Share Lead Form</Link>
						</div>
						<div className="mt-4 grid grid-cols-3 gap-2 text-xs">
							<div className="rounded-lg border border-white/15 bg-black/25 p-2">Email List: 0</div>
							<div className="rounded-lg border border-white/15 bg-black/25 p-2">New Leads: 0</div>
							<div className="rounded-lg border border-white/15 bg-black/25 p-2">Jobs Won: 0</div>
						</div>
					</article>

					<article className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-4">
						<p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Bid Performance</p>
						<h2 className="mt-1 text-lg font-semibold">Client Engagement</h2>
						<div className="mt-3 grid grid-cols-5 gap-2 text-xs">
							{['Sent', 'Viewed', 'Accepted', 'Declined', 'Close Rate'].map((item) => (
								<div key={item} className="rounded-lg border border-white/15 bg-black/25 p-2">
									<p className="text-slate-400">{item}</p>
									<p className="mt-1 font-semibold">0{item.includes('Rate') ? '%' : ''}</p>
								</div>
							))}
						</div>
						<p className="mt-4 text-xs text-slate-300">No sent bids yet. Create your first bid.</p>
					</article>
				</section>

				<section className="rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-5 mb-6">
					<p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Estimator With Copilot</p>
					<h2 className="mt-1 text-xl font-semibold">Create estimates faster with attached Builder Copilot guidance</h2>
					<p className="mt-2 text-sm text-slate-200">Run estimate workflows and let copilot generate pricing logic, copy upgrades, and conversion steps in one place.</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Link href="/estimate" className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Open Estimator</Link>
						<Link href="/builder" className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Open Page Builder</Link>
					</div>
				</section>

				<section className="rounded-2xl border border-white/15 bg-black/25 p-5 mb-6">
					<p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Plan Takeoff</p>
					<h2 className="mt-1 text-xl font-semibold">Upload plans and get instant itemized estimates</h2>
					<p className="mt-2 text-sm text-slate-300">Floor plans, blueprints, sketches, site plans, and hand drawings are supported.</p>
					<div className="mt-3 flex flex-wrap gap-2 text-xs">
						{['PNG', 'JPG', 'WEBP', 'PDF'].map((fileType) => (
							<span key={fileType} className="rounded-full border border-white/20 bg-white/10 px-3 py-1">{fileType}</span>
						))}
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						<Link href="/estimate" className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200">Upload Your Plans</Link>
						<Link href="/estimate" className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">Run AI Takeoff</Link>
					</div>
				</section>

				<section className="mt-6">
					<BuilderCopilotPanel
						title="Estimator Builder Copilot"
						subtitle="Ask for precise estimate logic, conversion copy, and workflow improvements while you build your quote flow."
						defaultPrompt="Optimize my estimate flow for higher close rate and faster proposal turnaround."
						contextLabel="dashboard-estimator"
						showProvisioning={false}
					/>
				</section>

				<section className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
					<p className="text-xs uppercase tracking-[0.16em] text-emerald-200">GBP + Directory Execution</p>
					<h2 className="mt-1 text-xl font-semibold">Local ranking checklist</h2>
					<div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5 text-xs text-emerald-50/90">
						<div className="rounded-lg border border-emerald-100/25 bg-black/25 p-3">1. Publish consistent NAP across top directories.</div>
						<div className="rounded-lg border border-emerald-100/25 bg-black/25 p-3">2. Optimize GBP categories, services, and service areas.</div>
						<div className="rounded-lg border border-emerald-100/25 bg-black/25 p-3">3. Post weekly photos + one project update.</div>
						<div className="rounded-lg border border-emerald-100/25 bg-black/25 p-3">4. Trigger review requests after estimate and job completion.</div>
						<div className="rounded-lg border border-emerald-100/25 bg-black/25 p-3">5. Publish one geo-targeted blog post each week.</div>
					</div>
				</section>

				{error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
				<p className="mt-4 text-xs text-slate-400">Live analytics loaded: {conversionSummary?.totals?.events ?? 0} tracked events, {blogSummary?.summary?.total ?? 0} blog assets.</p>
			</div>
		</main>
	);
}
