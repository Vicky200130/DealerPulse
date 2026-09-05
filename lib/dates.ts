// Small date helpers for the custom calendar. Everything is done with local
// Date parts and 'YYYY-MM-DD' strings so there are no timezone surprises.

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_SHORT = MONTHS_SHORT;
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function monthTitle(d: Date): string {
  return `${MON_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** A day like "12 Oct". */
export function fmtDay(s: string): string {
  const d = parseYmd(s);
  return `${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
}

/** A range like "12 Oct – 31 Dec". */
export function fmtRange(from: string, to: string): string {
  return `${fmtDay(from)} – ${fmtDay(to)}`;
}

/**
 * The 6-week grid (42 cells) covering a month, starting on Monday. Cells outside
 * the month are included so the grid is always rectangular; callers dim them.
 */
export function monthGrid(month: Date): Date[] {
  const first = firstOfMonth(month);
  // JS getDay(): 0=Sun..6=Sat. We want Monday-first, so shift.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
