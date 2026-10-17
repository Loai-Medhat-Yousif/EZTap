import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLinkIcon } from "@/lib/constants/link-icons";
import type { TopLink } from "@/lib/data/analytics";

export async function TopLinksList({ links }: { links: TopLink[] }) {
  const t = await getTranslations("analytics");

  if (links.length === 0) {
    return <p className="text-sm text-muted">{t("noData")}</p>;
  }

  return (
    <ul className="space-y-1">
      {links.map((link, index) => {
        const Icon = getLinkIcon(link.icon);
        return (
          <li key={link.linkId}>
            <Link
              href={`/admin/cards/${link.cardId}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface"
            >
              <span className="w-4 text-xs text-muted">{index + 1}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {link.title}
              </span>
              <span className="font-mono text-sm text-muted">{link.clickCount}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
