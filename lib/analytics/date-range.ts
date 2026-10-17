export type DateRangeKey = "today" | "7d" | "30d" | "all";

export const DATE_RANGE_KEYS: readonly DateRangeKey[] = ["today", "7d", "30d", "all"];

export function isDateRangeKey(value: string): value is DateRangeKey {
  return (DATE_RANGE_KEYS as readonly string[]).includes(value);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolves a filter key to explicit UTC date bounds — null/null for
 * "all" isn't a special case the SQL has to branch on, since every
 * admin_* analytics function already treats null bounds as
 * no-lower/no-upper-limit.
 */
export function resolveDateRange(key: DateRangeKey): {
  startDate: string | null;
  endDate: string | null;
} {
  const today = toIsoDate(new Date());

  switch (key) {
    case "today":
      return { startDate: today, endDate: today };
    case "7d": {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 6);
      return { startDate: toIsoDate(start), endDate: today };
    }
    case "30d": {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 29);
      return { startDate: toIsoDate(start), endDate: today };
    }
    case "all":
      return { startDate: null, endDate: null };
  }
}
