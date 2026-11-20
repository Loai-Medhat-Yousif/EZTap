"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";
import type { PaymentDetailsFormInput } from "@/lib/validation/cards";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, FieldError } from "@/components/ui/label";

/**
 * The editable fields for a multiple-payment-methods card. Deliberately
 * minimal: a name, a short description, and a list of payment links
 * managed separately by ProfileLinksManager.
 */
export function PaymentFields({
  register,
  errors,
}: {
  register: UseFormRegister<PaymentDetailsFormInput>;
  errors: FieldErrors<PaymentDetailsFormInput>;
}) {
  const t = useTranslations("cards");

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fullName">{t("paymentName")}</Label>
        <Input
          id="fullName"
          aria-invalid={!!errors.fullName}
          {...register("fullName")}
        />
        <FieldError>{errors.fullName?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="bio">{t("paymentBio")}</Label>
        <Textarea
          id="bio"
          rows={3}
          placeholder={t("paymentBioPlaceholder")}
          aria-invalid={!!errors.bio}
          {...register("bio")}
        />
        <FieldError>{errors.bio?.message}</FieldError>
      </div>
    </div>
  );
}
