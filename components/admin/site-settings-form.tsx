"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  siteSettingsSchema,
  type SiteSettingsInput,
} from "@/lib/validation/social-links";
import { updateSiteSettings } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

/**
 * The one global site setting the public footer shows today: where the
 * "Want to make your own?" call to action points. Left empty, the footer
 * falls back to that card's own public URL.
 */
export function SiteSettingsForm({
  defaultValues,
}: {
  defaultValues: SiteSettingsInput;
}) {
  const t = useTranslations("settings");
  const [isSubmitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startSubmit(async () => {
      const result = await updateSiteSettings(values);
      if (result?.error) {
        setFormError(result.error);
      } else {
        toast.success(t("saved"));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <Label htmlFor="makeYourOwnUrl">{t("makeYourOwnUrl")}</Label>
        <Input
          id="makeYourOwnUrl"
          type="url"
          placeholder="https://"
          aria-invalid={!!form.formState.errors.makeYourOwnUrl}
          {...form.register("makeYourOwnUrl")}
        />
        <FieldError>{form.formState.errors.makeYourOwnUrl?.message}</FieldError>
        <p className="mt-1 text-xs text-muted">{t("makeYourOwnUrlHint")}</p>
      </div>
      <FieldError>{formError}</FieldError>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
