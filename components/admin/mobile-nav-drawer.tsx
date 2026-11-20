"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ADMIN_NAV_ITEMS, isNavItemActive } from "@/components/admin/nav-items";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The mobile admin navigation: a hamburger that opens a side drawer
 * (replacing the old fixed bottom bar). The drawer carries the full nav
 * plus the language/theme switchers and logout, so everything reachable
 * on desktop is reachable on a phone.
 *
 * RTL-aware via logical properties (`start-0`, `border-e`): the panel
 * slides in from the inline-start edge — the right in Arabic, the left
 * in English — with no locale branching.
 */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const pathname = usePathname();
  const t = useTranslations("nav");

  // The drawer is only "open" while the pathname it was opened on is
  // still current, so tapping a link closes it without needing an effect
  // that calls setState when the route changes.
  const isOpen = open && openedAtPath === pathname;

  function handleOpen() {
    setOpenedAtPath(pathname);
    setOpen(true);
  }

  // While open: Escape closes, and the page behind doesn't scroll.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("openMenu")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-ink transition-colors hover:bg-surface-raised md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
            className="mobile-drawer-backdrop absolute inset-0 bg-black/50"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("dashboard")}
            className="mobile-drawer-panel absolute inset-y-0 start-0 flex w-72 max-w-[82vw] flex-col border-e border-border bg-surface-raised shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 px-5 py-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#15171F] p-1.5 ring-1 ring-black/5">
                  <Image src="/brand/logo.svg" alt="" width={26} height={18} />
                </div>
                <span className="font-semibold text-ink">EZTab</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
              {ADMIN_NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
                const active = isNavItemActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-tint text-primary"
                        : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {t(labelKey)}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 border-t border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink">{t("language")}</span>
                <LanguageSwitcher />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-ink">{t("theme")}</span>
                <ThemeSwitcher />
              </div>
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                >
                  {t("logout")}
                </Button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
