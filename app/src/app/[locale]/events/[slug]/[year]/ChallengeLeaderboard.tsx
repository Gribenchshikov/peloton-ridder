import { publicAssetUrl } from "@/lib/publicAssetUrl";

type LeaderboardRow = {
  place: number;
  registrationId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  totalKm: number;
  activityCount: number;
};

function formatKm(km: number) {
  return km.toFixed(1);
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function ChallengeLeaderboard({
  rows,
  windowEnd,
}: {
  rows: LeaderboardRow[];
  windowEnd: Date;
}) {
  const now = new Date();
  const isActive = now < windowEnd;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-ink">Турнирная таблица</h2>
        {isActive && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            идёт
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
          Результаты появятся после начала соревнования.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-bold uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Участник</th>
                <th className="px-4 py-3 text-right">Км</th>
                <th className="px-4 py-3 text-right">Активностей</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.registrationId}
                  className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-ink-faint">
                    {MEDAL[row.place] ?? row.place}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {row.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicAssetUrl(row.avatarUrl.replace(/^http:\/\//, "https://")) ?? row.avatarUrl.replace(/^http:\/\//, "https://")}
                          alt=""
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink-faint">
                          {row.firstName[0]}{row.lastName[0]}
                        </div>
                      )}
                      <span className="font-semibold text-ink">
                        {row.firstName} {row.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">
                    {formatKm(row.totalKm)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-faint">
                    {row.activityCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-ink-faint">
        Обновляется автоматически раз в час. Засчитываются только активности типа «Бег» в Strava.
      </p>
    </section>
  );
}
