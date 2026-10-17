"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Printer, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function PrintCardButton({ cardId }: { cardId: string }) {
  const t = useTranslations("cards");
  const baseHref = `/api/admin/cards/${cardId}/print`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={baseHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "secondary", size: "sm" })}
      >
        <Printer className="h-3.5 w-3.5" aria-hidden />
        {t("printPdf")}
      </Link>
      <Link
        href={`${baseHref}?download=1`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {t("downloadPdf")}
      </Link>
    </div>
  );
}
