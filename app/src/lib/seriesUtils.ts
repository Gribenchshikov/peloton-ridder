import type { getSeriesSeason } from "./queries";

type Season = NonNullable<Awaited<ReturnType<typeof getSeriesSeason>>>;

export type LeaderboardEntry = {
  key: string; // userId если известен, иначе name
  name: string;
  userId: string | null;
  stagesCount: number;
  scoredStages: number;
  totalSeconds: number; // сумма известных времён
  stages: { stageOrder: number; place: number | null; time: string | null }[];
};

// "3:42:15" → секунды; 0 если не распознать
export function parseTimeToSeconds(time: string | null | undefined): number {
  if (!time) return 0;
  const parts = time.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function hasScoredResult(place: number | null, time: string | null): boolean {
  return place != null || Boolean(time?.trim());
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
          scoredStages: 0,
          totalSeconds: 0,
          stages: [],
        };
        map.set(key, entry);
      }

      entry.stagesCount += 1;
      if (hasScoredResult(result.place, result.time)) entry.scoredStages += 1;
      entry.totalSeconds += parseTimeToSeconds(result.time);
      entry.stages.push({ stageOrder: sr.stageOrder, place: result.place, time: result.time });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.scoredStages !== a.scoredStages) return b.scoredStages - a.scoredStages;
    const aTimed = a.totalSeconds > 0;
    const bTimed = b.totalSeconds > 0;
    if (aTimed !== bTimed) return aTimed ? -1 : 1;
    if (aTimed) return a.totalSeconds - b.totalSeconds;
    if (b.stagesCount !== a.stagesCount) return b.stagesCount - a.stagesCount;
    return a.name.localeCompare(b.name, "ru");
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
