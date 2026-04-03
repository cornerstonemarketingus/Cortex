'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RenderPage } from '@/lib/builder/component-registry';
import type { SectionBase } from '@/lib/builder/page-model';

function PreviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [sections, setSections] = useState<SectionBase[]>([]);
  const [pageTitle, setPageTitle] = useState('Page Preview');
  const [error, setError] = useState('');

  useEffect(() => {
    const s = params.get('s');
    const title = params.get('title');
    if (title) setPageTitle(decodeURIComponent(title));

    if (!s) {
      setError('No page data provided.');
      return;
    }
    try {
      const decoded = JSON.parse(atob(s)) as SectionBase[];
      setSections(decoded);
    } catch {
      setError('Could not load page data. The link may be invalid or expired.');
    }
  }, [params]);

  function openInBuilder() {
    const s = params.get('s');
    if (s) router.push(`/json-builder?s=${s}`);
    else router.push('/json-builder');
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center text-center px-6">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => router.push('/json-builder')}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Go to Builder
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Preview toolbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 bg-[#0b0d12]/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-white/20">|</span>
          <span className="text-sm text-white/80 font-medium">{pageTitle}</span>
          <span className="text-xs text-slate-500">{sections.length} sections</span>
        </div>
        <button
          onClick={openInBuilder}
          className="text-xs font-semibold px-4 py-2 rounded-lg transition"
          style={{ background: 'linear-gradient(135deg, #1E3A5F, #C69C6D)', color: 'white' }}
        >
          Edit in Builder
        </button>
      </div>

      {/* Rendered page */}
      {sections.length > 0 ? (
        <RenderPage sections={sections} />
      ) : (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400 text-sm">Loading preview…</p>
        </div>
      )}
    </div>
  );
}

export default function JsonBuilderPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading preview…</p>
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
