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
import { cn } from "@/lib/utils";
import { type EditDuration, EDIT_DURATIONS } from "@/types";

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
  const [duration, setDuration] = useState<EditDuration>("forever");
  const [isPending, startTransition] = useTransition();

  const remaining = useCountdown(
    state.status === "active" ? state.expiresAt : null,
  );

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCardEditLink(cardId, duration);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setUrl(result.url ?? null);
      toast.success(t("created"));
      // The edit panel stays open for all durations — like a plain "save" button.
      // We do NOT auto-close the panel, so the user can continue working.
    });
  }

  function handleClose() {
    setError(null);
    startTransition(async () => {
      // For "forever" duration, keep the link alive — just hide the panel.
      // For other durations, close the link as before.
      if (duration === "forever") {
        setUrl(null);
        toast.success(t("closed"));
        return;
      }
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

      {/* Duration selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-ink">
          {t("durationLabel")}
        </label>
        <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-surface p-1">
          {EDIT_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "rounded-lg py-1.5 text-xs font-medium transition-colors",
                duration === d
                  ? "bg-primary text-primary-ink shadow-sm"
                  : "text-muted hover:text-ink hover:bg-surface-raised",
              )}
            >
              {d === "forever" && t("durationForever")}
              {d === "1d" && t("duration1d")}
              {d === "1h" && t("duration1h")}
              {d === "30m" && t("duration30m")}
            </button>
          ))}
        </div>
      </div>

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
            (state.expiresAt
              ? t("active", { time: remaining ?? "--:--" })
              : t("activeForever"))}
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
          {hasOpenLink ? t("regenerate") : t(duration === "forever" ? "save" : "saveAndClose")}
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