import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DateRangeKey } from "@/lib/analytics/date-range";
import { resolveDateRange } from "@/lib/analytics/date-range";
import type { CardType } from "@/types";

export type GlobalAnalyticsOverview = {
  totalViews: number;
  totalClicks: number;
  todayViews: number;
  todayClicks: number;
};

/** Powers the Stage 4 dashboard's stat cards — all-time and today's
 * totals in two calls to the same function the Analytics page uses. */
export async function getGlobalAnalyticsOverview(): Promise<GlobalAnalyticsOverview> {
  const supabase = await createClient();
  const { startDate: today } = resolveDateRange("today");

  const [allTime, todayOnly] = await Promise.all([
    supabase.rpc("admin_global_totals", { p_start_date: null, p_end_date: null }),
    supabase.rpc("admin_global_totals", { p_start_date: today, p_end_date: today }),
  ]);

  if (allTime.error) throw allTime.error;
  if (todayOnly.error) throw todayOnly.error;

  return {
    totalViews: allTime.data?.[0]?.total_views ?? 0,
    totalClicks: allTime.data?.[0]?.total_clicks ?? 0,
    todayViews: todayOnly.data?.[0]?.total_views ?? 0,
    todayClicks: todayOnly.data?.[0]?.total_clicks ?? 0,
  };
}

export type DailyActivity = {
  day: string;
  views: number;
  clicks: number;
};

export async function getDailyActivity(
  range: DateRangeKey,
  cardId?: string,
): Promise<DailyActivity[]> {
  const supabase = await createClient();
  const { startDate, endDate } = resolveDateRange(range);

  const { data, error } = await supabase.rpc("admin_get_daily_activity", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_card_id: cardId ?? null,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    day: row.day,
    views: Number(row.views),
    clicks: Number(row.clicks),
  }));
}

export type RangeTotals = {
  totalViews: number;
  totalClicks: number;
};

/** Totals for an arbitrary selected range — the Analytics page's stat
 * cards. Distinct from getGlobalAnalyticsOverview() above, which is
 * fixed to all-time + today specifically for the dashboard. */
export async function getTotalsForRange(range: DateRangeKey): Promise<RangeTotals> {
  const supabase = await createClient();
  const { startDate, endDate } = resolveDateRange(range);

  const { data, error } = await supabase.rpc("admin_global_totals", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;

  return {
    totalViews: data?.[0]?.total_views ?? 0,
    totalClicks: data?.[0]?.total_clicks ?? 0,
  };
}

export type TopLink = {
  linkId: string;
  title: string;
  icon: string;
  cardId: string;
  clickCount: number;
};

export async function getTopLinks(range: DateRangeKey, limit = 10): Promise<TopLink[]> {
  const supabase = await createClient();
  const { startDate, endDate } = resolveDateRange(range);

  const { data, error } = await supabase.rpc("admin_top_links", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    linkId: row.link_id,
    title: row.title,
    icon: row.icon,
    cardId: row.card_id,
    clickCount: Number(row.click_count),
  }));
}

export type TopCard = {
  cardId: string;
  type: CardType;
  profileFullName: string | null;
  viewCount: number;
};

export async function getTopCards(range: DateRangeKey, limit = 10): Promise<TopCard[]> {
  const supabase = await createClient();
  const { startDate, endDate } = resolveDateRange(range);

  const { data, error } = await supabase.rpc("admin_top_cards", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    cardId: row.card_id,
    type: row.type,
    profileFullName: row.profile_full_name,
    viewCount: Number(row.view_count),
  }));
}

export type CardClickBreakdownRow = {
  kind: "CHANNEL" | "LINK";
  key: string;
  label: string | null;
  icon: string | null;
  clickCount: number;
};

export async function getCardClickBreakdown(
  cardId: string,
  range: DateRangeKey,
): Promise<CardClickBreakdownRow[]> {
  const supabase = await createClient();
  const { startDate, endDate } = resolveDateRange(range);

  const { data, error } = await supabase.rpc("admin_card_click_breakdown", {
    p_card_id: cardId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    kind: row.kind,
    key: row.key,
    label: row.label,
    icon: row.icon,
    clickCount: Number(row.click_count),
  }));
}
