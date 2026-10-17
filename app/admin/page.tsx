import { getTranslations } from "next-intl/server";
import {
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { getCardStats, getRecentCards } from "@/lib/data/cards";
import {
  getGlobalAnalyticsOverview,
  getDailyActivity,
} from "@/lib/data/analytics";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityChart } from "@/components/admin/activity-chart";
import { RecentCardsList } from "@/components/admin/recent-cards-list";

export default async function AdminHomePage() {
  const t = await getTranslations("dashboard");

  const [cardStats, analytics, dailyActivity, recentCards] =
    await Promise.all([
      getCardStats(),
      getGlobalAnalyticsOverview(),
      getDailyActivity("7d"),
      getRecentCards(5),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label={t("totalCards")} value={cardStats.total} icon={LayoutGrid} />
        <StatCard
          label={t("activeCards")}
          value={cardStats.active}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label={t("inactiveCards")}
          value={cardStats.inactive}
          icon={XCircle}
          tone="muted"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("totalViews")} value={analytics.totalViews} icon={Eye} />
        <StatCard
          label={t("totalClicks")}
          value={analytics.totalClicks}
          icon={MousePointerClick}
        />
        <StatCard
          label={t("todayViews")}
          value={analytics.todayViews}
          icon={Eye}
          tone="muted"
        />
        <StatCard
          label={t("todayClicks")}
          value={analytics.todayClicks}
          icon={MousePointerClick}
          tone="muted"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-raised p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink">
            {t("activityChartTitle")}
          </h2>
          <ActivityChart
            data={dailyActivity}
            labels={{ views: t("totalViews"), clicks: t("totalClicks") }}
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">
            {t("recentCards")}
          </h2>
          <RecentCardsList cards={recentCards} />
        </div>
      </div>
    </div>
  );
}
