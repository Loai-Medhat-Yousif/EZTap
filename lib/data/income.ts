import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CardType } from "@/types";

export type MonthIncome = {
  year: number;
  month: number;
  /** Numeric from PostgREST arrives as a string for `numeric`. */
  income: number;
  cardsSold: number;
};

export type IncomeOverview = {
  months: MonthIncome[];
  lifetimeIncome: number;
  lifetimeCardsSold: number;
};

export type SoldCard = {
  card_id: string;
  type: CardType;
  profileFullName: string | null;
  priceEgp: number | null;
  soldAt: string;
};

export type MonthIncomeDetail = {
  year: number;
  month: number;
  income: number;
  cardsSold: number;
  cards: SoldCard[];
};

export type IncomeGranularity = "day" | "week" | "month";

/** The top summary cards only offer today / this month / this year. */
export type SummaryPeriod = "day" | "month" | "year";

export const SERIES_BUCKETS: Record<IncomeGranularity, number> = {
  day: 30,
  week: 12,
  month: 12,
};

export type IncomeSummary = {
  income: number;
  cost: number;
  profit: number;
  cardsSold: number;
};

export type IncomeSeriesPoint = {
  bucketStart: string;
  income: number;
  cost: number;
  profit: number;
};

export type InventoryOverview = {
  cardsBought: number;
  cardsProgrammed: number;
  cardsSold: number;
  cardsBlank: number;
  cardsUnsold: number;
  revenue: number;
  cost: number;
  profit: number;
};

export type CardPurchase = {
  id: string;
  quantity: number;
  totalCost: number;
  purchasedOn: string;
  note: string | null;
  createdAt: string;
};

/** Every month that has at least one sold card, newest first, plus the
 * lifetime totals (which are just their sums — no extra query). */
export async function getIncomeOverview(): Promise<IncomeOverview> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_income_monthly");
  if (error) throw error;

  const months: MonthIncome[] = (data ?? []).map((row) => ({
    year: Number(row.year),
    month: Number(row.month),
    income: Number(row.income),
    cardsSold: Number(row.cards_sold),
  }));

  return {
    months,
    lifetimeIncome: months.reduce((sum, m) => sum + m.income, 0),
    lifetimeCardsSold: months.reduce((sum, m) => sum + m.cardsSold, 0),
  };
}

export async function getMonthIncomeDetail(
  year: number,
  month: number,
): Promise<MonthIncomeDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_income_cards", {
    p_year: year,
    p_month: month,
  });
  if (error) throw error;

  const cards: SoldCard[] = (data ?? []).map((row) => ({
    card_id: row.card_id,
    type: row.type,
    profileFullName: row.profile_full_name,
    priceEgp: row.price_egp === null ? null : Number(row.price_egp),
    soldAt: row.sold_at,
  }));

  return {
    year,
    month,
    income: cards.reduce((sum, card) => sum + (card.priceEgp ?? 0), 0),
    cardsSold: cards.length,
    cards,
  };
}

/** Current stock/income snapshot: bought vs. programmed vs. sold, and
 * the money in/out. */
export async function getInventoryOverview(): Promise<InventoryOverview> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_inventory_overview");
  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) {
    return {
      cardsBought: 0,
      cardsProgrammed: 0,
      cardsSold: 0,
      cardsBlank: 0,
      cardsUnsold: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
  }

  return {
    cardsBought: Number(row.cards_bought),
    cardsProgrammed: Number(row.cards_programmed),
    cardsSold: Number(row.cards_sold),
    cardsBlank: Number(row.cards_blank),
    cardsUnsold: Number(row.cards_unsold),
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.profit),
  };
}

/** Zero-filled income/cost/profit series for the Statistics chart. */
export async function getIncomeSeries(
  granularity: IncomeGranularity,
): Promise<IncomeSeriesPoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_income_series", {
    p_granularity: granularity,
    p_buckets: SERIES_BUCKETS[granularity],
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    bucketStart: row.bucket_start,
    income: Number(row.income),
    cost: Number(row.cost),
    profit: Number(row.profit),
  }));
}

/** Current-period totals for the Statistics summary cards. */
export async function getIncomeSummary(
  period: SummaryPeriod,
): Promise<IncomeSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_income_period", {
    p_granularity: period,
  });
  if (error) throw error;

  const row = (data ?? [])[0];
  return {
    income: Number(row?.income ?? 0),
    cost: Number(row?.cost ?? 0),
    profit: Number(row?.profit ?? 0),
    cardsSold: Number(row?.cards_sold ?? 0),
  };
}

/** The recorded purchase receipts, newest first. */
export async function getPurchases(): Promise<CardPurchase[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("card_purchases")
    .select("id, quantity, total_cost, purchased_on, note, created_at")
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    quantity: row.quantity,
    totalCost: Number(row.total_cost),
    purchasedOn: row.purchased_on,
    note: row.note,
    createdAt: row.created_at,
  }));
}
