import { getTranslations } from "next-intl/server";
import type { RecentCard } from "@/lib/data/cards";
import { cn } from "@/lib/utils";

export async function RecentCardsList({ cards }: { cards: RecentCard[] }) {
  const t = await getTranslations("dashboard");

  if (cards.length === 0) {
    return <p className="text-sm text-muted">{t("noCardsYet")}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {card.type === "PROFILE"
                ? card.profileFullName || t("unnamedProfile")
                : t("cardTypeGoogleReview")}
            </p>
            <p className="font-mono text-xs text-muted">{card.card_id}</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
              card.status === "ACTIVE"
                ? "bg-success/10 text-success"
                : "bg-muted/10 text-muted",
            )}
          >
            {card.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
          </span>
        </li>
      ))}
    </ul>
  );
}
