"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildVCard } from "@/lib/vcard/build-vcard";
import { trackCardEvent } from "@/lib/analytics/track-client";

export function SaveContactButton({
  cardId,
  fullName,
  jobTitle,
  phone,
  email,
  website,
}: {
  cardId: string;
  fullName: string;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  const t = useTranslations("publicProfile");

  function handleSave() {
    trackCardEvent(cardId, { type: "SAVE_CONTACT_CLICK" });

    const vcard = buildVCard({ fullName, jobTitle, phone, email, website });
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fullName || "contact"}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised transition-transform active:scale-95">
        <UserPlus className="h-4 w-4" aria-hidden />
      </span>
      {t("saveContact")}
    </button>
  );
}
