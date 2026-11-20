"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  paymentDetailsSchema,
  type PaymentDetailsInput,
  type PaymentDetailsFormInput,
} from "@/lib/validation/cards";
import type { PaymentEditActions } from "@/lib/cards/profile-edit-actions";
import { PaymentFields } from "@/components/admin/payment-fields";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";

/**
 * Mirror of EditStoreForm for a multiple-payment-methods card. `actions`
 * is required because a payment card's action bundle differs from the
 * profile module's default one.
 */
export function EditPaymentForm({
  scope,
  defaultValues,
  actions,
}: {
  scope: string;
  defaultValues: PaymentDetailsFormInput;
  actions: PaymentEditActions;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PaymentDetailsFormInput, unknown, PaymentDetailsInput>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await actions.updatePaymentDetails(scope, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <PaymentFields
        register={form.register}
        errors={form.formState.errors}
      />
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
