import { getTranslations } from "next-intl/server";
import { Wand2 } from "lucide-react";
import { GoogleReviewTool } from "@/components/admin/google-review-tool";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ToolsPage() {
  const t = await getTranslations("tools");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
        <p className="text-sm text-muted">{t("description")}</p>
      </div>

      <section className="rounded-2xl border border-border bg-surface-raised p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Wand2 className="h-4 w-4" aria-hidden />
          {t("reviewLinkTitle")}
        </h2>
        <GoogleReviewTool />
      </section>
    </div>
  );
}
