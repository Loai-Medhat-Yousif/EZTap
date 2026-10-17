import { getTranslations } from "next-intl/server";
import { StatusScreen } from "@/components/shared/status-screen";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return <StatusScreen title={t("notFoundTitle")} message={t("notFoundMessage")} />;
}
