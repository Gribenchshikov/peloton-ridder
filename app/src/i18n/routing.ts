import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "kk", "en", "zh"],
  defaultLocale: "ru",
});
