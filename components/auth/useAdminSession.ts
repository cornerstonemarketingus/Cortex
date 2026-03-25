"use client";

import { useEffect, useState } from 'react';

type AdminSessionResult = {
  authenticated?: boolean;
  username?: string | null;
};

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/admin/session', { cache: 'no-store' });
        const parsed = (await response.json().catch(() => ({}))) as AdminSessionResult;
        if (!active) return;
        setIsAdmin(Boolean(response.ok && parsed.authenticated));
      } catch {
        if (!active) return;
        setIsAdmin(false);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return { isAdmin, loading };
}
