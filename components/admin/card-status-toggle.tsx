"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setCardStatus, deleteCard } from "@/app/admin/cards/actions";
import { Button } from "@/components/ui/button";
import type { CardStatus } from "@/types";

export function CardStatusToggle({
  cardId,
  status,
}: {
  cardId: string;
  status: CardStatus;
}) {
  const t = useTranslations("cards");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  function toggle() {
    startTransition(async () => {
      await setCardStatus(cardId, status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
    });
  }

  function handleDelete() {
    if (isDeleting) {
      setIsDeleting(false);
      startTransition(async () => {
        await deleteCard(cardId);
      });
      return;
    }
    setIsDeleting(true);
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={status === "ACTIVE" ? "destructive" : "primary"}
        size="sm"
        onClick={toggle}
        disabled={isPending}
      >
        {status === "ACTIVE"
          ? isPending
            ? t("deactivating")
            : t("deactivate")
          : isPending
            ? t("activating")
            : t("activate")}
      </Button>
      <Button
        type="button"
        variant={isDeleting ? "destructive" : "secondary"}
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isDeleting ? t("confirmDelete") : t("deleteCard")}
      </Button>
    </div>
  );
}
