"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  menuDetailsSchema,
  type MenuDetailsInput,
  type MenuDetailsFormInput,
} from "@/lib/validation/cards";
import type { MenuEditActions } from "@/lib/cards/profile-edit-actions";
import { MenuFields } from "@/components/admin/menu-fields";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/label";

export function EditMenuForm({
  scope,
  defaultValues,
  actions,
}: {
  scope: string;
  defaultValues: MenuDetailsFormInput;
  actions: MenuEditActions;
}) {
  const t = useTranslations("cards");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<MenuDetailsFormInput, unknown, MenuDetailsInput>({
    resolver: zodResolver(menuDetailsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await actions.updateMenuDetails(scope, values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("changesSaved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <MenuFields
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
