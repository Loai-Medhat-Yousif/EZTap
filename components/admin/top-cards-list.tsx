import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { TopCard } from "@/lib/data/analytics";

export async function TopCardsList({ cards }: { cards: TopCard[] }) {
  const t = await getTranslations("analytics");
  const tCards = await getTranslations("cards");

  if (cards.length === 0) {
    return <p className="text-sm text-muted">{t("noData")}</p>;
  }

  return (
    <ul className="space-y-1">
      {cards.map((card, index) => (
        <li key={card.cardId}>
          <Link
            href={`/admin/cards/${card.cardId}`}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface"
          >
            <span className="w-4 text-xs text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {card.type === "PROFILE"
                ? card.profileFullName || tCards("unnamedProfile")
                : tCards("typeGoogleReview")}
            </span>
            <span className="font-mono text-xs text-muted">{card.cardId}</span>
            <span className="font-mono text-sm text-ink">{card.viewCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
