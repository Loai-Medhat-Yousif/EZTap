import { getTranslations } from "next-intl/server";
import { previewNewCardId } from "@/app/admin/cards/actions";
import { CreateCardForm } from "@/components/admin/create-card-form";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NewCardPage() {
  const t = await getTranslations("cards");
  const preview = await previewNewCardId();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-ink">{t("createCard")}</h1>
      <div className="rounded-2xl border border-border bg-surface-raised p-6">
        <CreateCardForm
          initialCardId={preview.cardId ?? ""}
          previewError={preview.error ?? null}
        />
      </div>
    </div>
  );
}
