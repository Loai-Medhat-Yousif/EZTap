export type DateRangeKey = "today" | "7d" | "30d" | "all";

export const DATE_RANGE_KEYS: readonly DateRangeKey[] = ["today", "7d", "30d", "all"];

export function isDateRangeKey(value: string): value is DateRangeKey {
  return (DATE_RANGE_KEYS as readonly string[]).includes(value);
}

/**
 * ISO calendar date (YYYY-MM-DD) for "right now" in Cairo. The business
 * day boundary is Africa/Cairo — income is bucketed that way in the SQL
 * — so the analytics filters have to agree, or "today" would flip at
 * UTC midnight (2–3 hours off for this business).
 */
export function cairoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysIsoDate(isoDate: string, days: number): string {
  // Parse as UTC midnight so day arithmetic can't drift across a DST
  // boundary; the input is a plain calendar date with no time zone.
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolves a filter key to explicit date bounds — null/null for "all"
 * isn't a special case the SQL has to branch on, since every admin_*
 * analytics function already treats null bounds as
 * no-lower/no-upper-limit.
 */
export function resolveDateRange(key: DateRangeKey): {
  startDate: string | null;
  endDate: string | null;
} {
  const today = cairoToday();

  switch (key) {
    case "today":
      return { startDate: today, endDate: today };
    case "7d":
      return { startDate: addDaysIsoDate(today, -6), endDate: today };
    case "30d":
      return { startDate: addDaysIsoDate(today, -29), endDate: today };
    case "all":
      return { startDate: null, endDate: null };
  }
}
