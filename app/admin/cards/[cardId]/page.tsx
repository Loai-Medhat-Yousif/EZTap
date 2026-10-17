import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Wallet } from "lucide-react";
import { getCardDetail } from "@/lib/data/cards";
import { getActiveEditLinkState } from "@/lib/data/edit-links";
import { getCardDestinationUrl } from "@/lib/cards/urls";
import { isDateRangeKey, type DateRangeKey } from "@/lib/analytics/date-range";
import { Badge } from "@/components/ui/badge";
import { CardStatusToggle } from "@/components/admin/card-status-toggle";
import { QrPanel } from "@/components/admin/qr-panel";
import { EditProfileForm } from "@/components/admin/edit-profile-form";
import { EditGoogleReviewForm } from "@/components/admin/edit-google-review-form";
import { ProfileImageUpload } from "@/components/admin/profile-image-upload";
import { ProfileLinksManager } from "@/components/admin/profile-links-manager";
import { ProfileCardPreview } from "@/components/profile/profile-card-preview";
import { CardAnalyticsPanel } from "@/components/admin/card-analytics-panel";
import { CardSaleForm } from "@/components/admin/card-sale-form";
import { EditLinkPanel } from "@/components/admin/edit-link-panel";
import { PrintCardButton } from "@/components/admin/print-card-button";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { cardId } = await params;
  const rawSearchParams = await searchParams;
  const rawRange =
    typeof rawSearchParams.range === "string" ? rawSearchParams.range : "7d";
  const range: DateRangeKey = isDateRangeKey(rawRange) ? rawRange : "7d";

  const [t, tLinks, card] = await Promise.all([
    getTranslations("cards"),
    getTranslations("links"),
    getCardDetail(cardId),
  ]);

  if (!card) notFound();

  const editLinkState =
    card.type === "PROFILE" ? await getActiveEditLinkState(card.id) : null;

  // The card's stable, printable URL — what its QR/NFC encodes. It is
  // independent of the current target, so it never changes once a card
  // is printed (see lib/cards/urls.ts).
  const destinationUrl = getCardDestinationUrl(card);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/cards"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToCards")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink">
            {card.card_id}
          </h1>
          <Badge tone="primary">
            {card.type === "PROFILE" ? t("typeProfile") : t("typeGoogleReview")}
          </Badge>
          <Badge tone={card.status === "ACTIVE" ? "success" : "muted"}>
            {card.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
          </Badge>
        </div>
        <CardStatusToggle cardId={card.card_id} status={card.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {card.type === "PROFILE" ? (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("photoTitle")}
                </h2>
                <ProfileImageUpload
                  scope={card.card_id}
                  imageUrl={card.profileImageUrl}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <EditProfileForm
                  scope={card.card_id}
                  defaultValues={{
                    fullName: card.profile?.full_name ?? "",
                    jobTitle: card.profile?.job_title ?? undefined,
                    bio: card.profile?.bio ?? undefined,
                    phone: card.profile?.phone ?? undefined,
                    whatsapp: card.profile?.whatsapp ?? undefined,
                    email: card.profile?.email ?? undefined,
                    website: card.profile?.website ?? undefined,
                    googleMapsUrl: card.profile?.google_maps_url ?? undefined,
                  }}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("title")}
                </h2>
                <ProfileLinksManager
                  scope={card.card_id}
                  links={card.links}
                />
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-border bg-surface-raised p-6">
              <EditGoogleReviewForm
                cardId={card.card_id}
                defaultValues={{ googleReviewUrl: card.google_review_url }}
              />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <QrPanel cardId={card.card_id} destinationUrl={destinationUrl} />

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              {t("printTitle")}
            </h2>
            <PrintCardButton cardId={card.card_id} />
            <p className="mt-2 text-xs text-muted">{t("printHint")}</p>
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              <Wallet className="h-4 w-4" aria-hidden />
              {t("saleTitle")}
            </h2>
            <CardSaleForm
              cardId={card.card_id}
              priceEgp={card.price_egp}
              soldAt={card.sold_at}
            />
          </section>

          {card.type === "PROFILE" && editLinkState && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
                {t("editLinkTitle")}
              </h2>
              <EditLinkPanel cardId={card.card_id} state={editLinkState} />
            </section>
          )}

          {card.type === "PROFILE" && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">
                {tLinks("previewTitle")}
              </h2>
              <ProfileCardPreview
                data={{
                  fullName: card.profile?.full_name ?? "",
                  jobTitle: card.profile?.job_title,
                  bio: card.profile?.bio,
                  phone: card.profile?.phone,
                  whatsapp: card.profile?.whatsapp,
                  email: card.profile?.email,
                  website: card.profile?.website,
                  googleMapsUrl: card.profile?.google_maps_url,
                  imageUrl: card.profileImageUrl,
                  links: card.links,
                }}
              />
            </section>
          )}
        </div>
      </div>

      <CardAnalyticsPanel cardId={card.card_id} range={range} />
    </div>
  );
}
