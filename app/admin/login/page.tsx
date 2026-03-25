"use client";

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin/portal';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        const data = await response.json();
        if (response.ok && data.authenticated) {
          router.replace(nextPath);
          return;
        }
      } catch {
        // Ignore session check failures and let user sign in.
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [nextPath, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.replace(nextPath);
    } catch {
      setError('Network error while signing in');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <p className="text-sm text-gray-400">Checking admin session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Developer Admin Login</h1>
        <p className="text-sm text-gray-400 mb-6">
          Sign in to access the protected devboard and builder controls.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs text-gray-300">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="mt-1 w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-sm"
              placeholder="admin"
            />
          </label>

          <label className="block text-xs text-gray-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-sm"
              placeholder="password"
            />
          </label>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 rounded px-3 py-2 text-sm font-medium"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 mt-5">
          Set CORTEX_ADMIN_USER and CORTEX_ADMIN_PASSWORD in your environment for custom credentials.
        </p>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <p className="text-sm text-gray-400">Loading admin login...</p>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}
