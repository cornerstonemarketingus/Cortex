"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CortexTopTabs from '@/components/navigation/CortexTopTabs';

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
		<main className="min-h-screen bg-gradient-to-b from-[#04133b] via-[#0a2258] to-[#061534] text-slate-100">
			<CortexTopTabs />

			<div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
				<header className="rounded-3xl border border-blue-300/30 bg-blue-500/10 p-6 mb-6">
					<p className="text-xs uppercase tracking-[0.2em] text-blue-200">Cortex Engine</p>
					<h1 className="mt-2 text-3xl font-semibold md:text-4xl">Cortex Command Dashboard</h1>
					<p className="mt-3 max-w-3xl text-sm text-blue-100/90">
						Main hub for product divisions, SaaS packaging, and autonomous build workflows.
					</p>
				</header>

				<section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Tracked events</p>
						<p className="mt-1 text-2xl font-semibold">{conversionSummary?.totals?.events ?? 0}</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">CTA clicks</p>
						<p className="mt-1 text-2xl font-semibold">{conversionSummary?.totals?.ctaClicks ?? 0}</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Demo completions</p>
						<p className="mt-1 text-2xl font-semibold">{conversionSummary?.totals?.demoCompletions ?? 0}</p>
					</article>
					<article className="rounded-2xl border border-white/15 bg-black/25 p-4">
						<p className="text-xs text-slate-400">Blog assets</p>
						<p className="mt-1 text-2xl font-semibold">{blogSummary?.summary?.total ?? 0}</p>
					</article>
				</section>

				<section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
					<article className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4">
						<p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Division 01</p>
						<h2 className="mt-1 text-lg font-semibold">Construction Solutions</h2>
						<p className="mt-2 text-sm text-slate-200">Bid estimator, takeoff, and contractor lifecycle automation.</p>
						<Link href="/construction-solutions" className="mt-3 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-500/20 hover:bg-cyan-500/30 px-3 py-2 text-xs font-semibold">
							Open Construction Hub
						</Link>
					</article>

					<article className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-4">
						<p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Division 02</p>
						<h2 className="mt-1 text-lg font-semibold">AI Automation Solutions</h2>
						<p className="mt-2 text-sm text-slate-200">Funnels, CRM, booking, follow-up, subscriptions, and reporting loops.</p>
						<Link href="/ai-automation-solutions" className="mt-3 inline-flex rounded-lg border border-indigo-300/40 bg-indigo-500/20 hover:bg-indigo-500/30 px-3 py-2 text-xs font-semibold">
							Open Automation Hub
						</Link>
					</article>

					<article className="rounded-2xl border border-blue-300/30 bg-blue-500/10 p-4">
						<p className="text-xs uppercase tracking-[0.2em] text-blue-200">Division 03</p>
						<h2 className="mt-1 text-lg font-semibold">Cortex Builder Engine</h2>
						<p className="mt-2 text-sm text-slate-200">Website, app, and game builder lanes with live preview stage and admin Build Cortex control.</p>
						<div className="mt-3 flex flex-wrap gap-2">
							<Link href="/website-builder" className="rounded-lg border border-blue-300/40 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 text-xs font-semibold">
								Website Builder
							</Link>
							<Link href="/app-builder" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold">
								App Builder
							</Link>
							<Link href="/business-builder" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold">
								Business Builder
							</Link>
							<Link href="/game-builder" className="rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-semibold">
								Game Builder
							</Link>
						</div>
					</article>
				</section>

				<section className="rounded-2xl border border-white/15 bg-black/25 p-5">
					<h2 className="text-lg font-semibold">SaaS + Service Deal Packaging</h2>
					<p className="mt-2 text-sm text-slate-300">Premium product families with setup + recurring SaaS subscriptions.</p>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
						<div className="rounded-xl border border-white/10 bg-white/5 p-3">
							<p className="font-semibold text-slate-100">Core System</p>
							<p className="mt-1 text-slate-300">Setup: $1,000-$2,500</p>
							<p className="text-slate-300">Monthly: $197-$497</p>
							<p className="mt-1 text-xs text-slate-400">CRM, automations, booking, and follow-ups.</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-white/5 p-3">
							<p className="font-semibold text-slate-100">AI Upgrade</p>
							<p className="mt-1 text-slate-300">Setup: $500-$1,000</p>
							<p className="text-slate-300">Monthly: $297-$697</p>
							<p className="mt-1 text-xs text-slate-400">AI SMS responder, lead qualification, and estimate assistant.</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-white/5 p-3">
							<p className="font-semibold text-slate-100">Growth Add-on</p>
							<p className="mt-1 text-slate-300">Setup: $2,000+</p>
							<p className="text-slate-300">Monthly: $497+ (optional rev share)</p>
							<p className="mt-1 text-xs text-slate-400">Landing pages, reputation engine, reactivation campaigns, and expansion ops.</p>
						</div>
					</div>
				</section>

				<section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
					<Link href="/analytics/estimating" className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-4 text-sm hover:bg-cyan-500/20">
						Estimator Calibration Analytics
					</Link>
					<Link href="/analytics/quality" className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-4 text-sm hover:bg-indigo-500/20">
						Quality Gate Dashboard
					</Link>
				</section>

				{error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
			</div>
		</main>
	);
}
