/**
 * Date display helpers for ISO 'YYYY-MM-DD' strings from store data.
 *
 * These ISO dates are calendar dates, not instants. Parsing them with
 * `new Date(iso)` treats them as UTC midnight, which then renders as the
 * previous day in negative-offset timezones. We parse the parts as LOCAL
 * midnight so the displayed day always matches the stored date.
 */

/** 'YYYY-MM-DD' → e.g. "Jun 4" (local). */
export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** 'YYYY-MM-DD' → "Today" (when isToday) or short weekday e.g. "Mon" (local). */
export function weekdayLabel(isoDate: string, isToday: boolean): string {
  if (isToday) return "Today";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
  });
}
