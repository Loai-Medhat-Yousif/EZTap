import { getTranslations } from "next-intl/server";
import { Eye, MousePointerClick } from "lucide-react";
import {
  getTotalsForRange,
  getDailyActivity,
  getTopLinks,
  getTopCards,
} from "@/lib/data/analytics";
import { isDateRangeKey, type DateRangeKey } from "@/lib/analytics/date-range";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { TopLinksList } from "@/components/admin/top-links-list";
import { TopCardsList } from "@/components/admin/top-cards-list";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const rawRange = typeof raw.range === "string" ? raw.range : "7d";
  const range: DateRangeKey = isDateRangeKey(rawRange) ? rawRange : "7d";

  const t = await getTranslations("analytics");

  const [totals, dailyActivity, topLinks, topCards] = await Promise.all([
    getTotalsForRange(range),
    getDailyActivity(range),
    getTopLinks(range, 8),
    getTopCards(range, 8),
  ]);

  function buildHref(nextRange: DateRangeKey) {
    return `/admin/analytics?range=${nextRange}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <DateRangeFilter value={range} buildHref={buildHref} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label={t("totalViews")} value={totals.totalViews} icon={Eye} />
        <StatCard
          label={t("totalClicks")}
          value={totals.totalClicks}
          icon={MousePointerClick}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">
          {t("activityChartTitle")}
        </h2>
        <ActivityChart
          data={dailyActivity}
          labels={{ views: t("totalViews"), clicks: t("totalClicks") }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-raised p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">{t("topLinks")}</h2>
          <TopLinksList links={topLinks} />
        </div>
        <div className="rounded-2xl border border-border bg-surface-raised p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">{t("topCards")}</h2>
          <TopCardsList cards={topCards} />
        </div>
      </div>
    </div>
  );
}
