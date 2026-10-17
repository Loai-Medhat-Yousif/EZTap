"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { CopyButton } from "@/components/admin/copy-button";
import { Input } from "@/components/ui/input";

export function GoogleReviewTool() {
  const t = useTranslations("tools");
  const [url, setUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <GoogleMapsReviewHelper onGenerated={setUrl} />

      {url && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">{t("resultLabel")}</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <CopyButton
              value={url}
              label={t("copy")}
              copiedLabel={t("copied")}
            />
          </div>
          <p className="text-xs text-muted">{t("resultHint")}</p>
        </div>
      )}
    </div>
  );
}
