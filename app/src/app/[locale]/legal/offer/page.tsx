import { getTranslations } from "next-intl/server";
import { LegalPage } from "../LegalPage";

export default async function OfferPage() {
  const t = await getTranslations("Legal");
  return (
    <LegalPage title={t("offerTitle")} updatedAt={t("updatedAt")}>
      <p>{t("draftNotice")}</p>
    </LegalPage>
  );
}
