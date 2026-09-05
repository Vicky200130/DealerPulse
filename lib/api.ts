// Thin fetch helper for the FastAPI backend. All endpoints live under /api.
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
