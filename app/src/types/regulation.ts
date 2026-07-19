export type RegulationLocale = "ru" | "kk" | "en";

export type RegulationFile = {
  locale: RegulationLocale;
  name: string;
  url: string;
};

export type RegulationBlock = {
  id: string;
  order: number;
  title: { ru: string; kk: string; en: string };
  content: { ru: string; kk: string; en: string };
};
