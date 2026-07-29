import { getLocale, getTranslations } from "next-intl/server";
import { getSiteSetting } from "@/lib/queries";
import { LegalPage } from "../LegalPage";

export default async function PaymentPage() {
  const [t, locale] = await Promise.all([getTranslations("Legal"), getLocale()]);
  const lang = locale === "kk" ? "kk" : locale === "en" ? "en" : "ru";
  const content = await getSiteSetting(`legal_payment_${lang}`);
  return (
    <LegalPage title={t("paymentTitle")} updatedAt={t("updatedAt")}>
      {content
        ? content.split("\n\n").map((para, i) => <p key={i}>{para}</p>)
        : <p>{t("draftNotice")}</p>}
    </LegalPage>
  );
}
