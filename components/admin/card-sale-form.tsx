"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateCardSale } from "@/app/admin/cards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function CardSaleForm({
  cardId,
  priceEgp,
  soldAt,
}: {
  cardId: string;
  priceEgp: number | null;
  soldAt: string | null;
}) {
  const t = useTranslations("cards");
  const locale = useLocale();
  const [sold, setSold] = useState(soldAt !== null);
  const [price, setPrice] = useState(
    priceEgp === null ? "" : String(priceEgp),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedPrice = price.trim() === "" ? null : Number(price);
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      setError(t("salePriceInvalid"));
      return;
    }

    startTransition(async () => {
      const result = await updateCardSale(cardId, {
        sold,
        priceEgp: parsedPrice,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success(t("saleSaved"));
      }
    });
  }

  const soldOn = soldAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(soldAt),
      )
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={sold}
          onChange={(event) => setSold(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        {t("soldLabel")}
      </label>

      {soldOn && (
        <p className="text-xs text-muted">
          {t("soldOnLabel", { date: soldOn })}
        </p>
      )}

      <div>
        <Label htmlFor="priceEgp">{t("priceLabel")}</Label>
        <Input
          id="priceEgp"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={t("pricePlaceholder")}
        />
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" disabled={isPending}>
        {isPending ? t("saving") : t("saveSale")}
      </Button>
    </form>
  );
}
