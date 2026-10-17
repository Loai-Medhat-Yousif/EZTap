/**
 * Supabase database types for the EZTab schema (supabase/migrations/).
 *
 * Hand-written to exactly match what `supabase gen types typescript`
 * produces, so swapping this file for the real generated one later
 * (once the Supabase project exists and the CLI can introspect it) is a
 * drop-in replacement — no consuming code changes:
 *
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string;
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          status: Database["public"]["Enums"]["card_status"];
          google_review_url: string | null;
          price_egp: number | null;
          sold_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          status?: Database["public"]["Enums"]["card_status"];
          google_review_url?: string | null;
          price_egp?: number | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          type?: Database["public"]["Enums"]["card_type"];
          status?: Database["public"]["Enums"]["card_status"];
          google_review_url?: string | null;
          price_egp?: number | null;
          sold_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      card_edit_links: {
        Row: {
          id: string;
          card_id: string;
          token_hash: string;
          created_at: string;
          opened_at: string | null;
          expires_at: string | null;
          closed_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          card_id: string;
          token_hash: string;
          created_at?: string;
          opened_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          card_id?: string;
          token_hash?: string;
          created_at?: string;
          opened_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "card_edit_links_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      card_purchases: {
        Row: {
          id: string;
          quantity: number;
          total_cost: number;
          purchased_on: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quantity: number;
          total_cost: number;
          purchased_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quantity?: number;
          total_cost?: number;
          purchased_on?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          card_id: string;
          profile_image_path: string | null;
          full_name: string;
          job_title: string | null;
          bio: string | null;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          website: string | null;
          google_maps_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          profile_image_path?: string | null;
          full_name: string;
          job_title?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          profile_image_path?: string | null;
          full_name?: string;
          job_title?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      print_template: {
        Row: {
          kind: string;
          width_cm: number;
          height_cm: number;
          design_path: string | null;
          card_id_x: number;
          card_id_y: number;
          card_id_font_size: number;
          card_id_color: string;
          qr_x: number;
          qr_y: number;
          qr_size: number;
          updated_at: string;
        };
        Insert: {
          kind: string;
          width_cm?: number;
          height_cm?: number;
          design_path?: string | null;
          card_id_x?: number;
          card_id_y?: number;
          card_id_font_size?: number;
          card_id_color?: string;
          qr_x?: number;
          qr_y?: number;
          qr_size?: number;
          updated_at?: string;
        };
        Update: {
          kind?: string;
          width_cm?: number;
          height_cm?: number;
          design_path?: string | null;
          card_id_x?: number;
          card_id_y?: number;
          card_id_font_size?: number;
          card_id_color?: string;
          qr_x?: number;
          qr_y?: number;
          qr_size?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_links: {
        Row: {
          id: string;
          profile_id: string;
          icon: string;
          title: string;
          url: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          icon: string;
          title: string;
          url: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          icon?: string;
          title?: string;
          url?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_links_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          card_id: string;
          profile_link_id: string | null;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          device_category: string | null;
          browser: string | null;
          os: string | null;
          referrer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          profile_link_id?: string | null;
          event_type: Database["public"]["Enums"]["analytics_event_type"];
          device_category?: string | null;
          browser?: string | null;
          os?: string | null;
          referrer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          profile_link_id?: string | null;
          event_type?: Database["public"]["Enums"]["analytics_event_type"];
          device_category?: string | null;
          browser?: string | null;
          os?: string | null;
          referrer?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_profile_link_id_fkey";
            columns: ["profile_link_id"];
            referencedRelation: "profile_links";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      // Admin-only (see migration 20260925000500) — generates a fresh,
      // not-yet-used 6-digit card_id. The caller must still handle a
      // unique_violation on the subsequent INSERT; see that migration's
      // comment for why.
      generate_unique_card_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      // Public (anon + authenticated) — the sole read path for
      // /card/[cardId]. Returns null for an unknown card_id.
      get_card_for_display: {
        Args: { p_card_id: string };
        Returns: Json;
      };
      // Public (anon + authenticated) — the sole write path for visitor
      // interaction tracking. Never throws for a bad/foreign id; it
      // just drops the event, so callers can fire-and-forget it.
      record_analytics_event: {
        Args: {
          p_card_id: string;
          p_event_type: Database["public"]["Enums"]["analytics_event_type"];
          p_profile_link_id?: string | null;
          p_device_category?: string | null;
          p_browser?: string | null;
          p_os?: string | null;
          p_referrer?: string | null;
        };
        Returns: undefined;
      };
      // True when the caller's JWT carries app_metadata.role = "admin".
      // What every RLS policy and storage policy is gated on.
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      // Service-role only. Atomic fixed-window counter: true while the
      // hit is within `p_limit` per `p_window_seconds` for `p_key`.
      rate_limit_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
      // Admin-only — powers both the dashboard's and the Analytics
      // page's activity charts with one zero-filled, per-day aggregate
      // query, scoped to a date range and optionally to one card.
      admin_get_daily_activity: {
        Args: {
          p_start_date?: string | null;
          p_end_date?: string | null;
          p_card_id?: string | null;
        };
        Returns: { day: string; views: number; clicks: number }[];
      };
      // Admin-only — total views/clicks across every card, for a date range.
      admin_global_totals: {
        Args: { p_start_date?: string | null; p_end_date?: string | null };
        Returns: { total_views: number; total_clicks: number }[];
      };
      // Admin-only — most-clicked dynamic links across every card, for
      // a date range.
      admin_top_links: {
        Args: {
          p_start_date?: string | null;
          p_end_date?: string | null;
          p_limit?: number;
        };
        Returns: {
          link_id: string;
          title: string;
          icon: string;
          card_id: string;
          click_count: number;
        }[];
      };
      // Admin-only — most-viewed cards, for a date range.
      admin_top_cards: {
        Args: {
          p_start_date?: string | null;
          p_end_date?: string | null;
          p_limit?: number;
        };
        Returns: {
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          profile_full_name: string | null;
          view_count: number;
        }[];
      };
      // Admin-only — one card's click breakdown: fixed contact
      // channels (CHANNEL rows, keyed by event_type) and individual
      // dynamic links (LINK rows, carrying their own title/icon), for
      // a date range.
      admin_card_click_breakdown: {
        Args: {
          p_card_id: string;
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          kind: "CHANNEL" | "LINK";
          key: string;
          label: string | null;
          icon: string | null;
          click_count: number;
        }[];
      };
      // Admin-only — the Cards table's search/filter/pagination query,
      // with each row's view/click counts and a window-function
      // `total_count` for pagination.
      admin_list_cards: {
        Args: {
          p_query?: string | null;
          p_type?: string;
          p_status?: string;
          p_page?: number;
          p_page_size?: number;
        };
        Returns: {
          id: string;
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          status: Database["public"]["Enums"]["card_status"];
          created_at: string;
          profile_full_name: string | null;
          google_review_url: string | null;
          view_count: number;
          click_count: number;
          total_count: number;
        }[];
      };
      // Admin-only — per-month income/sold-card totals for every month
      // that has at least one sold card (Cairo calendar months).
      admin_income_monthly: {
        Args: Record<PropertyKey, never>;
        Returns: {
          year: number;
          month: number;
          income: number;
          cards_sold: number;
        }[];
      };
      // Admin-only — the individual cards sold in one Cairo calendar
      // month, with each PROFILE card's name attached.
      admin_income_cards: {
        Args: { p_year: number; p_month: number };
        Returns: {
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          profile_full_name: string | null;
          price_egp: number | null;
          sold_at: string;
        }[];
      };
      // Admin-only — derived inventory snapshot: bought/programmed/
      // blank/unsold/sold counts plus revenue, cost and profit (the
      // "true income" = sales income - purchase cost).
      admin_inventory_overview: {
        Args: Record<PropertyKey, never>;
        Returns: {
          cards_bought: number;
          cards_programmed: number;
          cards_sold: number;
          cards_blank: number;
          cards_unsold: number;
          revenue: number;
          cost: number;
          profit: number;
        }[];
      };
      // Admin-only — zero-filled income/cost/profit series bucketed by
      // day, week or month (Cairo time), for the Statistics chart.
      admin_income_series: {
        Args: { p_granularity: string; p_buckets?: number };
        Returns: {
          bucket_start: string;
          income: number;
          cost: number;
          profit: number;
        }[];
      };
      // Admin-only — current-period (today / this month / this year,
      // Cairo time) income, cost, profit and cards sold, for the
      // Statistics summary cards.
      admin_income_period: {
        Args: { p_granularity: string };
        Returns: {
          income: number;
          cost: number;
          profit: number;
          cards_sold: number;
        }[];
      };
    };
    Enums: {
      card_type: "PROFILE" | "GOOGLE_REVIEW";
      card_status: "ACTIVE" | "INACTIVE";
      analytics_event_type:
        | "VIEW"
        | "LINK_CLICK"
        | "PHONE_CLICK"
        | "WHATSAPP_CLICK"
        | "EMAIL_CLICK"
        | "WEBSITE_CLICK"
        | "MAPS_CLICK"
        | "SHARE_CLICK"
        | "SAVE_CONTACT_CLICK";
    };
    CompositeTypes: Record<string, never>;
  };
};
