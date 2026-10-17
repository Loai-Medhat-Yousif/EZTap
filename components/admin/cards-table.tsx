import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye, MousePointerClick } from "lucide-react";
import type { CardListRow } from "@/lib/data/cards";
import { Badge } from "@/components/ui/badge";

export async function CardsTable({ rows }: { rows: CardListRow[] }) {
  const t = await getTranslations("cards");

  if (rows.length === 0) {
    return (
      <p className="p-10 text-center text-sm text-muted">{t("noResults")}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted">
            <th className="px-4 py-3 text-start font-medium">
              {t("columnCardId")}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {t("columnType")}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {t("columnDestination")}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {t("columnStatus")}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {t("columnViews")}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {t("columnClicks")}
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border last:border-0 hover:bg-surface"
            >
              <td className="whitespace-nowrap px-4 py-3 font-mono text-ink">
                {row.card_id}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone="primary">
                  {row.type === "PROFILE"
                    ? t("typeProfile")
                    : t("typeGoogleReview")}
                </Badge>
              </td>
              <td className="max-w-56 truncate px-4 py-3 text-ink">
                {row.type === "PROFILE"
                  ? row.profileFullName || t("unnamedProfile")
                  : row.googleReviewUrl}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={row.status === "ACTIVE" ? "success" : "muted"}>
                  {row.status === "ACTIVE"
                    ? t("statusActive")
                    : t("statusInactive")}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {row.viewCount}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
                  {row.clickCount}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-end">
                <Link
                  href={`/admin/cards/${row.card_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {t("view")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
