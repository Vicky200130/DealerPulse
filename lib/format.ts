// Indian-format helpers (Lakh / Crore) used across the dashboard.

export function formatINR(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

// A number shown as the fraction it's a share of, e.g. frac(47, 313) → "47 of
// 313 (15%)". The house rule across the app: never a bare % — always say what it
// is a share of. `verb` lets a caller read it as "Sold 47 of 313 (15%)".
export function frac(part: number, whole: number, verb?: string): string {
  const rate = whole ? part / whole : 0;
  const head = verb ? `${verb} ${part}` : `${part}`;
  return `${head} of ${whole.toLocaleString('en-IN')} (${pct(rate)})`;
}
