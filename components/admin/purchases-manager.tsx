"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { addPurchase, deletePurchase } from "@/app/admin/statistics/actions";
import type { CardPurchase } from "@/lib/data/income";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

export function PurchasesManager({
  purchases,
  today,
}: {
  purchases: CardPurchase[];
  today: string;
}) {
  const t = useTranslations("statistics");
  const locale = useLocale();
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [purchasedOn, setPurchasedOn] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await addPurchase({
        quantity: Number(quantity),
        totalCost: Number(totalCost),
        purchasedOn,
        note,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      toast.success(t("purchaseAdded"));
      setQuantity("");
      setTotalCost("");
      setNote("");
      setPurchasedOn(today);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm(t("purchaseDeleteConfirm"))) return;
    startTransition(async () => {
      const result = await deletePurchase(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("purchaseDeleted"));
    });
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <div>
          <Label htmlFor="purchaseQuantity">{t("purchaseQuantity")}</Label>
          <Input
            id="purchaseQuantity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={t("purchaseQuantityPlaceholder")}
          />
        </div>

        <div>
          <Label htmlFor="purchaseCost">{t("purchaseCost")}</Label>
          <Input
            id="purchaseCost"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={totalCost}
            onChange={(event) => setTotalCost(event.target.value)}
            placeholder={t("purchaseCostPlaceholder")}
          />
        </div>

        <div>
          <Label htmlFor="purchaseDate">{t("purchaseDate")}</Label>
          <Input
            id="purchaseDate"
            type="date"
            value={purchasedOn}
            max={today}
            onChange={(event) => setPurchasedOn(event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="purchaseNote">{t("purchaseNote")}</Label>
          <Input
            id="purchaseNote"
            type="text"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("purchaseNotePlaceholder")}
          />
        </div>

        <div className="col-span-2 flex flex-col gap-2 md:col-span-4">
          <FieldError>{error}</FieldError>
          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("purchaseAdding") : t("purchaseAdd")}
            </Button>
          </div>
        </div>
      </form>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted">{t("purchaseEmpty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">{t("purchaseColumnDate")}</th>
                <th className="py-2 pr-4">{t("purchaseColumnQuantity")}</th>
                <th className="py-2 pr-4">{t("purchaseColumnUnit")}</th>
                <th className="py-2 pr-4">{t("purchaseColumnCost")}</th>
                <th className="py-2 pr-4">{t("purchaseColumnNote")}</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => {
                const unitCost =
                  purchase.quantity > 0
                    ? purchase.totalCost / purchase.quantity
                    : 0;
                return (
                  <tr key={purchase.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-ink">
                      {dateFormatter.format(new Date(`${purchase.purchasedOn}T00:00:00`))}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-ink">
                      {purchase.quantity}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-muted">
                      {money.format(unitCost)}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-ink">
                      {money.format(purchase.totalCost)}
                    </td>
                    <td className="py-2 pr-4 text-muted">{purchase.note ?? "—"}</td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(purchase.id)}
                        disabled={isPending}
                        className="text-xs text-muted hover:text-danger disabled:opacity-50"
                      >
                        {t("purchaseDelete")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
