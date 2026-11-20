"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  storeDetailsSchema,
  type StoreDetailsInput,
  type StoreDetailsFormInput,
} from "@/lib/validation/cards";
import type { StoreEditActions } from "@/lib/cards/profile-edit-actions";
import { StoreFields } from "@/components/admin/store-fields";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";

/**
 * Mirror of EditProfileForm for a store card. Unlike the profile form it
 * takes `actions` as a required prop, because the admin action for a
 * store is not the module's default profile action.
 */
export function EditStoreForm({
  scope,
  defaultValues,
  actions,
}: {
  scope: string;
  defaultValues: StoreDetailsFormInput;
  actions: StoreEditActions;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<StoreDetailsFormInput, unknown, StoreDetailsInput>({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await actions.updateStoreDetails(scope, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <StoreFields
        register={form.register}
        errors={form.formState.errors}
        setValue={form.setValue}
      />
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
