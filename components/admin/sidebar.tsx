"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ADMIN_NAV_ITEMS, isNavItemActive } from "@/components/admin/nav-items";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="hidden w-60 shrink-0 border-e border-border bg-surface-raised md:flex md:flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#15171F] p-1.5 ring-1 ring-black/5">
          <Image src="/brand/logo.svg" alt="" width={26} height={18} />
        </div>
        <span className="font-semibold text-ink">EZTab</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
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
    </aside>
  );
}
