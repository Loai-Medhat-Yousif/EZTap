import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getProfileImagePublicUrl } from "@/lib/storage/profile-images";
import type { Database } from "@/types/database";
import type { Card, CardStatus, CardType, Profile, ProfileLink } from "@/types";

export type CardStats = {
  total: number;
  active: number;
  inactive: number;
};

export async function getCardStats(): Promise<CardStats> {
  const supabase = await createClient();

  const [total, active, inactive] = await Promise.all([
    supabase.from("cards").select("*", { count: "exact", head: true }),
    supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    supabase
      .from("cards")
      .select("*", { count: "exact", head: true })
      .eq("status", "INACTIVE"),
  ]);

  for (const result of [total, active, inactive]) {
    if (result.error) throw result.error;
  }

  return {
    total: total.count ?? 0,
    active: active.count ?? 0,
    inactive: inactive.count ?? 0,
  };
}

export type RecentCard = {
  id: string;
  card_id: string;
  type: CardType;
  status: CardStatus;
  created_at: string;
  profileFullName: string | null;
};

/**
 * Latest N cards for the dashboard's "recent cards" panel, with each
 * PROFILE card's name attached.
 *
 * Deliberately two queries + an in-memory join rather than a single
 * PostgREST embedded-resource query (`cards.select("*, profiles(full_name)")`).
 * That embedding's return shape (object vs. one-item array) depends on
 * whether PostgREST's schema cache has resolved profiles.card_id as a
 * one-to-one relationship, which isn't something to assume without a
 * live project to check against — this version is unambiguous either way.
 */
export async function getRecentCards(limit = 5): Promise<RecentCard[]> {
  const supabase = await createClient();

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, card_id, type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cardsError) throw cardsError;
  if (!cards || cards.length === 0) return [];

  const profileCardUuids = cards
    .filter((card): card is Card & { type: "PROFILE" } => card.type === "PROFILE")
    .map((card) => card.id);

  const namesByCardUuid = new Map<string, string>();

  if (profileCardUuids.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("card_id, full_name")
      .in("card_id", profileCardUuids);

    if (profilesError) throw profilesError;

    for (const profile of profiles ?? []) {
      namesByCardUuid.set(profile.card_id, profile.full_name);
    }
  }

  return cards.map((card) => ({
    id: card.id,
    card_id: card.card_id,
    type: card.type,
    status: card.status,
    created_at: card.created_at,
    profileFullName: namesByCardUuid.get(card.id) ?? null,
  }));
}

export type CardDetail =
  | {
      type: "GOOGLE_REVIEW";
      id: string;
      card_id: string;
      status: CardStatus;
      created_at: string;
      price_egp: number | null;
      sold_at: string | null;
      google_review_url: string;
    }
  | {
      type: "PROFILE";
      id: string;
      card_id: string;
      status: CardStatus;
      created_at: string;
      price_egp: number | null;
      sold_at: string | null;
      profile: Profile | null;
      profileImageUrl: string | null;
      links: ProfileLink[];
    };

/** Full detail for the card edit page — the profile row (if any) is
 * loaded whole, since the profile editor needs every field, along with
 * every link (active and inactive — the admin manages both) and the
 * photo's public URL. */
export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const supabase = await createClient();
  return loadCardDetail(supabase, "card_id", cardId);
}

/** Same as getCardDetail(), but keyed on the internal UUID and using a
 * caller-supplied client — the customer edit-link path has no admin
 * session, so it passes the service-role client scoped to one token. */
export async function getCardDetailByUuid(
  supabase: SupabaseClient<Database>,
  cardUuid: string,
): Promise<CardDetail | null> {
  return loadCardDetail(supabase, "id", cardUuid);
}

async function loadCardDetail(
  supabase: SupabaseClient<Database>,
  column: "card_id" | "id",
  value: string,
): Promise<CardDetail | null> {
  const { data: card, error } = await supabase
    .from("cards")
    .select(
      "id, card_id, type, status, created_at, google_review_url, price_egp, sold_at",
    )
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  if (!card) return null;

  if (card.type === "GOOGLE_REVIEW") {
    return {
      type: "GOOGLE_REVIEW",
      id: card.id,
      card_id: card.card_id,
      status: card.status,
      created_at: card.created_at,
      price_egp: card.price_egp,
      sold_at: card.sold_at,
      // Guaranteed non-null by the google_review_url_matches_card_type
      // CHECK constraint for this card type.
      google_review_url: card.google_review_url as string,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("card_id", card.id)
    .maybeSingle();

  if (profileError) throw profileError;

  let links: ProfileLink[] = [];
  if (profile) {
    const { data: linkRows, error: linksError } = await supabase
      .from("profile_links")
      .select("*")
      .eq("profile_id", profile.id)
      .order("sort_order", { ascending: true });

    if (linksError) throw linksError;
    links = linkRows ?? [];
  }

  const profileImageUrl =
    profile?.profile_image_path
      ? getProfileImagePublicUrl(supabase, profile.profile_image_path)
      : null;

  return {
    type: "PROFILE",
    id: card.id,
    card_id: card.card_id,
    status: card.status,
    created_at: card.created_at,
    price_egp: card.price_egp,
    sold_at: card.sold_at,
    profile: profile ?? null,
    profileImageUrl,
    links,
  };
}

export type CardListRow = {
  id: string;
  card_id: string;
  type: CardType;
  status: CardStatus;
  created_at: string;
  profileFullName: string | null;
  googleReviewUrl: string | null;
  viewCount: number;
  clickCount: number;
};

export type CardListResult = {
  rows: CardListRow[];
  total: number;
  pageSize: number;
};

export async function listCards(filters: {
  q?: string;
  type: "ALL" | CardType;
  status: "ALL" | CardStatus;
  page: number;
  pageSize?: number;
}): Promise<CardListResult> {
  const pageSize = filters.pageSize ?? 20;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("admin_list_cards", {
    p_query: filters.q || null,
    p_type: filters.type,
    p_status: filters.status,
    p_page: filters.page,
    p_page_size: pageSize,
  });

  if (error) throw error;

  const rows: CardListRow[] = (data ?? []).map((row) => ({
    id: row.id,
    card_id: row.card_id,
    type: row.type,
    status: row.status,
    created_at: row.created_at,
    profileFullName: row.profile_full_name,
    googleReviewUrl: row.google_review_url,
    viewCount: Number(row.view_count),
    clickCount: Number(row.click_count),
  }));

  const total = data && data.length > 0 ? Number(data[0].total_count) : 0;

  return { rows, total, pageSize };
}
