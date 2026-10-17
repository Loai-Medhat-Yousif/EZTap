"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CardListFilters } from "@/lib/validation/cards";

export function CardFiltersForm({
  defaultValues,
}: {
  defaultValues: CardListFilters;
}) {
  const t = useTranslations("cards");

  return (
    <form
      method="get"
      action="/admin/cards"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="q" className="mb-1.5 block text-sm font-medium text-ink">
          {t("search")}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted"
            aria-hidden
          />
          <Input
            id="q"
            name="q"
            defaultValue={defaultValues.q ?? ""}
            placeholder={t("searchPlaceholder")}
            className="ps-9"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="type"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {t("filterType")}
        </label>
        <select
          id="type"
          name="type"
          defaultValue={defaultValues.type}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-11 rounded-xl border border-border bg-surface-raised px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="ALL">{t("typeAll")}</option>
          <option value="PROFILE">{t("typeProfile")}</option>
          <option value="GOOGLE_REVIEW">{t("typeGoogleReview")}</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="status"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {t("filterStatus")}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues.status}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-11 rounded-xl border border-border bg-surface-raised px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="ALL">{t("statusAll")}</option>
          <option value="ACTIVE">{t("statusActive")}</option>
          <option value="INACTIVE">{t("statusInactive")}</option>
        </select>
      </div>

      <Button type="submit" variant="secondary">
        {t("search")}
      </Button>
    </form>
  );
}
