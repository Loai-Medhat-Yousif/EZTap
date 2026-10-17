import { getTranslations } from "next-intl/server";
import { Eye, MousePointerClick } from "lucide-react";
import { getDailyActivity, getCardClickBreakdown } from "@/lib/data/analytics";
import type { DateRangeKey } from "@/lib/analytics/date-range";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { CardClickBreakdownList } from "@/components/admin/card-click-breakdown-list";

export async function CardAnalyticsPanel({
  cardId,
  range,
}: {
  cardId: string;
  range: DateRangeKey;
}) {
  const t = await getTranslations("analytics");

  const [dailyActivity, breakdown] = await Promise.all([
    getDailyActivity(range, cardId),
    getCardClickBreakdown(cardId, range),
  ]);

  const totalViews = dailyActivity.reduce((sum, day) => sum + day.views, 0);
  const totalClicks = dailyActivity.reduce((sum, day) => sum + day.clicks, 0);

  function buildHref(nextRange: DateRangeKey) {
    return `/admin/cards/${cardId}?range=${nextRange}`;
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{t("title")}</h2>
        <DateRangeFilter value={range} buildHref={buildHref} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 sm:max-w-xs">
        <StatCard label={t("totalViews")} value={totalViews} icon={Eye} />
        <StatCard
          label={t("totalClicks")}
          value={totalClicks}
          icon={MousePointerClick}
        />
      </div>

      <div className="mb-5">
        <ActivityChart
          data={dailyActivity}
          labels={{ views: t("totalViews"), clicks: t("totalClicks") }}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          {t("clickBreakdown")}
        </h3>
        <CardClickBreakdownList rows={breakdown} />
      </div>
    </section>
  );
}
