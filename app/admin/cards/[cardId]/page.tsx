import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Wallet } from "lucide-react";
import { getCardDetail } from "@/lib/data/cards";
import { getActiveEditLinkState } from "@/lib/data/edit-links";
import { getCardDestinationUrl } from "@/lib/cards/urls";
import { isDateRangeKey, type DateRangeKey } from "@/lib/analytics/date-range";
import * as adminActions from "@/app/admin/cards/actions";
import type {
  MenuEditActions,
  PaymentEditActions,
  StoreEditActions,
} from "@/lib/cards/profile-edit-actions";
import { CARD_TYPE_LABEL_KEY } from "@/lib/cards/type-labels";
import {
  isMenuPrintTemplateKind,
  type MenuPrintTemplateKind,
} from "@/lib/print/template";
import type { RedirectCardType } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { getProfileImagePublicUrl } from "@/lib/storage/profile-images";
import { Badge } from "@/components/ui/badge";
import { CardStatusToggle } from "@/components/admin/card-status-toggle";
import { QrPanel } from "@/components/admin/qr-panel";
import { EditProfileForm } from "@/components/admin/edit-profile-form";
import { EditStoreForm } from "@/components/admin/edit-store-form";
import { EditPaymentForm } from "@/components/admin/edit-payment-form";
import { EditMenuForm } from "@/components/admin/edit-menu-form";
import { EditTargetUrlForm } from "@/components/admin/edit-target-url-form";
import { ProfileImageUpload } from "@/components/admin/profile-image-upload";
import { ProfileLinksManager } from "@/components/admin/profile-links-manager";
import { MenuManager } from "@/components/admin/menu-manager";
import { ProfileCardPreview } from "@/components/profile/profile-card-preview";
import { StoreCardPreview } from "@/components/profile/store-card-preview";
import { PaymentCardPreview } from "@/components/profile/payment-card-preview";
import { MenuCardPreview } from "@/components/profile/menu-card-preview";
import { CardAnalyticsPanel } from "@/components/admin/card-analytics-panel";
import { CardSaleForm } from "@/components/admin/card-sale-form";
import { EditLinkPanel } from "@/components/admin/edit-link-panel";
import { CardThemePicker } from "@/components/admin/card-theme-picker";
import { PrintCardButton } from "@/components/admin/print-card-button";
import { MenuPrintTemplatePicker } from "@/components/admin/menu-print-template-picker";

export const metadata = {
  robots: { index: false, follow: false },
};

const TARGET_LABEL_KEY: Record<RedirectCardType, string> = {
  GOOGLE_REVIEW: "googleReviewUrlLabel",
  INSTAPAY: "instapayUrlLabel",
  ONLINE_CASH: "onlineCashUrlLabel",
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

  const isPageCard =
    card.type === "PROFILE" ||
    card.type === "STORE_PROFILE" ||
    card.type === "MULTIPLE_PAYMENT_METHODS" ||
    card.type === "MENU";

  const editLinkState = isPageCard
    ? await getActiveEditLinkState(card.id)
    : null;

  // The card's stable, printable URL — what its QR/NFC encodes. It is
  // independent of the current target, so it never changes once a card
  // is printed (see lib/cards/urls.ts).
  const destinationUrl = getCardDestinationUrl(card);
  const menuPrintTemplate: MenuPrintTemplateKind =
    card.type === "MENU" &&
    card.menu &&
    isMenuPrintTemplateKind(card.menu.print_template_kind)
      ? card.menu.print_template_kind
      : "menu";

  // The shared editor components call methods on this bundle; for a store
  // those methods point at the store mutations. Referencing the server
  // actions here keeps the store UI running on the exact same
  // components as a profile.
  const storeActions: StoreEditActions = {
    updateStoreDetails: adminActions.updateStoreDetails,
    uploadProfileImageAction: adminActions.uploadStoreImageAction,
    removeProfileImageAction: adminActions.removeStoreImageAction,
    addProfileLink: adminActions.addStoreLink,
    updateProfileLink: adminActions.updateStoreLink,
    deleteProfileLink: adminActions.deleteStoreLink,
    setProfileLinkActive: adminActions.setStoreLinkActive,
    reorderProfileLinks: adminActions.reorderStoreLinks,
  };

  const paymentActions: PaymentEditActions = {
    updatePaymentDetails: adminActions.updatePaymentDetails,
    uploadProfileImageAction: adminActions.uploadPaymentImageAction,
    removeProfileImageAction: adminActions.removePaymentImageAction,
    addProfileLink: adminActions.addPaymentLink,
    updateProfileLink: adminActions.updatePaymentLink,
    deleteProfileLink: adminActions.deletePaymentLink,
    setProfileLinkActive: adminActions.setPaymentLinkActive,
    reorderProfileLinks: adminActions.reorderPaymentLinks,
  };

  const menuActions: MenuEditActions = {
    updateMenuDetails: adminActions.updateMenuDetails,
    uploadProfileImageAction: adminActions.uploadMenuImageAction,
    removeProfileImageAction: adminActions.removeMenuImageAction,
    addMenuCategory: adminActions.addMenuCategory,
    updateMenuCategory: adminActions.updateMenuCategory,
    deleteMenuCategory: adminActions.deleteMenuCategory,
    reorderMenuCategories: adminActions.reorderMenuCategories,
    addMenuItem: adminActions.addMenuItem,
    updateMenuItem: adminActions.updateMenuItem,
    deleteMenuItem: adminActions.deleteMenuItem,
    reorderMenuItems: adminActions.reorderMenuItems,
    uploadMenuItemImage: adminActions.uploadMenuItemImageAction,
    removeMenuItemImage: adminActions.removeMenuItemImageAction,
    addMenuOffer: adminActions.addMenuOffer,
    updateMenuOffer: adminActions.updateMenuOffer,
    deleteMenuOffer: adminActions.deleteMenuOffer,
    reorderMenuOffers: adminActions.reorderMenuOffers,
    uploadMenuOfferImage: adminActions.uploadMenuOfferImageAction,
    removeMenuOfferImage: adminActions.removeMenuOfferImageAction,
  };

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
          <Badge tone="primary">{t(CARD_TYPE_LABEL_KEY[card.type])}</Badge>
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
                <ProfileLinksManager scope={card.card_id} links={card.links} />
              </section>
            </>
          ) : card.type === "STORE_PROFILE" ? (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("logoTitle")}
                </h2>
                <ProfileImageUpload
                  scope={card.card_id}
                  imageUrl={card.storeImageUrl}
                  actions={storeActions}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <EditStoreForm
                  scope={card.card_id}
                  actions={storeActions}
                  defaultValues={{
                    fullName: card.store?.full_name ?? "",
                    category: card.store?.category ?? undefined,
                    bio: card.store?.bio ?? undefined,
                    phone: card.store?.phone ?? undefined,
                    whatsapp: card.store?.whatsapp ?? undefined,
                    email: card.store?.email ?? undefined,
                    website: card.store?.website ?? undefined,
                    googleMapsUrl: card.store?.google_maps_url ?? undefined,
                    address: card.store?.address ?? undefined,
                    openingHours: card.store?.opening_hours ?? undefined,
                    googleReviewUrl: card.store?.google_review_url ?? undefined,
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
                  actions={storeActions}
                />
              </section>
            </>
          ) : card.type === "MULTIPLE_PAYMENT_METHODS" ? (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("paymentLogo")}
                </h2>
                <ProfileImageUpload
                  scope={card.card_id}
                  imageUrl={card.paymentImageUrl}
                  actions={paymentActions}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <EditPaymentForm
                  scope={card.card_id}
                  actions={paymentActions}
                  defaultValues={{
                    fullName: card.payment?.full_name ?? "",
                    bio: card.payment?.bio ?? undefined,
                  }}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("paymentLinksTitle")}
                </h2>
                <ProfileLinksManager
                  scope={card.card_id}
                  links={card.links}
                  actions={paymentActions}
                />
              </section>
            </>
          ) : card.type === "MENU" ? (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("menuImageTitle", { default: tLinks("logoTitle") })}
                </h2>
                <ProfileImageUpload
                  scope={card.card_id}
                  imageUrl={card.menuImageUrl}
                  actions={menuActions}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <EditMenuForm
                  scope={card.card_id}
                  actions={menuActions}
                  defaultValues={{
                    fullName: card.menu?.full_name ?? "",
                    category: card.menu?.category ?? undefined,
                    bio: card.menu?.bio ?? undefined,
                    phone: card.menu?.phone ?? undefined,
                    whatsapp: card.menu?.whatsapp ?? undefined,
                    email: card.menu?.email ?? undefined,
                    website: card.menu?.website ?? undefined,
                    googleMapsUrl: card.menu?.google_maps_url ?? undefined,
                    address: card.menu?.address ?? undefined,
                    openingHours: card.menu?.opening_hours ?? undefined,
                    googleReviewUrl: card.menu?.google_review_url ?? undefined,
                  }}
                />
              </section>

              <section className="rounded-2xl border border-border bg-surface-raised p-6">
                <h2 className="mb-4 text-sm font-semibold text-ink">
                  {tLinks("menuContentTitle", { default: "Menu & offers" })}
                </h2>
                {await (async () => {
                  const supabase = await createClient();
                  const categories = card.categories.map((cat) => ({
                    ...cat,
                    items: cat.items.map((item) => ({
                      ...item,
                      imageUrl: item.image_path
                        ? getProfileImagePublicUrl(supabase, item.image_path)
                        : null,
                    })),
                  }));
                  const offers = card.offers.map((offer) => ({
                    ...offer,
                    imageUrl: offer.image_path
                      ? getProfileImagePublicUrl(supabase, offer.image_path)
                      : null,
                  }));
                  return (
                    <MenuManager
                      scope={card.card_id}
                      categories={categories}
                      offers={offers}
                      actions={menuActions}
                    />
                  );
                })()}
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-border bg-surface-raised p-6">
              <EditTargetUrlForm
                cardId={card.card_id}
                showReviewHelper={card.type === "GOOGLE_REVIEW"}
                labelKey={TARGET_LABEL_KEY[card.type]}
                defaultValues={{ targetUrl: card.target_url }}
              />
            </section>
          )}
        </div>

        <div className="space-y-6">
          {isPageCard && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">
                {tLinks("themeTitle")}
              </h2>
              <CardThemePicker scope={card.card_id} value={card.theme} />
            </section>
          )}

          <QrPanel cardId={card.card_id} destinationUrl={destinationUrl} />

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              {t("printTitle")}
            </h2>
            <PrintCardButton cardId={card.card_id} />
            <p className="mt-2 text-xs text-muted">{t("printHint")}</p>
            {card.type === "MENU" && (
              <div className="mt-4 border-t border-border pt-4">
                <MenuPrintTemplatePicker
                  cardId={card.card_id}
                  value={menuPrintTemplate}
                />
              </div>
            )}
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

          {isPageCard && editLinkState && (
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
                  theme: card.theme,
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

          {card.type === "STORE_PROFILE" && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">
                {tLinks("previewTitle")}
              </h2>
              <StoreCardPreview
                data={{
                  theme: card.theme,
                  fullName: card.store?.full_name ?? "",
                  category: card.store?.category,
                  bio: card.store?.bio,
                  phone: card.store?.phone,
                  whatsapp: card.store?.whatsapp,
                  email: card.store?.email,
                  website: card.store?.website,
                  googleMapsUrl: card.store?.google_maps_url,
                  address: card.store?.address,
                  openingHours: card.store?.opening_hours,
                  googleReviewUrl: card.store?.google_review_url,
                  imageUrl: card.storeImageUrl,
                  links: card.links,
                }}
              />
            </section>
          )}

          {card.type === "MULTIPLE_PAYMENT_METHODS" && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">
                {tLinks("previewTitle")}
              </h2>
              <PaymentCardPreview
                data={{
                  theme: card.theme,
                  fullName: card.payment?.full_name ?? "",
                  bio: card.payment?.bio ?? null,
                  imageUrl: card.paymentImageUrl,
                  links: card.links,
                }}
              />
            </section>
          )}

          {card.type === "MENU" && (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">
                {tLinks("previewTitle")}
              </h2>
              <MenuCardPreview
                data={{
                  theme: card.theme,
                  fullName: card.menu?.full_name ?? "",
                  category: card.menu?.category ?? null,
                  bio: card.menu?.bio ?? null,
                  phone: card.menu?.phone ?? null,
                  whatsapp: card.menu?.whatsapp ?? null,
                  email: card.menu?.email ?? null,
                  website: card.menu?.website ?? null,
                  googleMapsUrl: card.menu?.google_maps_url ?? null,
                  address: card.menu?.address ?? null,
                  openingHours: card.menu?.opening_hours ?? null,
                  googleReviewUrl: card.menu?.google_review_url ?? null,
                  imageUrl: card.menuImageUrl,
                  categories: card.categories,
                  offers: card.offers,
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
