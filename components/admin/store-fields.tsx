"use client";

import type {
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import type { StoreDetailsFormInput } from "@/lib/validation/cards";
import { GoogleMapsReviewHelper } from "@/components/admin/google-maps-review-helper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FieldError } from "@/components/ui/label";

/**
 * The store page's editable fields. Mirrors ProfileFields for everything
 * a store shares with a personal profile, then adds the store-only
 * fields (category, address, opening hours) and the review target.
 */
export function StoreFields({
  register,
  errors,
  setValue,
}: {
  register: UseFormRegister<StoreDetailsFormInput>;
  errors: FieldErrors<StoreDetailsFormInput>;
  setValue: UseFormSetValue<StoreDetailsFormInput>;
}) {
  const t = useTranslations("cards");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">{t("storeName")}</Label>
          <Input
            id="fullName"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
          <FieldError>{errors.fullName?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="category">{t("storeCategory")}</Label>
          <Input
            id="category"
            placeholder={t("storeCategoryPlaceholder")}
            aria-invalid={!!errors.category}
            {...register("category")}
          />
          <FieldError>{errors.category?.message}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="bio">{t("bio")}</Label>
        <Textarea
          id="bio"
          rows={3}
          aria-invalid={!!errors.bio}
          {...register("bio")}
        />
        <FieldError>{errors.bio?.message}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            type="tel"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          <FieldError>{errors.phone?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
          <Input
            id="whatsapp"
            type="tel"
            aria-invalid={!!errors.whatsapp}
            {...register("whatsapp")}
          />
          <FieldError>{errors.whatsapp?.message}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="website">{t("website")}</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.website}
            {...register("website")}
          />
          <FieldError>{errors.website?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="googleMapsUrl">{t("googleMapsUrl")}</Label>
          <Input
            id="googleMapsUrl"
            type="url"
            placeholder="https://"
            aria-invalid={!!errors.googleMapsUrl}
            {...register("googleMapsUrl")}
          />
          <FieldError>{errors.googleMapsUrl?.message}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="address">{t("storeAddress")}</Label>
        <Input
          id="address"
          aria-invalid={!!errors.address}
          {...register("address")}
        />
        <FieldError>{errors.address?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="openingHours">{t("storeOpeningHours")}</Label>
        <Input
          id="openingHours"
          placeholder={t("storeOpeningHoursPlaceholder")}
          aria-invalid={!!errors.openingHours}
          {...register("openingHours")}
        />
        <FieldError>{errors.openingHours?.message}</FieldError>
      </div>

      <div className="space-y-2 rounded-xl border border-border p-4">
        <Label htmlFor="googleReviewUrl">{t("googleReviewUrl")}</Label>
        <GoogleMapsReviewHelper
          onGenerated={(url) =>
            setValue("googleReviewUrl", url, { shouldValidate: true })
          }
        />
        <Input
          id="googleReviewUrl"
          type="url"
          placeholder="https://"
          aria-invalid={!!errors.googleReviewUrl}
          {...register("googleReviewUrl")}
        />
        <FieldError>{errors.googleReviewUrl?.message}</FieldError>
        <p className="text-xs text-muted">{t("googleReviewUrlHint")}</p>
      </div>
    </div>
  );
}
