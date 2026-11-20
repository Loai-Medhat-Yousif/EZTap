"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock } from "lucide-react";
import type { CardDetail } from "@/lib/data/cards";
import type {
  CardThemeEditActions,
  MenuEditActions,
  PaymentEditActions,
  ProfileEditActions,
  StoreEditActions,
} from "@/lib/cards/profile-edit-actions";
import {
  editUpdateProfileDetails,
  editUploadProfileImage,
  editRemoveProfileImage,
  editAddProfileLink,
  editUpdateProfileLink,
  editDeleteProfileLink,
  editSetProfileLinkActive,
  editReorderProfileLinks,
  editUpdateStoreDetails,
  editUploadStoreImage,
  editRemoveStoreImage,
  editAddStoreLink,
  editUpdateStoreLink,
  editDeleteStoreLink,
  editSetStoreLinkActive,
  editReorderStoreLinks,
  editUpdatePaymentDetails,
  editUploadPaymentImage,
  editRemovePaymentImage,
  editAddPaymentLink,
  editUpdatePaymentLink,
  editDeletePaymentLink,
  editSetPaymentLinkActive,
  editReorderPaymentLinks,
  editUpdateMenuDetails,
  editUploadMenuImage,
  editRemoveMenuImage,
  editAddMenuCategory,
  editUpdateMenuCategory,
  editDeleteMenuCategory,
  editReorderMenuCategories,
  editAddMenuItem,
  editUpdateMenuItem,
  editDeleteMenuItem,
  editReorderMenuItems,
  editUploadMenuItemImage,
  editRemoveMenuItemImage,
  editAddMenuOffer,
  editUpdateMenuOffer,
  editDeleteMenuOffer,
  editReorderMenuOffers,
  editUploadMenuOfferImage,
  editRemoveMenuOfferImage,
  editUpdateCardTheme,
  editSaveAndClose,
} from "@/app/edit/[token]/actions";
import { EditProfileForm } from "@/components/admin/edit-profile-form";
import { EditStoreForm } from "@/components/admin/edit-store-form";
import { EditPaymentForm } from "@/components/admin/edit-payment-form";
import { EditMenuForm } from "@/components/admin/edit-menu-form";
import { MenuManager } from "@/components/admin/menu-manager";
import { ProfileImageUpload } from "@/components/admin/profile-image-upload";
import { ProfileLinksManager } from "@/components/admin/profile-links-manager";
import { CardThemePicker } from "@/components/admin/card-theme-picker";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { publicProfileImageUrl } from "@/lib/storage/profile-image-url";

type EditCard = Extract<
  CardDetail,
  { type: "PROFILE" | "STORE_PROFILE" | "MULTIPLE_PAYMENT_METHODS" | "MENU" }
>;

const editActions: ProfileEditActions = {
  updateProfileDetails: editUpdateProfileDetails,
  uploadProfileImageAction: editUploadProfileImage,
  removeProfileImageAction: editRemoveProfileImage,
  addProfileLink: editAddProfileLink,
  updateProfileLink: editUpdateProfileLink,
  deleteProfileLink: editDeleteProfileLink,
  setProfileLinkActive: editSetProfileLinkActive,
  reorderProfileLinks: editReorderProfileLinks,
};

const storeEditActions: StoreEditActions = {
  updateStoreDetails: editUpdateStoreDetails,
  uploadProfileImageAction: editUploadStoreImage,
  removeProfileImageAction: editRemoveStoreImage,
  addProfileLink: editAddStoreLink,
  updateProfileLink: editUpdateStoreLink,
  deleteProfileLink: editDeleteStoreLink,
  setProfileLinkActive: editSetStoreLinkActive,
  reorderProfileLinks: editReorderStoreLinks,
};

const paymentEditActions: PaymentEditActions = {
  updatePaymentDetails: editUpdatePaymentDetails,
  uploadProfileImageAction: editUploadPaymentImage,
  removeProfileImageAction: editRemovePaymentImage,
  addProfileLink: editAddPaymentLink,
  updateProfileLink: editUpdatePaymentLink,
  deleteProfileLink: editDeletePaymentLink,
  setProfileLinkActive: editSetPaymentLinkActive,
  reorderProfileLinks: editReorderPaymentLinks,
};

const menuEditActions: MenuEditActions = {
  updateMenuDetails: editUpdateMenuDetails,
  uploadProfileImageAction: editUploadMenuImage,
  removeProfileImageAction: editRemoveMenuImage,
  addMenuCategory: editAddMenuCategory,
  updateMenuCategory: editUpdateMenuCategory,
  deleteMenuCategory: editDeleteMenuCategory,
  reorderMenuCategories: editReorderMenuCategories,
  addMenuItem: editAddMenuItem,
  updateMenuItem: editUpdateMenuItem,
  deleteMenuItem: editDeleteMenuItem,
  reorderMenuItems: editReorderMenuItems,
  uploadMenuItemImage: editUploadMenuItemImage,
  removeMenuItemImage: editRemoveMenuItemImage,
  addMenuOffer: editAddMenuOffer,
  updateMenuOffer: editUpdateMenuOffer,
  deleteMenuOffer: editDeleteMenuOffer,
  reorderMenuOffers: editReorderMenuOffers,
  uploadMenuOfferImage: editUploadMenuOfferImage,
  removeMenuOfferImage: editRemoveMenuOfferImage,
};

const themeEditActions: CardThemeEditActions = {
  updateCardTheme: editUpdateCardTheme,
};

export function CustomerEditView({
  token,
  card,
  expiresAt,
}: {
  token: string;
  card: EditCard;
  expiresAt?: string | null;
}) {
  const t = useTranslations("editLink");
  const tCards = useTranslations("cards");
  const tLinks = useTranslations("links");
  const [closed, setClosed] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, startClose] = useTransition();
  const remaining = useCountdown(expiresAt ?? null);

  function handleSaveAndClose() {
    setCloseError(null);
    startClose(async () => {
      const result = await editSaveAndClose(token);
      if (result?.error) {
        setCloseError(result.error);
      } else {
        setClosed(true);
      }
    });
  }

  if (closed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
        <h1 className="text-xl font-semibold text-ink">{t("closedTitle")}</h1>
        <p className="text-sm text-muted">{t("closedMessage")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-ink">
          {card.type === "MULTIPLE_PAYMENT_METHODS"
            ? t("customerTitlePayment")
            : card.type === "MENU"
              ? t("customerTitleMenu", { default: t("customerTitle") })
              : t("customerTitle")}
        </h1>
        <p className="text-sm text-muted">{t("customerSubtitle")}</p>
        {expiresAt && (
          <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink">
            <Clock className="h-3.5 w-3.5 text-muted" aria-hidden />
            {t("expiresIn", { time: remaining ?? "--:--" })}
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink">
          {tLinks("themeTitle")}
        </h2>
        <CardThemePicker
          scope={token}
          value={card.theme}
          actions={themeEditActions}
        />
      </section>

      {card.type === "PROFILE" ? (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("photoTitle")}
            </h2>
            <ProfileImageUpload
              scope={token}
              imageUrl={card.profileImageUrl}
              actions={editActions}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <EditProfileForm
              scope={token}
              actions={editActions}
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

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("title")}
            </h2>
            <ProfileLinksManager
              scope={token}
              links={card.links}
              actions={editActions}
            />
          </section>
        </>
      ) : card.type === "STORE_PROFILE" ? (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("logoTitle")}
            </h2>
            <ProfileImageUpload
              scope={token}
              imageUrl={card.storeImageUrl}
              actions={storeEditActions}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <EditStoreForm
              scope={token}
              actions={storeEditActions}
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

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("title")}
            </h2>
            <ProfileLinksManager
              scope={token}
              links={card.links}
              actions={storeEditActions}
            />
          </section>
        </>
      ) : card.type === "MULTIPLE_PAYMENT_METHODS" ? (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("paymentLogo")}
            </h2>
            <ProfileImageUpload
              scope={token}
              imageUrl={card.paymentImageUrl}
              actions={paymentEditActions}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <EditPaymentForm
              scope={token}
              actions={paymentEditActions}
              defaultValues={{
                fullName: card.payment?.full_name ?? "",
                bio: card.payment?.bio ?? undefined,
              }}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("paymentLinksTitle")}
            </h2>
            <ProfileLinksManager
              scope={token}
              links={card.links}
              actions={paymentEditActions}
            />
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("menuImageTitle", { default: tLinks("logoTitle") })}
            </h2>
            <ProfileImageUpload
              scope={token}
              imageUrl={card.menuImageUrl}
              actions={menuEditActions}
            />
          </section>

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <EditMenuForm
              scope={token}
              actions={menuEditActions}
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

          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">
              {tLinks("menuContentTitle", { default: "Menu & offers" })}
            </h2>
            <MenuManager
              scope={token}
              categories={card.categories.map((cat) => ({
                ...cat,
                items: cat.items.map((item) => ({
                  ...item,
                  imageUrl: item.image_path ? publicProfileImageUrl(item.image_path) : null,
                })),
              }))}
              offers={card.offers.map((offer) => ({
                ...offer,
                imageUrl: offer.image_path ? publicProfileImageUrl(offer.image_path) : null,
              }))}
              actions={menuEditActions}
            />
          </section>
        </>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleSaveAndClose}
          disabled={isClosing}
          className="w-full"
        >
          {isClosing ? tCards("saving") : t("saveAndClose")}
        </Button>
        <p className="text-xs text-muted">{t("saveAndCloseHint")}</p>
        {closeError && <p className="text-sm text-danger">{closeError}</p>}
      </div>
    </div>
  );
}
