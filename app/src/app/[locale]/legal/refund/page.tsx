import { getTranslations } from "next-intl/server";
import { LegalPage } from "../LegalPage";

export default async function RefundPage() {
  const t = await getTranslations("Legal");
  return (
    <LegalPage title={t("refundTitle")} updatedAt={t("updatedAt")}>
      <p>{t("draftNotice")}</p>
    </LegalPage>
  );
}
