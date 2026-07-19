import { getTranslations } from "next-intl/server";
import { LegalPage } from "../LegalPage";

export default async function PrivacyPage() {
  const t = await getTranslations("Legal");
  return (
    <LegalPage title={t("privacyTitle")} updatedAt={t("updatedAt")}>
      <p>{t("draftNotice")}</p>
    </LegalPage>
  );
}
