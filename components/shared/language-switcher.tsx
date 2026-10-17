"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { locales, localeCookieName, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    if (next === locale) return;
    // Writing a cookie from a click handler (not render) is the
    // correct place for this; react-hooks v7's immutability rule
    // appears to flag any assignment through a global (document)
    // regardless of context.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border bg-surface p-1">
      <Languages className="ms-1.5 h-3.5 w-3.5 text-muted" aria-hidden />
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => selectLocale(l)}
          disabled={isPending}
          aria-pressed={locale === l}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
            locale === l
              ? "bg-primary text-white"
              : "text-muted hover:text-ink",
          )}
        >
          {l === "en" ? "EN" : "AR"}
        </button>
      ))}
    </div>
  );
}
