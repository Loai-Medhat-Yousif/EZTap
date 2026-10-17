"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { generateReviewLinkAction } from "@/app/admin/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

/**
 * Paste a Google Maps link → get the direct "write a review" URL. The
 * conversion happens server-side (lib/google/review-link.ts); this just
 * collects the input and hands the result back to the parent form, which
 * fills its own URL field with it.
 */
export function GoogleMapsReviewHelper({
  onGenerated,
}: {
  onGenerated: (url: string) => void;
}) {
  const t = useTranslations("tools");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateReviewLinkAction(mapsUrl);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        onGenerated(result.url);
        toast.success(t("generated"));
      }
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <Label htmlFor="mapsUrl">{t("mapsUrlLabel")}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="mapsUrl"
          value={mapsUrl}
          onChange={(event) => setMapsUrl(event.target.value)}
          placeholder={t("mapsUrlPlaceholder")}
          inputMode="url"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={isPending || mapsUrl.trim().length === 0}
          className="sm:w-auto"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {isPending ? t("generating") : t("generate")}
        </Button>
      </div>
      <p className="text-xs text-muted">{t("mapsHint")}</p>
      <FieldError>{error}</FieldError>
    </div>
  );
}
