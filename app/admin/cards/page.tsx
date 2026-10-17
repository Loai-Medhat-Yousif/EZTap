import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { listCards } from "@/lib/data/cards";
import { cardListFiltersSchema } from "@/lib/validation/cards";
import { buttonVariants } from "@/components/ui/button";
import { CardFiltersForm } from "@/components/admin/card-filters-form";
import { CardsTable } from "@/components/admin/cards-table";
import { Pagination } from "@/components/admin/pagination";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = cardListFiltersSchema.parse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    type: typeof raw.type === "string" ? raw.type : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    page: typeof raw.page === "string" ? raw.page : undefined,
  });

  const t = await getTranslations("cards");
  const { rows, total, pageSize } = await listCards(filters);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(page: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.type !== "ALL") params.set("type", filters.type);
    if (filters.status !== "ALL") params.set("status", filters.status);
    params.set("page", String(page));
    return `/admin/cards?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <Link href="/admin/cards/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("createCard")}
        </Link>
      </div>

      <CardFiltersForm defaultValues={filters} />

      <div className="rounded-2xl border border-border bg-surface-raised">
        <CardsTable rows={rows} />
      </div>

      <Pagination page={filters.page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
