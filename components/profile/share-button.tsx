"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { trackCardEvent } from "@/lib/analytics/track-client";

export function ShareButton({
  cardId,
  url,
  title,
}: {
  cardId: string;
  url: string;
  title: string;
}) {
  const t = useTranslations("publicProfile");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    trackCardEvent(cardId, { type: "SHARE_CLICK" });

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Either the user cancelled the native share sheet, or it
        // failed silently — either way, nagging with a copy-link
        // fallback here would be the wrong call.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex flex-col items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised transition-transform active:scale-95">
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden />
        )}
      </span>
      {t("share")}
    </button>
  );
}
