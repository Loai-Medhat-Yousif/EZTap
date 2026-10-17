"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  profileLinkSchema,
  type ProfileLinkInput,
} from "@/lib/validation/cards";
import { LinkIconPicker } from "@/components/admin/link-icon-picker";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/app/admin/cards/actions";

export function LinkForm({
  defaultValues,
  onSubmit,
  onCancel,
}: {
  defaultValues: ProfileLinkInput;
  onSubmit: (values: ProfileLinkInput) => Promise<ActionResult>;
  onCancel: () => void;
}) {
  const t = useTranslations("links");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileLinkInput>({
    resolver: zodResolver(profileLinkSchema),
    defaultValues,
  });

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result?.error) {
        form.setError("root", { message: result.error });
      }
    });
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <Label>{t("icon")}</Label>
        <LinkIconPicker
          value={form.watch("icon")}
          onChange={(icon) =>
            form.setValue("icon", icon, { shouldValidate: true })
          }
        />
      </div>

      <div>
        <Label htmlFor="link-title">{t("label")}</Label>
        <Input
          id="link-title"
          aria-invalid={!!form.formState.errors.title}
          {...form.register("title")}
        />
        <FieldError>{form.formState.errors.title?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="link-url">{t("url")}</Label>
        <Input
          id="link-url"
          type="url"
          placeholder="https://"
          aria-invalid={!!form.formState.errors.url}
          {...form.register("url")}
        />
        <FieldError>{form.formState.errors.url?.message}</FieldError>
      </div>

      <FieldError>{form.formState.errors.root?.message}</FieldError>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
