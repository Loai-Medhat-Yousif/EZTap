"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ADMIN_NAV_ITEMS, isNavItemActive } from "@/components/admin/nav-items";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="flex items-center justify-around border-b border-border bg-surface-raised px-2 py-1.5 md:hidden">
      {ADMIN_NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
