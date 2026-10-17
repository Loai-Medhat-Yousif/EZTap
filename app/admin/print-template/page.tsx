import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAdminContext } from "@/lib/auth/require-admin";
import { getPrintTemplates } from "@/lib/data/print-template";
import { getPrintDesignPublicUrl } from "@/lib/storage/print-designs";
import { PRINT_TEMPLATE_KINDS } from "@/lib/print/template";
import { PrintTemplateEditor } from "@/components/admin/print-template-editor";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PrintTemplatePage() {
  const context = await getAdminContext();
  if (!context) notFound();

  const [t, templates] = await Promise.all([
    getTranslations("print"),
    getPrintTemplates(),
  ]);

  const { supabase } = context;
  const designUrls = Object.fromEntries(
    PRINT_TEMPLATE_KINDS.map((kind) => [
      kind,
      templates[kind].designPath
        ? getPrintDesignPublicUrl(supabase, templates[kind].designPath as string)
        : null,
    ]),
  ) as Record<(typeof PRINT_TEMPLATE_KINDS)[number], string | null>;

  // Remount the editor whenever the stored templates change (e.g. after a
  // save or design upload + revalidation), so it re-seeds from props
  // rather than needing an effect to sync state.
  const editorKey = [
    ...PRINT_TEMPLATE_KINDS.map((kind) =>
      [
        designUrls[kind] ?? "no-design",
        templates[kind].widthCm,
        templates[kind].heightCm,
        templates[kind].cardIdX,
        templates[kind].cardIdY,
        templates[kind].cardIdFontSize,
        templates[kind].cardIdColor,
        templates[kind].qrX,
        templates[kind].qrY,
        templates[kind].qrSize,
      ].join(":"),
    ),
  ].join("|");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <span className="text-sm text-muted">{t("subtitle")}</span>
      </div>

      <PrintTemplateEditor
        key={editorKey}
        templates={templates}
        designUrls={designUrls}
      />
    </div>
  );
}
