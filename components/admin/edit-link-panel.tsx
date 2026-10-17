"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link2, XCircle } from "lucide-react";
import type { EditLinkState } from "@/lib/data/edit-links";
import {
  createCardEditLink,
  closeCardEditLink,
} from "@/app/admin/cards/actions";
import { useCountdown } from "@/lib/hooks/use-countdown";
import { CopyButton } from "@/components/admin/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/label";

export function EditLinkPanel({
  cardId,
  state,
}: {
  cardId: string;
  state: EditLinkState;
}) {
  const t = useTranslations("editLink");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = useCountdown(
    state.status === "active" ? state.expiresAt : null,
  );

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCardEditLink(cardId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUrl(result.url ?? null);
      toast.success(t("created"));
    });
  }

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closeCardEditLink(cardId);
      if (result?.error) {
        setError(result.error);
      } else {
        setUrl(null);
        toast.success(t("closed"));
      }
    });
  }

  const hasOpenLink = state.status === "pending" || state.status === "active";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("description")}</p>

      {url && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs font-medium text-ink">{t("shareNow")}</p>
          <div className="flex items-center gap-2">
            <Input readOnly value={url} className="font-mono text-xs" />
            <CopyButton
              value={url}
              label={t("copy")}
              copiedLabel={t("copied")}
            />
          </div>
        </div>
      )}

      {!url && state.status !== "none" && (
        <p className="text-sm text-ink">
          {state.status === "pending" && t("pending")}
          {state.status === "active" &&
            t("active", { time: remaining ?? "--:--" })}
          {state.status === "expired" && t("expired")}
        </p>
      )}

      <FieldError>{error}</FieldError>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCreate}
          disabled={isPending}
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          {hasOpenLink ? t("regenerate") : t("create")}
        </Button>

        {hasOpenLink && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            {t("closeNow")}
          </Button>
        )}
      </div>
    </div>
  );
}
