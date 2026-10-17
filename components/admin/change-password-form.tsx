"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validation/auth";
import { changePassword } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function ChangePasswordForm() {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await changePassword(values);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      form.reset();
      toast.success(t("passwordUpdated"));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...form.register("currentPassword")}
        />
        <FieldError>{errors.currentPassword?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...form.register("newPassword")}
        />
        <FieldError>{errors.newPassword?.message}</FieldError>
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
        <FieldError>{errors.confirmPassword?.message}</FieldError>
      </div>
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isPending}>
        {isPending ? t("updating") : t("updatePassword")}
      </Button>
    </form>
  );
}
