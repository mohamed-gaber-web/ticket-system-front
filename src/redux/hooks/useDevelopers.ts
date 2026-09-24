import { useEffect, useState } from 'react';
import { getConsultants } from '@/api/consultantApi';
import type { Consultant } from '@/types/consultant.types';

/**
 * Everyone who can open the development module — the roster for board
 * members and card assignees. The API applies the same rule the server uses
 * for `requireModule("development")`, so admins and overrides are included.
 */
export const useDevelopers = () => {
  const [developers, setDevelopers] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getConsultants({ module: 'development', status: 'active', limit: 200 })
      .then((res) => {
        if (!cancelled) setDevelopers(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDevelopers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { developers, loading };
};
