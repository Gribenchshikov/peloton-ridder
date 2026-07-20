import { getTranslations } from "next-intl/server";
import { LegalPage } from "../LegalPage";

export default async function ConsentPage() {
  const t = await getTranslations("Legal");
  return (
    <LegalPage title={t("consentTitle")} updatedAt={t("updatedAt")}>
      <p>{t("draftNotice")}</p>
    </LegalPage>
  );
}
