"use client";

import { useTranslations } from "next-intl";
import { LINK_ICON_KEYS, LINK_ICONS, type LinkIconKey } from "@/lib/constants/link-icons";
import { cn } from "@/lib/utils";

export function LinkIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: LinkIconKey) => void;
}) {
  const t = useTranslations("links");

  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {LINK_ICON_KEYS.map((key) => {
        const { icon: Icon, labelKey } = LINK_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={selected}
            title={t(labelKey)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
              selected
                ? "border-primary bg-primary-tint text-primary"
                : "border-border text-muted hover:bg-surface hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
