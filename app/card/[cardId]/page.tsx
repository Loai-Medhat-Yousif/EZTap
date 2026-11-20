import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { getPublicCardView } from "@/lib/data/public-card";
import { getPublicSiteFooter } from "@/lib/data/social-links";
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
import { StoreProfilePublic } from "@/components/profile/store-profile-public";
import { PaymentProfilePublic } from "@/components/profile/payment-profile-public";
import { MenuProfilePublic } from "@/components/profile/menu-profile-public";

type PageProps = {
  params: Promise<{ cardId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cardId } = await params;
  const view = isValidCardId(cardId) ? await getPublicCardView(cardId) : null;

  // Inactive, unknown, and every redirect card (Google Review, InstaPay,
  // Online Cash) are deliberately not indexable — spec section 21:
  // admin/non-profile pages must be noindex, and a redirect "card" is not
  // a page of ours at all.
  if (
    !view ||
    view.status !== "ACTIVE" ||
    (view.type !== "PROFILE" &&
      view.type !== "STORE_PROFILE" &&
      view.type !== "MULTIPLE_PAYMENT_METHODS" &&
      view.type !== "MENU")
  ) {
    return { title: "EZTab", robots: { index: false, follow: false } };
  }

  const supabase = await createClient();

  if (view.type === "MULTIPLE_PAYMENT_METHODS") {
    const { payment } = view;
    const title = payment.full_name;
    const description = payment.bio || `${payment.full_name} on EZTab.`;
    const canonical = getCardProfileUrl(view.card_id);
    const imageUrl = payment.payment_image_path
      ? getProfileImagePublicUrl(supabase, payment.payment_image_path)
      : undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | EZTab`,
        description,
        url: canonical,
        type: "website",
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

  if (view.type === "STORE_PROFILE") {
    const { store } = view;
    const title = [store.full_name, store.category].filter(Boolean).join(" | ");
    const description =
      store.bio || `${store.full_name} on EZTab.`;
    const canonical = getCardProfileUrl(view.card_id);
    const imageUrl = store.store_image_path
      ? getProfileImagePublicUrl(supabase, store.store_image_path)
      : undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | EZTab`,
        description,
        url: canonical,
        type: "website",
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

  if (view.type === "MENU") {
    const { menu } = view;
    const title = [menu.full_name, menu.category].filter(Boolean).join(" | ");
    const description = menu.bio || `${menu.full_name} on EZTab.`;
    const canonical = getCardProfileUrl(view.card_id);
    const imageUrl = menu.menu_image_path
      ? getProfileImagePublicUrl(supabase, menu.menu_image_path)
      : undefined;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title: `${title} | EZTab`,
        description,
        url: canonical,
        type: "website",
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

  const { profile } = view;
  const title = [profile.full_name, profile.job_title].filter(Boolean).join(" | ");
  const description =
    profile.bio || `${profile.full_name}'s digital business card, powered by EZTab.`;
  const canonical = getCardProfileUrl(view.card_id);

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

  // Every "scan -> redirect" card (Google Review, InstaPay, Online Cash)
  // goes straight to its target — no EZTab page in between (spec
  // sections 1 and 8). The VIEW above is still counted, so payment-card
  // scans show up in analytics even though no page renders. redirect()
  // throws internally, so nothing below this line runs for these types.
  // Compared against each literal rather than via isRedirectCardType so
  // TypeScript narrows the union down to the page-rendering members below.
  if (
    view.type === "GOOGLE_REVIEW" ||
    view.type === "INSTAPAY" ||
    view.type === "ONLINE_CASH"
  ) {
    redirect(view.target_url);
  }

  const footer = await getPublicSiteFooter();
  const supabase = await createClient();

  if (view.type === "MULTIPLE_PAYMENT_METHODS") {
    const imageUrl = view.payment.payment_image_path
      ? getProfileImagePublicUrl(supabase, view.payment.payment_image_path)
      : null;

    return (
      <PaymentProfilePublic view={view} imageUrl={imageUrl} footer={footer} />
    );
  }

  if (view.type === "STORE_PROFILE") {
    const imageUrl = view.store.store_image_path
      ? getProfileImagePublicUrl(supabase, view.store.store_image_path)
      : null;

    return (
      <StoreProfilePublic view={view} imageUrl={imageUrl} footer={footer} />
    );
  }

  if (view.type === "MENU") {
    const imageUrl = view.menu.menu_image_path
      ? getProfileImagePublicUrl(supabase, view.menu.menu_image_path)
      : null;
    const categories = view.categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({
        ...item,
        imageUrl: item.image_path
          ? getProfileImagePublicUrl(supabase, item.image_path)
          : null,
      })),
    }));
    const offers = view.offers.map((offer) => ({
      ...offer,
      imageUrl: offer.image_path
        ? getProfileImagePublicUrl(supabase, offer.image_path)
        : null,
    }));

    return (
      <MenuProfilePublic
        view={view}
        imageUrl={imageUrl}
        footer={footer}
        categories={categories}
        offers={offers}
      />
    );
  }

  if (view.type === "PROFILE") {
    const imageUrl = view.profile.profile_image_path
      ? getProfileImagePublicUrl(supabase, view.profile.profile_image_path)
      : null;

    return (
      <PublicProfileRedesigned view={view} imageUrl={imageUrl} footer={footer} />
    );
  }

  // Unreachable in practice — every ACTIVE card type is handled above —
  // but explicit so a future card type can't silently render a blank page.
  notFound();
}

async function InactiveCard() {
  const t = await getTranslations("publicProfile");
  return (
    <StatusScreen title={t("inactiveTitle")} message={t("inactiveMessage")} />
  );
}
