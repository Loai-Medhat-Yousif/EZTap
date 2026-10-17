"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  googleReviewDetailsSchema,
  type GoogleReviewDetailsInput,
} from "@/lib/validation/cards";
import { updateGoogleReviewUrl } from "@/app/admin/cards/actions";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function EditGoogleReviewForm({
  cardId,
  defaultValues,
}: {
  cardId: string;
  defaultValues: GoogleReviewDetailsInput;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<GoogleReviewDetailsInput>({
    resolver: zodResolver(googleReviewDetailsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await updateGoogleReviewUrl(cardId, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <GoogleMapsReviewHelper
        onGenerated={(url) =>
          form.setValue("googleReviewUrl", url, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      />

      <div>
        <Label htmlFor="googleReviewUrl">{t("googleReviewUrlLabel")}</Label>
        <Input
          id="googleReviewUrl"
          type="url"
          aria-invalid={!!form.formState.errors.googleReviewUrl}
          {...form.register("googleReviewUrl")}
        />
        <FieldError>{form.formState.errors.googleReviewUrl?.message}</FieldError>
      </div>
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
