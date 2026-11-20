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
      menu_profiles: {
        Row: {
          id: string;
          card_id: string;
          menu_image_path: string | null;
          print_template_kind: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          menu_image_path?: string | null;
          print_template_kind?: string;
          full_name: string;
          category?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          address?: string | null;
          opening_hours?: string | null;
          google_review_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          menu_image_path?: string | null;
          print_template_kind?: string;
          full_name?: string;
          category?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          address?: string | null;
          opening_hours?: string | null;
          google_review_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_profiles_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          id: string;
          menu_profile_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_profile_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_profile_id?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_profile_id_fkey";
            columns: ["menu_profile_id"];
            referencedRelation: "menu_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: string | null;
          image_path: string | null;
          is_available: boolean;
          sort_order: number;
          discount_label: string | null;
          discount_price: string | null;
          discount_starts_at: string | null;
          discount_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string | null;
          price?: string | null;
          image_path?: string | null;
          is_available?: boolean;
          sort_order?: number;
          discount_label?: string | null;
          discount_price?: string | null;
          discount_starts_at?: string | null;
          discount_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price?: string | null;
          image_path?: string | null;
          is_available?: boolean;
          sort_order?: number;
          discount_label?: string | null;
          discount_price?: string | null;
          discount_starts_at?: string | null;
          discount_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_offers: {
        Row: {
          id: string;
          menu_profile_id: string;
          title: string;
          description: string | null;
          image_path: string | null;
          price_text: string | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          menu_profile_id: string;
          title: string;
          description?: string | null;
          image_path?: string | null;
          price_text?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          menu_profile_id?: string;
          title?: string;
          description?: string | null;
          image_path?: string | null;
          price_text?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_offers_menu_profile_id_fkey";
            columns: ["menu_profile_id"];
            referencedRelation: "menu_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cards: {
        Row: {
          id: string;
          card_id: string;
          type: Database["public"]["Enums"]["card_type"];
          status: Database["public"]["Enums"]["card_status"];
          theme: string;
          target_url: string | null;
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
          theme?: string;
          target_url?: string | null;
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
          theme?: string;
          target_url?: string | null;
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
          qr_rotation_deg: number;
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
          qr_rotation_deg?: number;
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
          qr_rotation_deg?: number;
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
      store_profiles: {
        Row: {
          id: string;
          card_id: string;
          store_image_path: string | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          store_image_path?: string | null;
          full_name: string;
          category?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          address?: string | null;
          opening_hours?: string | null;
          google_review_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          store_image_path?: string | null;
          full_name?: string;
          category?: string | null;
          bio?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          google_maps_url?: string | null;
          address?: string | null;
          opening_hours?: string | null;
          google_review_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "store_profiles_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_profiles: {
        Row: {
          id: string;
          card_id: string;
          payment_image_path: string | null;
          full_name: string;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          payment_image_path?: string | null;
          full_name: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          payment_image_path?: string | null;
          full_name?: string;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_profiles_card_id_fkey";
            columns: ["card_id"];
            referencedRelation: "cards";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_links: {
        Row: {
          id: string;
          payment_profile_id: string;
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
          payment_profile_id: string;
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
          payment_profile_id?: string;
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
            foreignKeyName: "payment_links_payment_profile_id_fkey";
            columns: ["payment_profile_id"];
            referencedRelation: "payment_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      store_links: {
        Row: {
          id: string;
          store_profile_id: string;
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
          store_profile_id: string;
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
          store_profile_id?: string;
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
            foreignKeyName: "store_links_store_profile_id_fkey";
            columns: ["store_profile_id"];
            referencedRelation: "store_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          card_id: string;
          profile_link_id: string | null;
          store_link_id: string | null;
          payment_link_id: string | null;
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
          store_link_id?: string | null;
          payment_link_id?: string | null;
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
          store_link_id?: string | null;
          payment_link_id?: string | null;
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
          {
            foreignKeyName: "analytics_events_store_link_id_fkey";
            columns: ["store_link_id"];
            referencedRelation: "store_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "analytics_events_payment_link_id_fkey";
            columns: ["payment_link_id"];
            referencedRelation: "payment_links";
            referencedColumns: ["id"];
          },
        ];
      };
      social_links: {
        Row: {
          id: string;
          icon: string;
          label: string;
          url: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          icon: string;
          label: string;
          url: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          icon?: string;
          label?: string;
          url?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: number;
          make_your_own_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          make_your_own_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          make_your_own_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
      // Service-role only (revoked from anon/authenticated by the
      // security-hardening migration) — the sole write path for visitor
      // interaction tracking, reached through the app's /api/track
      // endpoint and the server-side view recorder. Never throws for a
      // bad/foreign id; it just drops the event, so callers can
      // fire-and-forget it.
      record_analytics_event: {
        Args: {
          p_card_id: string;
          p_event_type: Database["public"]["Enums"]["analytics_event_type"];
          p_profile_link_id?: string | null;
          p_store_link_id?: string | null;
          p_payment_link_id?: string | null;
          p_device_category?: string | null;
          p_browser?: string | null;
          p_os?: string | null;
          p_referrer?: string | null;
        };
        Returns: undefined;
      };
      // Public (anon + authenticated) — the global footer's social links
      // and "Want to make your own?" target. SECURITY DEFINER, so anon
      // never needs a grant on social_links / site_settings themselves.
      get_public_site_footer: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
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
          target_url: string | null;
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
      // Admin-only — per-type business summary (zero-filled across all
      // five card types): total created, active, sold, unsold and the
      // revenue each type's sales brought in.
      admin_card_type_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          card_type: string;
          total: number;
          active: number;
          sold: number;
          unsold: number;
          revenue: number;
        }[];
      };
    };
    Enums: {
      card_type:
        | "PROFILE"
        | "GOOGLE_REVIEW"
        | "INSTAPAY"
        | "ONLINE_CASH"
        | "STORE_PROFILE"
        | "MULTIPLE_PAYMENT_METHODS"
        | "MENU";
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
        | "SAVE_CONTACT_CLICK"
        | "REVIEW_CLICK";
    };
    CompositeTypes: Record<string, never>;
  };
};
