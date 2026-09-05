// Client-side CSV export (real browser download — not an artifact sandbox).
export function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
  columns: { key: string; header: string }[],
) {
  const esc = (v: unknown) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const head = columns.map((c) => c.header).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
