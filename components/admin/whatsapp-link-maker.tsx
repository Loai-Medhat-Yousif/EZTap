"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Wand2 } from "lucide-react";
import { buildWhatsappLink } from "@/lib/whatsapp/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";

/**
 * Type a phone number → get a `wa.me` chat link. Used in two places:
 * the Tools page (standalone) and the link form, whenever the WhatsApp
 * icon is picked, where `onGenerated` fills the form's URL field so the
 * admin never hand-builds a wa.me URL.
 */
export function WhatsappLinkMaker({
  onGenerated,
  inputId = "whatsappNumber",
}: {
  onGenerated: (url: string) => void;
  inputId?: string;
}) {
  const t = useTranslations("tools");
  const [number, setNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    const result = buildWhatsappLink(number);
    if (result.error) {
      setError(
        result.error === "empty" ? t("whatsappNumberRequired") : t("whatsappInvalid"),
      );
      return;
    }
    setError(null);
    onGenerated(result.url);
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <Label htmlFor={inputId}>{t("whatsappNumberLabel")}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleGenerate();
            }
          }}
          placeholder={t("whatsappNumberPlaceholder")}
          inputMode="tel"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleGenerate}
          disabled={number.trim().length === 0}
          className="sm:w-auto"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {t("generate")}
        </Button>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("whatsappHint")}
      </p>
      <FieldError>{error}</FieldError>
    </div>
  );
}
