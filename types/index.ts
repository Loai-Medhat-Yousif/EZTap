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

export type CardType = Database["public"]["Enums"]["card_type"];
export type CardStatus = Database["public"]["Enums"]["card_status"];
export type AnalyticsEventType =
  Database["public"]["Enums"]["analytics_event_type"];

export const CARD_TYPES: readonly CardType[] = ["PROFILE", "GOOGLE_REVIEW"];
export const CARD_STATUSES: readonly CardStatus[] = ["ACTIVE", "INACTIVE"];

/**
 * The shape `get_card_for_display()` returns (see migration
 * 20260925000600). Mirrors the function's `jsonb_build_object` calls
 * exactly — keep the two in sync if either changes.
 */
export type PublicCardView =
  | { status: "INACTIVE"; type: CardType }
  | { status: "ACTIVE"; type: "GOOGLE_REVIEW"; google_review_url: string }
  | {
      status: "ACTIVE";
      type: "PROFILE";
      card_id: string;
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
      links: Array<{
        id: string;
        icon: string;
        title: string;
        url: string;
      }>;
    };

export type { Database, Json } from "./database";
