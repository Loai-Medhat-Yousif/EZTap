"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import {
  MENU_PRINT_TEMPLATE_KINDS,
  type MenuPrintTemplateKind,
} from "@/lib/print/template";
import { updateMenuPrintTemplate } from "@/app/admin/cards/actions";
import { cn } from "@/lib/utils";

/**
 * Lets an admin choose which of the two MENU print designs is used when
 * printing a specific physical card. The print endpoint reads this value
 * from the card's menu profile, so no query string is needed.
 */
export function MenuPrintTemplatePicker({
  cardId,
  value,
}: {
  cardId: string;
  value: MenuPrintTemplateKind;
}) {
  const t = useTranslations("cards");
  const tp = useTranslations("print");
  const [isPending, startTransition] = useTransition();
  const selected = value;

  function choose(kind: MenuPrintTemplateKind) {
    if (kind === selected || isPending) return;
    startTransition(async () => {
      const result = await updateMenuPrintTemplate(cardId, kind);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("menuPrintTemplateSaved"));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Printer className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">{t("menuPrintTemplateTitle")}</span>
      </div>
      <p className="text-xs text-muted">{t("menuPrintTemplateDescription")}</p>
      <div className="flex flex-wrap gap-2">
        {MENU_PRINT_TEMPLATE_KINDS.map((kind, index) => (
          <button
            key={kind}
            type="button"
            disabled={isPending}
            onClick={() => choose(kind)}
            aria-pressed={selected === kind}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              selected === kind
                ? "border-primary bg-primary-tint text-primary"
                : "border-border bg-surface text-muted hover:text-ink",
            )}
          >
            {tp(index === 0 ? "templateMenuDesign1" : "templateMenuDesign2")}
          </button>
        ))}
      </div>
    </div>
  );
}
