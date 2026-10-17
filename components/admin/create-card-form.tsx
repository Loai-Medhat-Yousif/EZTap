"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { RefreshCw, CreditCard, Star } from "lucide-react";
import {
  profileDetailsSchema,
  googleReviewDetailsSchema,
  type ProfileDetailsInput,
  type ProfileDetailsFormInput,
  type GoogleReviewDetailsInput,
} from "@/lib/validation/cards";
import { createCard, previewNewCardId } from "@/app/admin/cards/actions";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { ProfileFields } from "@/components/admin/profile-fields";
import { cn } from "@/lib/utils";

type CardTypeChoice = "PROFILE" | "GOOGLE_REVIEW";

export function CreateCardForm({ initialCardId }: { initialCardId: string }) {
  const t = useTranslations("cards");
  const [type, setType] = useState<CardTypeChoice>("PROFILE");
  const [cardId, setCardId] = useState(initialCardId);
  const [isRegenerating, startRegenerate] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const profileForm = useForm<ProfileDetailsFormInput, unknown, ProfileDetailsInput>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: { fullName: "" },
  });

  const googleReviewForm = useForm<GoogleReviewDetailsInput>({
    resolver: zodResolver(googleReviewDetailsSchema),
    defaultValues: { googleReviewUrl: "" },
  });

  function regenerate() {
    startRegenerate(async () => {
      const next = await previewNewCardId();
      setCardId(next);
    });
  }

  const submitProfile = profileForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({ type: "PROFILE", ...values });
      if (result?.error) setFormError(result.error);
    });
  });

  const submitGoogleReview = googleReviewForm.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await createCard({ type: "GOOGLE_REVIEW", ...values });
      if (result?.error) setFormError(result.error);
    });
  });

  return (
    <div className="space-y-6">
      <div>
        <Label>{t("chooseType")}</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setType("PROFILE")}
            aria-pressed={type === "PROFILE"}
            className={cn(
              "rounded-xl border p-4 text-start transition-colors",
              type === "PROFILE"
                ? "border-primary bg-primary-tint"
                : "border-border hover:bg-surface",
            )}
          >
            <CreditCard className="mb-2 h-5 w-5 text-primary" aria-hidden />
            <p className="text-sm font-medium text-ink">
              {t("profileCardTitle")}
            </p>
            <p className="text-xs text-muted">{t("profileCardDescription")}</p>
          </button>
          <button
            type="button"
            onClick={() => setType("GOOGLE_REVIEW")}
            aria-pressed={type === "GOOGLE_REVIEW"}
            className={cn(
              "rounded-xl border p-4 text-start transition-colors",
              type === "GOOGLE_REVIEW"
                ? "border-primary bg-primary-tint"
                : "border-border hover:bg-surface",
            )}
          >
            <Star className="mb-2 h-5 w-5 text-primary" aria-hidden />
            <p className="text-sm font-medium text-ink">
              {t("googleReviewCardTitle")}
            </p>
            <p className="text-xs text-muted">
              {t("googleReviewCardDescription")}
            </p>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-xs text-muted">{t("cardIdLabel")}</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
            {cardId}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={regenerate}
          disabled={isRegenerating}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")}
            aria-hidden
          />
          {t("regenerateId")}
        </Button>
      </div>

      {type === "PROFILE" ? (
        <form onSubmit={submitProfile} noValidate className="space-y-5">
          <ProfileFields
            register={profileForm.register}
            errors={profileForm.formState.errors}
          />
          <FieldError>{formError}</FieldError>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("createButton")}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitGoogleReview} noValidate className="space-y-5">
          <GoogleMapsReviewHelper
            onGenerated={(url) =>
              googleReviewForm.setValue("googleReviewUrl", url, {
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
              placeholder="https://g.page/r/.../review"
              aria-invalid={!!googleReviewForm.formState.errors.googleReviewUrl}
              {...googleReviewForm.register("googleReviewUrl")}
            />
            <FieldError>
              {googleReviewForm.formState.errors.googleReviewUrl?.message}
            </FieldError>
          </div>
          <FieldError>{formError}</FieldError>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("creating") : t("createButton")}
          </Button>
        </form>
      )}
    </div>
  );
}
