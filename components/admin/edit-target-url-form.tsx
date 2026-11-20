"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { targetUrlSchema, type TargetUrlInput } from "@/lib/validation/cards";
import { updateTargetUrl } from "@/app/admin/cards/actions";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

/**
 * The single link editor for every "scan -> redirect" card type. A
 * Google Review card also gets the Maps → writereview helper; the
 * payment cards (InstaPay / Online Cash) just take the link as typed.
 */
export function EditTargetUrlForm({
  cardId,
  defaultValues,
  showReviewHelper = false,
  labelKey = "targetUrlLabel",
}: {
  cardId: string;
  defaultValues: TargetUrlInput;
  showReviewHelper?: boolean;
  labelKey?: string;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<TargetUrlInput>({
    resolver: zodResolver(targetUrlSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await updateTargetUrl(cardId, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {showReviewHelper && (
        <GoogleMapsReviewHelper
          onGenerated={(url) =>
            form.setValue("targetUrl", url, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      )}

      <div>
        <Label htmlFor="targetUrl">{t(labelKey)}</Label>
        <Input
          id="targetUrl"
          type="url"
          placeholder="https://"
          aria-invalid={!!form.formState.errors.targetUrl}
          {...form.register("targetUrl")}
        />
        <FieldError>{form.formState.errors.targetUrl?.message}</FieldError>
      </div>
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
