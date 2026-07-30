export type LocalizedText = { ru: string; en: string; kk: string };
export type LocalizedList = { ru: string[]; en: string[]; kk: string[] };

export type SponsorPackage = {
  id: string;
  featured: boolean;
  tier: LocalizedText;
  label: LocalizedText;
  benefits: LocalizedList;
};

export const DEFAULT_SPONSOR_PACKAGES: SponsorPackage[] = [
  {
    id: "title",
    featured: true,
    tier: { ru: "Титульный", en: "Title", kk: "Атаулы" },
    label: { ru: "Максимальная видимость", en: "Maximum visibility", kk: "Максималды көрінуі" },
    benefits: {
      ru: [
        "Имя компании в названии забега",
        "Логотип на стартовой арке и всех баннерах",
        "Брендированная зона на старте и финише",
        "Объявления диктора на протяжении всего события",
        "Логотип на финишных медалях участников",
        "Логотип на футболках участников",
        "Публикации в соцсетях (до, во время и после)",
        "Логотип на сайте в разделе «Партнёры»",
        "Пакет стартовых слотов для сотрудников",
      ],
      en: [
        "Company name in the race title",
        "Logo on the start arch and all banners",
        "Branded zone at start and finish",
        "MC announcements throughout the event",
        "Logo on finisher medals",
        "Logo on participant T-shirts",
        "Social media posts (before, during and after)",
        "Logo on the website in the Partners section",
        "Start slot package for employees",
      ],
      kk: [
        "Компания атауы жарыс атауында",
        "Старт доғасы мен барлық баннерлердегі логотип",
        "Старт пен фиништегі брендтелген аймақ",
        "Диктордың бүкіл іс-шара бойынша хабарлаулары",
        "Финиш медальдарындағы логотип",
        "Қатысушылардың футболкаларындағы логотип",
        "Әлеуметтік желідегі жарияланымдар (дейін, кезінде және кейін)",
        "Сайттың «Серіктестер» бөліміндегі логотип",
        "Қызметкерлерге старт слоттары пакеті",
      ],
    },
  },
  {
    id: "general",
    featured: false,
    tier: { ru: "Генеральный", en: "General", kk: "Бас" },
    label: { ru: "Широкое присутствие", en: "Wide presence", kk: "Кең қатысу" },
    benefits: {
      ru: [
        "Логотип на стартовой арке и баннерах",
        "Стенд в стартовом городке",
        "Объявления диктора",
        "Логотип на футболках участников",
        "Публикации в соцсетях (3 поста)",
        "Логотип на сайте в разделе «Партнёры»",
        "Пакет стартовых слотов для сотрудников",
      ],
      en: [
        "Logo on the start arch and banners",
        "Booth in the start village",
        "MC announcements",
        "Logo on participant T-shirts",
        "Social media posts (3 posts)",
        "Logo on the website in the Partners section",
        "Start slot package for employees",
      ],
      kk: [
        "Старт доғасы мен баннерлердегі логотип",
        "Старт аймағындағы стенд",
        "Диктордың хабарлаулары",
        "Қатысушылардың футболкаларындағы логотип",
        "Әлеуметтік желідегі жарияланымдар (3 пост)",
        "Сайттың «Серіктестер» бөліміндегі логотип",
        "Қызметкерлерге старт слоттары пакеті",
      ],
    },
  },
  {
    id: "official",
    featured: false,
    tier: { ru: "Официальный", en: "Official", kk: "Ресми" },
    label: { ru: "Целевая поддержка", en: "Targeted support", kk: "Мақсатты қолдау" },
    benefits: {
      ru: [
        "Логотип на выбранных баннерах",
        "Публикации в соцсетях (2 поста)",
        "Логотип на сайте в разделе «Партнёры»",
        "Стартовые слоты для сотрудников",
      ],
      en: [
        "Logo on selected banners",
        "Social media posts (2 posts)",
        "Logo on the website in the Partners section",
        "Start slots for employees",
      ],
      kk: [
        "Таңдалған баннерлердегі логотип",
        "Әлеуметтік желідегі жарияланымдар (2 пост)",
        "Сайттың «Серіктестер» бөліміндегі логотип",
        "Қызметкерлерге старт слоттары",
      ],
    },
  },
  {
    id: "info",
    featured: false,
    tier: { ru: "Информационный", en: "Media", kk: "Ақпараттық" },
    label: { ru: "Партнёр по информации", en: "Information partner", kk: "Ақпарат серіктесі" },
    benefits: {
      ru: [
        "Логотип на сайте в разделе «Партнёры»",
        "Взаимный обмен публикациями в соцсетях",
        "Упоминание в рассылке участникам",
      ],
      en: [
        "Logo on the website in the Partners section",
        "Mutual social media cross-posts",
        "Mention in the participant newsletter",
      ],
      kk: [
        "Сайттың «Серіктестер» бөліміндегі логотип",
        "Әлеуметтік желіде өзара жарияланымдар алмасу",
        "Қатысушыларға жіберілетін хатта атап өту",
      ],
    },
  },
];
