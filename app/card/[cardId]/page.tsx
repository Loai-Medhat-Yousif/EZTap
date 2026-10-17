import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { getPublicCardView } from "@/lib/data/public-card";
import { getCardProfileUrl } from "@/lib/cards/urls";
import { getDeviceCategoryFromUserAgent } from "@/lib/analytics/parse-user-agent";
import { referrerOrigin } from "@/lib/analytics/referrer";
import { isValidCardId } from "@/lib/cards/ids";
import { getClientIp } from "@/lib/security/client-ip";
import { hashIdentifier, rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileImagePublicUrl } from "@/lib/storage/profile-images";
import { createClient } from "@/lib/supabase/server";
import { StatusScreen } from "@/components/shared/status-screen";
import { PublicProfileRedesigned } from "@/components/profile/public-profile-redesigned";

type PageProps = {
  params: Promise<{ cardId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cardId } = await params;
  const view = isValidCardId(cardId) ? await getPublicCardView(cardId) : null;

  if (!view || view.status !== "ACTIVE" || view.type !== "PROFILE") {
    // Inactive, not-found, and Google Review cards are all deliberately
    // not indexable — spec section 21: admin/non-profile pages must be
    // noindex, and a Google Review "card" is a redirect, not a page.
    return { title: "EZTab", robots: { index: false, follow: false } };
  }

  const { profile } = view;
  const title = [profile.full_name, profile.job_title].filter(Boolean).join(" | ");
  const description =
    profile.bio || `${profile.full_name}'s digital business card, powered by EZTab.`;
  const canonical = getCardProfileUrl(view.card_id);

  const supabase = await createClient();
  const imageUrl = profile.profile_image_path
    ? getProfileImagePublicUrl(supabase, profile.profile_image_path)
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | EZTab`,
      description,
      url: canonical,
      type: "profile",
      images: imageUrl ? [imageUrl] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${title} | EZTab`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CardPage({ params }: PageProps) {
  const { cardId } = await params;

  // Malformed IDs can't match a card (cards.card_id is CHECK-constrained
  // to six digits), so don't spend a database round trip finding out.
  if (!isValidCardId(cardId)) notFound();

  const view = await getPublicCardView(cardId);
  if (!view) notFound();

  // Deferred via after() so recording the view never delays the
  // response the visitor is waiting on — including the redirect below,
  // which after() explicitly still runs following (see its docs).
  // Headers are read now (outside the callback) since after() runs
  // once the response is already finished, when the original request
  // headers should still be read up front rather than relied on later.
  const headerList = await headers();
  const deviceCategory = getDeviceCategoryFromUserAgent(
    headerList.get("user-agent"),
  );
  const referrer = referrerOrigin(headerList.get("referer"));
  const ipHash = hashIdentifier(getClientIp(headerList));

  after(async () => {
    // Refreshing a card, or a script walking through card IDs, must not
    // be able to inflate the numbers: at most 10 views of one card and
    // 120 views overall per visitor per minute get counted. Runs inside
    // after(), so the checks cost the visitor no latency.
    const [perCardOk, overallOk] = await Promise.all([
      rateLimit(`view:${ipHash}:${cardId}`, 10, 60),
      rateLimit(`view:${ipHash}`, 120, 60),
    ]);
    if (!perCardOk || !overallOk) return;

    const { error } = await createAdminClient().rpc("record_analytics_event", {
      p_card_id: cardId,
      p_event_type: "VIEW",
      p_device_category: deviceCategory,
      p_referrer: referrer,
    });
    if (error) console.error("[card view] record failed:", error.message);
  });

  if (view.status === "INACTIVE") {
    return <InactiveCard />;
  }

  if (view.type === "GOOGLE_REVIEW") {
    // Straight to Google Maps — no EZTab page in between (spec
    // sections 1 and 8). redirect() throws internally, so nothing
    // below this line ever renders for a Google Review card.
    redirect(view.google_review_url);
  }

  const supabase = await createClient();
  const imageUrl = view.profile.profile_image_path
    ? getProfileImagePublicUrl(supabase, view.profile.profile_image_path)
    : null;

  return <PublicProfileRedesigned view={view} imageUrl={imageUrl} />;
}

async function InactiveCard() {
  const t = await getTranslations("publicProfile");
  return (
    <StatusScreen title={t("inactiveTitle")} message={t("inactiveMessage")} />
  );
}
