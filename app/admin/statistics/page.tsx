import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  KeyRound,
  Boxes,
  PackageOpen,
  PackageCheck,
  Coins,
} from "lucide-react";
import {
  getIncomeOverview,
  getMonthIncomeDetail,
  getInventoryOverview,
  getIncomeSeries,
  getIncomeSummary,
  getPurchases,
  type IncomeGranularity,
  type SummaryPeriod,
} from "@/lib/data/income";
import { StatCard } from "@/components/admin/stat-card";
import { IncomeChart } from "@/components/admin/income-chart";
import { PurchasesManager } from "@/components/admin/purchases-manager";

export const metadata = {
  robots: { index: false, follow: false },
};

const GRANULARITIES: IncomeGranularity[] = ["day", "week", "month"];
const SUMMARY_PERIODS: SummaryPeriod[] = ["day", "month", "year"];

/** The Cairo calendar month for "today" — income is bucketed by Cairo
 * time in the SQL, so the default month has to agree with it. */
function currentCairoMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "1");
  return { year: get("year"), month: get("month") };
}

/** ISO calendar date (YYYY-MM-DD) for "today" in Cairo — used as the
 * default value of the purchase-receipt date field. */
function cairoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function monthLabel(locale: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseGranularity(value: string | string[] | undefined): IncomeGranularity {
  const first = firstParam(value);
  return GRANULARITIES.includes(first as IncomeGranularity)
    ? (first as IncomeGranularity)
    : "month";
}

function parseSummaryPeriod(value: string | string[] | undefined): SummaryPeriod {
  const first = firstParam(value);
  return SUMMARY_PERIODS.includes(first as SummaryPeriod)
    ? (first as SummaryPeriod)
    : "month";
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const [t, locale, overview] = await Promise.all([
    getTranslations("statistics"),
    getLocale(),
    getIncomeOverview(),
  ]);

  const current = currentCairoMonth();

  let year = current.year;
  let month = current.month;
  const requested = firstParam(raw.month);
  if (requested) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(requested);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
    }
  }

  const granularity = parseGranularity(raw.period);
  const summaryPeriod = parseSummaryPeriod(raw.summary);

  const [detail, inventory, series, summary, purchases] = await Promise.all([
    getMonthIncomeDetail(year, month),
    getInventoryOverview(),
    getIncomeSeries(granularity),
    getIncomeSummary(summaryPeriod),
    getPurchases(),
  ]);

  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  });

  const available = overview.months.slice();
  // Always offer the current month, even if nothing has sold yet.
  if (!available.some((m) => m.year === current.year && m.month === current.month)) {
    available.unshift({ year: current.year, month: current.month, income: 0, cardsSold: 0 });
  }

  const monthParam = `${year}-${String(month).padStart(2, "0")}`;
  const linkSuffix = `&period=${granularity}&summary=${summaryPeriod}`;

  const periodLabel: Record<IncomeGranularity, string> = {
    day: t("periodDay"),
    week: t("periodWeek"),
    month: t("periodMonth"),
  };

  const summaryLabel: Record<SummaryPeriod, string> = {
    day: t("summaryToday"),
    month: t("summaryMonth"),
    year: t("summaryYear"),
  };

  const chartLabels = {
    income: t("chartIncome"),
    cost: t("chartCost"),
    profit: t("chartProfit"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <span className="text-sm text-muted">{t("subtitle")}</span>
      </div>

      {/* --- Period summary (income/spend/profit/sold) --------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-ink">
            {t("summaryTitle")}
          </h2>
          {SUMMARY_PERIODS.map((period) => {
            const active = period === summaryPeriod;
            return (
              <Link
                key={period}
                href={`/admin/statistics?month=${monthParam}&period=${granularity}&summary=${period}`}
                className={
                  active
                    ? "rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-border bg-surface px-3 py-1 text-xs text-muted hover:text-ink"
                }
              >
                {summaryLabel[period]}
              </Link>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:max-w-6xl">
          <StatCard
            label={t("statRevenue")}
            value={money.format(summary.income)}
            icon={Wallet}
          />
          <StatCard
            label={t("statCost")}
            value={money.format(summary.cost)}
            icon={Coins}
          />
          <StatCard
            label={t("statProfit")}
            value={money.format(summary.profit)}
            icon={TrendingUp}
            tone={summary.profit >= 0 ? "success" : "default"}
          />
          <StatCard
            label={t("statSold")}
            value={summary.cardsSold}
            icon={CreditCard}
          />
        </div>
      </section>

      {/* --- All-time inventory snapshot ----------------------------- */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink">{t("inventoryTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 xl:max-w-6xl">
          <StatCard
            label={t("statBought")}
            value={inventory.cardsBought}
            icon={Boxes}
          />
          <StatCard
            label={t("statProgrammed")}
            value={inventory.cardsProgrammed}
            icon={KeyRound}
          />
          <StatCard
            label={t("statBlank")}
            value={inventory.cardsBlank}
            icon={PackageOpen}
          />
          <StatCard
            label={t("statUnsold")}
            value={inventory.cardsUnsold}
            icon={PackageCheck}
          />
          <StatCard
            label={t("statSoldAllTime")}
            value={inventory.cardsSold}
            icon={CreditCard}
          />
        </div>
      </section>

      {/* --- Income/cost/profit over time ---------------------------- */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-ink">
            {t("overTimeTitle")}
          </h2>
          {GRANULARITIES.map((gran) => {
            const active = gran === granularity;
            return (
              <Link
                key={gran}
                href={`/admin/statistics?month=${monthParam}&period=${gran}&summary=${summaryPeriod}`}
                className={
                  active
                    ? "rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-border bg-surface px-3 py-1 text-xs text-muted hover:text-ink"
                }
              >
                {periodLabel[gran]}
              </Link>
            );
          })}
        </div>

        <IncomeChart
          data={series}
          granularity={granularity}
          locale={locale}
          labels={chartLabels}
        />
      </section>

      {/* --- Purchases (buy receipts) -------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-ink">
            {t("purchasesTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("purchasesDescription")}
          </p>
        </div>

        <PurchasesManager purchases={purchases} today={cairoToday()} />
      </section>

      {/* --- Per-month sales detail ---------------------------------- */}
      <div className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-ink">
            {t("selectMonth")}
          </h2>
          {available.map((entry) => {
            const active = entry.year === year && entry.month === month;
            return (
              <Link
                key={`${entry.year}-${entry.month}`}
                href={`/admin/statistics?month=${entry.year}-${String(entry.month).padStart(2, "0")}${linkSuffix}`}
                className={
                  active
                    ? "rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-border bg-surface px-3 py-1 text-xs text-muted hover:text-ink"
                }
              >
                {monthLabel(locale, entry.year, entry.month)}
              </Link>
            );
          })}
        </div>

        {detail.cards.length === 0 ? (
          <p className="text-sm text-muted">{t("noSales")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">{t("columnCardId")}</th>
                  <th className="py-2 pr-4">{t("columnProfile")}</th>
                  <th className="py-2 pr-4">{t("columnType")}</th>
                  <th className="py-2 pr-4">{t("columnPrice")}</th>
                  <th className="py-2 pr-4">{t("columnSoldOn")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.cards.map((card) => (
                  <tr key={card.card_id} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono text-ink">
                      <Link
                        href={`/admin/cards/${card.card_id}`}
                        className="hover:text-primary"
                      >
                        {card.card_id}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-ink">
                      {card.profileFullName ?? t("unnamedProfile")}
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {card.type === "PROFILE"
                        ? t("typeProfile")
                        : t("typeGoogleReview")}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-ink">
                      {card.priceEgp === null ? "—" : money.format(card.priceEgp)}
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        new Date(card.soldAt),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
