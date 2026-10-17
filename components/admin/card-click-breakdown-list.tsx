import { getTranslations } from "next-intl/server";
import { getLinkIcon } from "@/lib/constants/link-icons";
import type { CardClickBreakdownRow } from "@/lib/data/analytics";

const CHANNEL_ICON_MAP: Record<string, string> = {
  PHONE_CLICK: "phone",
  WHATSAPP_CLICK: "whatsapp",
  EMAIL_CLICK: "email",
  WEBSITE_CLICK: "website",
  MAPS_CLICK: "google_maps",
};

export async function CardClickBreakdownList({
  rows,
}: {
  rows: CardClickBreakdownRow[];
}) {
  const t = await getTranslations("analytics");

  const withClicks = rows
    .filter((row) => row.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount);

  if (withClicks.length === 0) {
    return <p className="text-sm text-muted">{t("noData")}</p>;
  }

  return (
    <ul className="space-y-1">
      {withClicks.map((row) => {
        const iconKey =
          row.kind === "LINK" ? (row.icon ?? "custom") : (CHANNEL_ICON_MAP[row.key] ?? "custom");
        const Icon = getLinkIcon(iconKey);
        const label = row.kind === "LINK" ? row.label : t(`channel.${row.key}`);

        return (
          <li
            key={`${row.kind}-${row.key}`}
            className="flex items-center gap-3 rounded-xl px-2 py-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{label}</span>
            <span className="font-mono text-sm text-muted">{row.clickCount}</span>
          </li>
        );
      })}
    </ul>
  );
}
