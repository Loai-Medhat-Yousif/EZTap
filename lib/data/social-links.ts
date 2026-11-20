import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PublicSiteFooter, SiteSettings, SocialLink } from "@/types";

/**
 * The anon read path for the global footer, via the SECURITY DEFINER
 * `get_public_site_footer()` RPC. Wrapped in cache() because both the
 * card page and its generateMetadata-adjacent work may call it, and one
 * request should hit the database once.
 */
export const getPublicSiteFooter = cache(
  async (): Promise<PublicSiteFooter> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_site_footer");

    if (error) throw error;

    const footer = data as PublicSiteFooter | null;
    return {
      social_links: footer?.social_links ?? [],
      make_your_own_url: footer?.make_your_own_url ?? null,
    };
  },
);

/** Admin view: every social link, active or not, in display order. */
export async function getSocialLinks(): Promise<SocialLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_links")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Admin view: the single site-settings row. */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}
