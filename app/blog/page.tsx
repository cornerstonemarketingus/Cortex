"use client";

import { useEffect, useState } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

type BlogPost = {
  id?: string;
  title?: string;
  summary?: string;
  region?: string;
  style?: string;
  seo?: {
    title?: string;
    slug?: string;
  };
};

type BlogListResponse = {
  posts?: BlogPost[];
  error?: string;
};

type BlogGenerateResponse = {
  post?: BlogPost;
  error?: string;
};

export default function BlogPage() {
  const [topic, setTopic] = useState('Best contractor lead generation system for local markets in 2026');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/content/blog?limit=12', { cache: 'no-store' });
        const parsed = (await response.json().catch(() => ({}))) as BlogListResponse;
        if (!response.ok) {
          throw new Error(parsed.error || `Unable to load blog posts (${response.status})`);
        }
        setPosts(parsed.posts || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load blog posts.');
      }
    };

    void load();
  }, []);

  const generatePost = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/content/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'generate-post',
          topic,
          businessType: 'contractor',
          audience: 'homeowners and contractors',
          region: 'us',
          style: 'conversion',
          tone: 'sales',
          callToAction: 'Book a Builder Copilot growth session',
        }),
      });

      const parsed = (await response.json().catch(() => ({}))) as BlogGenerateResponse;
      if (!response.ok || !parsed.post) {
        throw new Error(parsed.error || `Unable to generate post (${response.status})`);
      }

      setPosts((current) => [parsed.post as BlogPost, ...current]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Unable to generate post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#07143a] via-[#0d2a66] to-[#081736] text-slate-100">
      <PublicMarketingNav />

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <header className="rounded-3xl border border-cyan-300/35 bg-cyan-500/12 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Builder Copilot Blog Engine</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">AI writer for SEO traffic and conversion content</h1>
          <p className="mt-3 max-w-4xl text-sm text-cyan-100/90 md:text-base">
            Generate high-converting articles for service + location intent, then route traffic into your estimator and CRM funnels.
          </p>

          <div className="mt-4 rounded-2xl border border-white/20 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">AI writer</p>
            <textarea value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-white/20 bg-black/35 px-3 py-2 text-sm" />
            <button type="button" onClick={() => void generatePost()} disabled={loading} className="mt-3 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60">
              {loading ? 'Writing...' : 'Generate SEO Article'}
            </button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post, index) => (
            <article key={post.id || post.seo?.slug || `${post.title || 'post'}-${index}`} className="rounded-2xl border border-white/15 bg-black/25 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{post.region || 'us'} · {post.style || 'conversion'}</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-50">{post.seo?.title || post.title || 'Generated Article'}</h2>
              <p className="mt-3 text-sm text-slate-300">{post.summary || 'AI-generated high-converting article draft.'}</p>
              <p className="mt-3 text-xs text-cyan-100">Slug: {post.seo?.slug || 'draft'}</p>
            </article>
          ))}
          {posts.length === 0 ? (
            <article className="rounded-2xl border border-white/15 bg-black/25 p-5 text-sm text-slate-300">
              No posts yet. Generate your first AI SEO article above.
            </article>
          ) : null}
        </section>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
