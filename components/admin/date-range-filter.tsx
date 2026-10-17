import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DATE_RANGE_KEYS, type DateRangeKey } from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

export async function DateRangeFilter({
  value,
  buildHref,
}: {
  value: DateRangeKey;
  buildHref: (range: DateRangeKey) => string;
}) {
  const t = await getTranslations("analytics");

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      {DATE_RANGE_KEYS.map((key) => (
        <Link
          key={key}
          href={buildHref(key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === key ? "bg-primary text-white" : "text-muted hover:text-ink",
          )}
        >
          {t(`range.${key}`)}
        </Link>
      ))}
    </div>
  );
}
