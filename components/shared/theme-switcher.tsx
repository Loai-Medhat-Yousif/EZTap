"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIsClient } from "@/lib/hooks/use-is-client";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeName = (typeof ORDER)[number];

const ICONS: Record<ThemeName, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("common");
  // next-themes doesn't know the resolved theme until after hydration
  // (it reads localStorage/OS preference client-side); rendering a
  // neutral placeholder until then avoids a hydration mismatch.
  const isClient = useIsClient();

  if (!isClient) {
    return <div className="h-11 w-11 rounded-xl" aria-hidden />;
  }

  const current: ThemeName = (theme as ThemeName) ?? "system";
  const Icon = ICONS[current];

  function cycle() {
    setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={cycle}
      aria-label={`${t("theme")}: ${t(current)}`}
      title={`${t("theme")}: ${t(current)}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
