import { getTranslations } from "next-intl/server";
import { getAdminContext } from "@/lib/auth/require-admin";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const context = await getAdminContext();
  // Shown as the login username (the email's local part) — that's what
  // the admin actually types to sign in, not the internal email.
  const username = context?.user.email?.split("@")[0] ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>

      <section className="rounded-2xl border border-border bg-surface-raised p-6">
        <h2 className="mb-4 text-sm font-semibold text-ink">{t("appearance")}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink">{t("language")}</span>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink">{t("theme")}</span>
            <ThemeSwitcher />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-6">
        <h2 className="mb-1 text-sm font-semibold text-ink">{t("account")}</h2>
        <p className="mb-5 text-sm text-muted">
          {t("signedInAs")}{" "}
          <span className="font-mono text-ink">{username}</span>
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
