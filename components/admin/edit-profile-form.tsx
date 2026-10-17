"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  profileDetailsSchema,
  type ProfileDetailsInput,
  type ProfileDetailsFormInput,
} from "@/lib/validation/cards";
import * as adminActions from "@/app/admin/cards/actions";
import type { ProfileEditActions } from "@/lib/cards/profile-edit-actions";
import { ProfileFields } from "@/components/admin/profile-fields";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";

export function EditProfileForm({
  scope,
  defaultValues,
  actions = adminActions,
}: {
  scope: string;
  defaultValues: ProfileDetailsFormInput;
  actions?: ProfileEditActions;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileDetailsFormInput, unknown, ProfileDetailsInput>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await actions.updateProfileDetails(scope, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <ProfileFields register={form.register} errors={form.formState.errors} />
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
