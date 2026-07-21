import type { getSeriesSeason } from "./queries";

type Season = NonNullable<Awaited<ReturnType<typeof getSeriesSeason>>>;

export type LeaderboardEntry = {
  key: string; // userId если известен, иначе name
  name: string;
  userId: string | null;
  stagesCount: number;
  totalSeconds: number; // сумма времён для тайбрейка
  stages: { stageOrder: number; place: number | null; time: string | null }[];
};

// "3:42:15" → секунды; null если не распознать
export function parseTimeToSeconds(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function buildLeaderboard(season: Season): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();

  for (const sr of season.seriesRaces) {
    const event = sr.race.events[0];
    if (!event) continue;

    for (const result of event.results) {
      const userId = result.registration?.userId ?? null;
      const key = userId ?? result.name.trim().toLowerCase();

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          name: result.name,
          userId,
          stagesCount: 0,
          totalSeconds: 0,
          stages: [],
        };
        map.set(key, entry);
      }

      entry.stagesCount += 1;
      entry.totalSeconds += parseTimeToSeconds(result.time);
      entry.stages.push({ stageOrder: sr.stageOrder, place: result.place, time: result.time });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.stagesCount !== a.stagesCount) return b.stagesCount - a.stagesCount;
    return a.totalSeconds - b.totalSeconds; // меньше времени = лучше
  });
}

export function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
