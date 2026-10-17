"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { ProfileDetailsFormInput } from "@/lib/validation/cards";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FieldError } from "@/components/ui/label";

export function ProfileFields({
  register,
  errors,
}: {
  register: UseFormRegister<ProfileDetailsFormInput>;
  errors: FieldErrors<ProfileDetailsFormInput>;
}) {
  const t = useTranslations("cards");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input
          id="fullName"
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
        <FieldError>{errors.fullName?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="jobTitle">{t("jobTitle")}</Label>
        <Input
          id="jobTitle"
          aria-invalid={!!errors.jobTitle}
          {...register("jobTitle")}
        />
        <FieldError>{errors.jobTitle?.message}</FieldError>
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
  );
}
