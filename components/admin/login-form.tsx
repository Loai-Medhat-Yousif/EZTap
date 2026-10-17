"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function LoginForm() {
  const t = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", values.username);
      formData.set("password", values.password);

      const result = await login(formData);
      // A successful login redirects server-side and never resolves
      // here — so reaching this line always means it failed.
      if (result?.error) {
        setFormError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          autoComplete="username"
          autoFocus
          aria-invalid={!!errors.username}
          {...register("username")}
        />
        <FieldError>{errors.username?.message}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        <FieldError>{errors.password?.message}</FieldError>
      </div>

      <FieldError>{formError}</FieldError>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
