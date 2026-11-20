"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { WhatsappLinkMaker } from "@/components/admin/whatsapp-link-maker";
import { CopyButton } from "@/components/admin/copy-button";
import { Input } from "@/components/ui/input";

/** Tools-page wrapper: generate a wa.me link and copy it. */
export function WhatsappLinkTool() {
  const t = useTranslations("tools");
  const [url, setUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <WhatsappLinkMaker onGenerated={setUrl} inputId="whatsappToolNumber" />

      {url && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">{t("whatsappResultLabel")}</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="font-mono text-xs" dir="ltr" />
            <CopyButton
              value={url}
              label={t("copy")}
              copiedLabel={t("copied")}
            />
          </div>
          <p className="text-xs text-muted">{t("whatsappResultHint")}</p>
        </div>
      )}
    </div>
  );
}
