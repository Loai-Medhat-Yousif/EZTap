import { getTranslations } from "next-intl/server";
import { StatusScreen } from "@/components/shared/status-screen";

export default async function CardNotFound() {
  const t = await getTranslations("publicProfile");
  return (
    <StatusScreen title={t("notFoundTitle")} message={t("notFoundMessage")} />
  );
}
