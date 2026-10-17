import { getTranslations } from "next-intl/server";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export async function Topbar({ userEmail }: { userEmail: string | undefined }) {
  const t = await getTranslations("nav");

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-3 md:px-6">
      <span className="font-semibold text-ink md:hidden">EZTab</span>
      <span className="hidden md:block" />

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeSwitcher />
        {userEmail && (
          <span className="hidden font-mono text-sm text-muted sm:inline">
            {userEmail}
          </span>
        )}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            {t("logout")}
          </Button>
        </form>
      </div>
    </header>
  );
}
