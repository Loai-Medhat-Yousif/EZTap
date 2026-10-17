"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock } from "lucide-react";
import type { CardDetail } from "@/lib/data/cards";
import type { ProfileEditActions } from "@/lib/cards/profile-edit-actions";
import {
  editUpdateProfileDetails,
  editUploadProfileImage,
  editRemoveProfileImage,
  editAddProfileLink,
  editUpdateProfileLink,
  editDeleteProfileLink,
  editSetProfileLinkActive,
  editMoveProfileLink,
  editSaveAndClose,
} from "@/app/edit/[token]/actions";
import { EditProfileForm } from "@/components/admin/edit-profile-form";
import { ProfileImageUpload } from "@/components/admin/profile-image-upload";
import { ProfileLinksManager } from "@/components/admin/profile-links-manager";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/hooks/use-countdown";

type EditProfileCard = Extract<CardDetail, { type: "PROFILE" }>;

const editActions: ProfileEditActions = {
  updateProfileDetails: editUpdateProfileDetails,
  uploadProfileImageAction: editUploadProfileImage,
  removeProfileImageAction: editRemoveProfileImage,
  addProfileLink: editAddProfileLink,
  updateProfileLink: editUpdateProfileLink,
  deleteProfileLink: editDeleteProfileLink,
  setProfileLinkActive: editSetProfileLinkActive,
  moveProfileLink: editMoveProfileLink,
};

export function CustomerEditView({
  token,
  card,
  expiresAt,
}: {
  token: string;
  card: EditProfileCard;
  expiresAt: string;
}) {
  const t = useTranslations("editLink");
  const tCards = useTranslations("cards");
  const tLinks = useTranslations("links");
  const [closed, setClosed] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, startClose] = useTransition();
  const remaining = useCountdown(expiresAt);

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
        <h1 className="text-xl font-semibold text-ink">{t("customerTitle")}</h1>
        <p className="text-sm text-muted">{t("customerSubtitle")}</p>
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink">
          <Clock className="h-3.5 w-3.5 text-muted" aria-hidden />
          {t("expiresIn", { time: remaining ?? "--:--" })}
        </p>
      </header>

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
