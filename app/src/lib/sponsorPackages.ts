export type LocalizedText = { ru: string; en: string; kk: string };
export type LocalizedList = { ru: string[]; en: string[]; kk: string[] };

export type PartnerType = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  youGive: LocalizedList;
  youGet: LocalizedList;
};

export const DEFAULT_PARTNER_TYPES: PartnerType[] = [
  {
    id: "tech",
    name: { ru: "Технический партнёр", en: "Technical Partner", kk: "Техникалық серіктес" },
    description: {
      ru: "Предоставляете оборудование или экспертизу — мы обеспечиваем видимость вашего бренда среди активной аудитории.",
      en: "You provide equipment or expertise — we give your brand visibility among an active audience.",
      kk: "Жабдықтар немесе тәжірибе ұсынасыз — біз брендіңізді белсенді аудитория арасында көрсетеміз.",
    },
    youGive: {
      ru: ["Оборудование или услуги для проведения забега", "Профессиональная экспертиза или сервис"],
      en: ["Equipment or services for the race", "Professional expertise or service"],
      kk: ["Жарысты өткізуге арналған жабдықтар немесе қызметтер", "Кәсіби тәжірибе немесе қызмет"],
    },
    youGet: {
      ru: ["Логотип на сайте и баннерах", "Упоминание как технического партнёра", "Стартовые слоты для команды"],
      en: ["Logo on the website and banners", "Mention as technical partner", "Start slots for your team"],
      kk: ["Сайт пен баннерлердегі логотип", "Техникалық серіктес ретінде атап өту", "Командаға старт слоттары"],
    },
  },
  {
    id: "prize",
    name: { ru: "Призовой партнёр", en: "Prize Partner", kk: "Сыйлық серіктес" },
    description: {
      ru: "Ваша продукция попадает прямо в руки участников — это один из самых эффективных форматов для product-бренда.",
      en: "Your products go directly into the hands of participants — one of the most effective formats for a product brand.",
      kk: "Өніміңіз тікелей қатысушылардың қолына тиеді — бұл product-брендке арналған тиімді форматтардың бірі.",
    },
    youGive: {
      ru: ["Призы для победителей дистанций", "Продукция для стартовых пакетов участников"],
      en: ["Prizes for distance winners", "Products for participant start kits"],
      kk: ["Дистанция жеңімпаздарына сыйлықтар", "Қатысушылардың старт пакеттеріне арналған өнімдер"],
    },
    youGet: {
      ru: ["Логотип на сайте и в соцсетях", "Упоминание в эфире на старте и финише", "Прямой контакт с аудиторией"],
      en: ["Logo on the website and social media", "MC mentions at start and finish", "Direct contact with the audience"],
      kk: ["Сайт пен әлеуметтік желідегі логотип", "Старт пен финиште диктор атап өту", "Аудиториямен тікелей байланыс"],
    },
  },
  {
    id: "media",
    name: { ru: "Медиа-партнёр", en: "Media Partner", kk: "Медиа серіктес" },
    description: {
      ru: "Взаимный обмен аудиторией: вы освещаете наши события, мы продвигаем вашу площадку.",
      en: "Mutual audience exchange: you cover our events, we promote your platform.",
      kk: "Өзара аудитория алмасу: сіз іс-шараларымызды жазасыз, біз алаңыңызды ілгерілетеміз.",
    },
    youGive: {
      ru: ["Публикации и репортажи о событии", "Фото- или видеосъёмка"],
      en: ["Publications and reports about the event", "Photo or video coverage"],
      kk: ["Іс-шара туралы жарияланымдар мен репортаждар", "Фото немесе бейне түсіру"],
    },
    youGet: {
      ru: ["Логотип на сайте", "Взаимные кросс-публикации", "Эксклюзивный контент с события"],
      en: ["Logo on the website", "Mutual cross-posts", "Exclusive event content"],
      kk: ["Сайттағы логотип", "Өзара кросс-жарияланымдар", "Іс-шарадан эксклюзивті контент"],
    },
  },
];

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
