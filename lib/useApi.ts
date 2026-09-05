'use client';

import { useEffect, useState } from 'react';
import { apiGet } from './api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    apiGet<T>(path)
      .then((d) => live && (setData(d), setLoading(false)))
      .catch((e) => live && (setError(String(e)), setLoading(false)));
    return () => {
      live = false;
    };
  }, [path]);

  return { data, error, loading };
}
