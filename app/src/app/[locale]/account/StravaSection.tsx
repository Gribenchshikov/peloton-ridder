import { disconnectStravaAction } from "./disconnectStravaAction";

export function StravaSection({
  stravaAthleteId,
  stravaAthleteName,
  status,
}: {
  stravaAthleteId?: string | null;
  stravaAthleteName?: string | null;
  status?: string;
}) {
  return (
    <div className="mt-10 flex flex-col gap-4 border-t border-border pt-10">
      <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">Strava</div>

      {stravaAthleteId ? (
        <div className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FC4C02" aria-hidden="true">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-ink">
                {stravaAthleteName ?? "Strava подключена"}
              </p>
              <p className="text-xs text-ink-faint">Athlete ID: {stravaAthleteId}</p>
            </div>
          </div>
          <form action={disconnectStravaAction}>
            <button
              type="submit"
              className="text-xs text-ink-faint underline decoration-dotted hover:text-danger transition-colors"
            >
              Отключить Strava
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {status === "denied" && (
            <p className="text-sm text-ink-faint">Подключение отменено.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-danger">Ошибка подключения. Попробуйте ещё раз.</p>
          )}
          {status === "connected" && (
            <p className="text-sm text-spruce">Strava успешно подключена!</p>
          )}
          <a
            href="/api/strava/connect"
            className="inline-flex items-center gap-2 self-start rounded-[var(--radius-s)] bg-[#FC4C02] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Подключить Strava
          </a>
        </div>
      )}
    </div>
  );
}
