'use client';

import { useEffect, useState } from 'react';
import { apiGet } from './api';

export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  useEffect(() => {
    // An empty path means "don't fetch yet" — used for conditional data (e.g. a
    // filter whose input isn't chosen). Clear state and stay idle.
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
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
