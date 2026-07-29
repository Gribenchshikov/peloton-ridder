export type PhotoLink = { url: string; label: string; coverUrl?: string };
export type DayProgramItem = { time: string; description: string };
export type DistanceEquipment = {
  [distanceId: string]: {
    required: string[];
    recommended: string[];
    customItems?: { key: string; label: string }[];
  };
};

export const EQUIPMENT_ITEMS = [
  { key: "race_number",       label: "Регистрационный номер",                      category: "Базовое" },
  { key: "emergency_blanket", label: "Термоодеяло (спасательное)",                category: "Безопасность" },
  { key: "whistle",           label: "Свисток",                                   category: "Безопасность" },
  { key: "first_aid",         label: "Аптечка первой помощи",                     category: "Безопасность" },
  { key: "headlamp",          label: "Налобный фонарь + запасные батарейки",      category: "Безопасность" },
  { key: "phone",             label: "Заряженный телефон (> 50%)",                category: "Безопасность" },
  { key: "map",               label: "Карта маршрута",                            category: "Навигация" },
  { key: "water_1l",          label: "Запас воды мин. 1 л",                       category: "Питание" },
  { key: "water_1_5l",        label: "Запас воды мин. 1.5 л",                     category: "Питание" },
  { key: "water_2l",          label: "Запас воды мин. 2 л",                       category: "Питание" },
  { key: "food_emergency",    label: "Аварийный паёк / питание на трассе",        category: "Питание" },
  { key: "cup",               label: "Складной стакан",                           category: "Питание" },
  { key: "rain_jacket",       label: "Ветро- и дождезащитная куртка",             category: "Одежда" },
  { key: "warm_layer",        label: "Тёплый слой (флис / лёгкая пуховка)",       category: "Одежда" },
  { key: "gloves",            label: "Перчатки",                                  category: "Одежда" },
  { key: "warm_hat",          label: "Тёплый головной убор",                      category: "Одежда" },
  { key: "sun_hat",           label: "Кепка / солнцезащитный головной убор",      category: "Одежда" },
  { key: "gaiters",           label: "Гетры / гамаши",                            category: "Одежда" },
  { key: "trail_shoes",       label: "Трейловые кроссовки с протектором",         category: "Обувь" },
  { key: "trail_socks",       label: "Трейловые носки",                           category: "Обувь" },
  { key: "hydration_pack",    label: "Гидратационный рюкзак (мин. 5 л)",          category: "Снаряжение" },
  { key: "trekking_poles",    label: "Палки треккинговые",                        category: "Снаряжение" },
  { key: "sunscreen",         label: "Солнцезащитный крем SPF 30+",               category: "Защита" },
] as const;

export type EquipmentKey = (typeof EQUIPMENT_ITEMS)[number]["key"];
