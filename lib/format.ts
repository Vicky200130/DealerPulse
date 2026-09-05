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
