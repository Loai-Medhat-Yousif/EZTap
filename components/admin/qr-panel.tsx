import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { buttonVariants } from "@/components/ui/button";

export async function QrPanel({
  cardId,
  destinationUrl,
}: {
  cardId: string;
  destinationUrl: string;
}) {
  const t = await getTranslations("cards");
  const qrSrc = `/api/admin/cards/${cardId}/qr`;

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink">{t("qrTitle")}</h2>

      <div className="flex flex-col items-center gap-4">
        <div className="rounded-xl border border-border bg-[#15171F] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Server-rendered SVG endpoint, not a static asset —
              next/image can't optimize this, and doesn't need to. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="" width={200} height={200} className="h-48 w-48" />
        </div>
        <a
          href={`${qrSrc}?download=1`}
          download
          className={buttonVariants({ size: "sm" })}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t("downloadQr")}
        </a>
      </div>

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <p className="truncate font-mono text-xs text-muted" title={destinationUrl}>
          {destinationUrl}
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={destinationUrl}
            label={t("copyDestinationUrl")}
            copiedLabel={t("copied")}
          />
          <CopyButton
            value={destinationUrl}
            label={t("copyNfcUrl")}
            copiedLabel={t("copied")}
          />
        </div>
      </div>
    </div>
  );
}
