import { getTranslations } from "next-intl/server";
import { LegalPage } from "../LegalPage";

export default async function PaymentPage() {
  const t = await getTranslations("Legal");
  return (
    <LegalPage title={t("paymentTitle")} updatedAt={t("updatedAt")}>
      <p>{t("draftNotice")}</p>
    </LegalPage>
  );
}
