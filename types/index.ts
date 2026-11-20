import type { Database } from "./database";

export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
export type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert =
  Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate =
  Database["public"]["Tables"]["profiles"]["Update"];

export type ProfileLink =
  Database["public"]["Tables"]["profile_links"]["Row"];
export type ProfileLinkInsert =
  Database["public"]["Tables"]["profile_links"]["Insert"];
export type ProfileLinkUpdate =
  Database["public"]["Tables"]["profile_links"]["Update"];

export type AnalyticsEvent =
  Database["public"]["Tables"]["analytics_events"]["Row"];

export type CardEditLink = Database["public"]["Tables"]["card_edit_links"]["Row"];
export type CardEditLinkInsert =
  Database["public"]["Tables"]["card_edit_links"]["Insert"];

export type EditDuration = "forever" | "1d" | "1h" | "30m";
export const EDIT_DURATIONS: readonly EditDuration[] = [
  "forever",
  "1d",
  "1h",
  "30m",
];

export type StoreProfile = Database["public"]["Tables"]["store_profiles"]["Row"];
export type StoreProfileInsert =
  Database["public"]["Tables"]["store_profiles"]["Insert"];
export type StoreProfileUpdate =
  Database["public"]["Tables"]["store_profiles"]["Update"];

export type StoreLink = Database["public"]["Tables"]["store_links"]["Row"];
export type StoreLinkInsert =
  Database["public"]["Tables"]["store_links"]["Insert"];
export type StoreLinkUpdate =
  Database["public"]["Tables"]["store_links"]["Update"];

export type PaymentProfile =
  Database["public"]["Tables"]["payment_profiles"]["Row"];
export type PaymentProfileInsert =
  Database["public"]["Tables"]["payment_profiles"]["Insert"];
export type PaymentProfileUpdate =
  Database["public"]["Tables"]["payment_profiles"]["Update"];

export type PaymentLink = Database["public"]["Tables"]["payment_links"]["Row"];
export type PaymentLinkInsert =
  Database["public"]["Tables"]["payment_links"]["Insert"];
export type PaymentLinkUpdate =
  Database["public"]["Tables"]["payment_links"]["Update"];

export type MenuProfile = Database["public"]["Tables"]["menu_profiles"]["Row"];
export type MenuProfileInsert =
  Database["public"]["Tables"]["menu_profiles"]["Insert"];
export type MenuProfileUpdate =
  Database["public"]["Tables"]["menu_profiles"]["Update"];

export type MenuCategory =
  Database["public"]["Tables"]["menu_categories"]["Row"];
export type MenuCategoryInsert =
  Database["public"]["Tables"]["menu_categories"]["Insert"];
export type MenuCategoryUpdate =
  Database["public"]["Tables"]["menu_categories"]["Update"];

export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuItemInsert =
  Database["public"]["Tables"]["menu_items"]["Insert"];
export type MenuItemUpdate =
  Database["public"]["Tables"]["menu_items"]["Update"];

export type MenuOffer = Database["public"]["Tables"]["menu_offers"]["Row"];
export type MenuOfferInsert =
  Database["public"]["Tables"]["menu_offers"]["Insert"];
export type MenuOfferUpdate =
  Database["public"]["Tables"]["menu_offers"]["Update"];

export type SocialLink = Database["public"]["Tables"]["social_links"]["Row"];
export type SocialLinkInsert =
  Database["public"]["Tables"]["social_links"]["Insert"];
export type SocialLinkUpdate =
  Database["public"]["Tables"]["social_links"]["Update"];

export type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];

export type CardType = Database["public"]["Enums"]["card_type"];
export type CardStatus = Database["public"]["Enums"]["card_status"];
/** A card page's accent colour, stored as `#rrggbb`. */
export type CardTheme = string;
export type AnalyticsEventType =
  Database["public"]["Enums"]["analytics_event_type"];

/**
 * The accent every card starts on: the EZTab brand blue. It is also the
 * database default, so pre-existing cards keep the exact look they had
 * before per-card colours existed.
 */
export const DEFAULT_CARD_THEME = "#005cf2";

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

/**
 * Runtime guard for a stored accent colour. Writes are validated by
 * cardThemeSchema; this protects the read path (an old/unknown value
 * falls back to the brand blue instead of producing an invalid CSS
 * variable).
 */
export function isCardTheme(value: unknown): value is CardTheme {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** The card types whose whole purpose is to redirect a scan straight to
 * an external URL (no EZTab page in between). */
export const REDIRECT_CARD_TYPES = [
  "GOOGLE_REVIEW",
  "INSTAPAY",
  "ONLINE_CASH",
] as const;
export type RedirectCardType = (typeof REDIRECT_CARD_TYPES)[number];

export function isRedirectCardType(type: CardType): type is RedirectCardType {
  return (REDIRECT_CARD_TYPES as readonly string[]).includes(type);
}

export const CARD_TYPES: readonly CardType[] = [
  "PROFILE",
  "GOOGLE_REVIEW",
  "INSTAPAY",
  "ONLINE_CASH",
  "STORE_PROFILE",
  "MULTIPLE_PAYMENT_METHODS",
  "MENU",
];
export const CARD_STATUSES: readonly CardStatus[] = ["ACTIVE", "INACTIVE"];

/** The active MULTIPLE_PAYMENT_METHODS shape returned by
 * `get_card_for_display()` (see migration 20261117000200). */
export type ActivePaymentView = {
  status: "ACTIVE";
  type: "MULTIPLE_PAYMENT_METHODS";
  card_id: string;
  theme: CardTheme;
  payment: {
    full_name: string;
    bio: string | null;
    payment_image_path: string | null;
  };
  links: PublicCardLink[];
};

/** Public (active/available, time-filtered) menu item shape. */
export type PublicMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  image_path: string | null;
  discount_label: string | null;
  discount_price: string | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
};

/** Public (active) menu category with its visible items. */
export type PublicMenuCategory = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

/** Public (active, in-window) menu offer shape. */
export type PublicMenuOffer = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  price_text: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

/** The active MENU shape returned by `get_card_for_display()`. */
export type ActiveMenuView = {
  status: "ACTIVE";
  type: "MENU";
  card_id: string;
  theme: CardTheme;
  menu: {
    full_name: string;
    category: string | null;
    bio: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    google_maps_url: string | null;
    address: string | null;
    opening_hours: string | null;
    google_review_url: string | null;
    menu_image_path: string | null;
  };
  categories: PublicMenuCategory[];
  offers: PublicMenuOffer[];
};

/**
 * The shape `get_card_for_display()` returns (see migrations
 * 20261017000300, 20261019000100, 20261109000100, 20261117000200,
 * 20261119000200 and 20260925000600). Mirrors the function's
 * `jsonb_build_object` calls exactly — keep the two in sync if either
 * changes.
 */
export type PublicCardView =
  | { status: "INACTIVE"; type: CardType }
  | {
      status: "ACTIVE";
      type: RedirectCardType;
      target_url: string;
    }
  | {
      status: "ACTIVE";
      type: "PROFILE";
      card_id: string;
      theme: CardTheme;
      profile: {
        full_name: string;
        job_title: string | null;
        bio: string | null;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        website: string | null;
        google_maps_url: string | null;
        profile_image_path: string | null;
      };
      links: PublicCardLink[];
    }
  | {
      status: "ACTIVE";
      type: "STORE_PROFILE";
      card_id: string;
      theme: CardTheme;
      store: {
        full_name: string;
        category: string | null;
        bio: string | null;
        phone: string | null;
        whatsapp: string | null;
        email: string | null;
        website: string | null;
        google_maps_url: string | null;
        address: string | null;
        opening_hours: string | null;
        google_review_url: string | null;
        store_image_path: string | null;
      };
      links: PublicCardLink[];
    }
  | ActivePaymentView
  | ActiveMenuView;

export type PublicCardLink = {
  id: string;
  icon: string;
  title: string;
  url: string;
};

/** The shape `get_public_site_footer()` returns. */
export type PublicSiteFooter = {
  social_links: Array<{ id: string; icon: string; label: string; url: string }>;
  make_your_own_url: string | null;
};

export type { Database, Json } from "./database";
