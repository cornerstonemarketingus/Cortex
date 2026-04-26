'use client';

import { useCallback, useEffect, useState } from 'react';
import { BidProject, Contact } from '@/lib/bidboard/types';

export default function BidBoard() {
  const [projects, setProjects] = useState<BidProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false); // Sub check
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/bidboard/projects', { cache: 'no-store' });
      const data = (await res.json()) as { projects?: BidProject[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load bid feed.');
      }
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : 'Unable to load bid feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  if (loading) return <div className="p-8">Loading live bids...</div>;
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-700">
          <p className="font-semibold">Bid feed unavailable</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            onClick={() => void loadProjects()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Commercial Bid Board</h1>
        <p className="text-xl text-gray-600 mt-2">Live government & private projects. {projects.length} active bids.</p>
        {!unlocked && (
          <button
            className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
            onClick={() => setUnlocked(true)}
          >
            Unlock Contacts ($29/mo)
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: BidProject) => (
          <div key={project.id} className="border rounded-xl p-6 hover:shadow-xl transition">
            <div className="flex items-start gap-4 mb-4">
              {project.company.logoUrl && (
                <img src={project.company.logoUrl} alt={project.company.name} className="w-12 h-12 rounded-lg" />
              )}
              <div>
                <h3 className="font-bold text-lg">{project.title}</h3>
                <p className="text-sm text-gray-500">{project.location.city}, {project.location.state}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700">{project.description || 'Commercial project scope available in full bid package.'}</p>
              <p><strong>Due:</strong> {new Date(project.dueDate).toLocaleDateString()}</p>
              {project.valueRange && <p><strong>Value:</strong> {project.valueRange}</p>}
              {unlocked && project.contacts && project.contacts.length > 0 && (
                <div>
                  <p><strong>Contacts:</strong></p>
                  <ul className="mt-1 space-y-1">
                    {project.contacts.map((contact: Contact, index: number) => (
                      <li key={index}>{contact.name} {'\u2022'} {contact.phone} {'\u2022'} {contact.email}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!unlocked && (
                <p className="text-xs text-gray-500 mt-4">Subscribe to unlock contacts & auto-CRM import</p>
              )}
            </div>
            <button className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700">
              {unlocked ? 'Add to CRM' : 'Save Bid'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


