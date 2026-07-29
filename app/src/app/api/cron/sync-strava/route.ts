import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStravaActivities, refreshStravaToken } from "@/lib/strava";

// Античит-константы (из положения «21 день бега»)
const MIN_DISTANCE_M = 2000;        // минимум 2 км
const MIN_PACE_SEC_PER_KM = 240;    // быстрее 4:00/км — подозрительно
const MAX_PACE_SEC_PER_KM = 480;    // медленнее 8:00/км — не бег
const MAX_PAUSE_SEC = 600;          // разница elapsed/moving > 10 мин — пауза

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // Все активные челленджи: окно уже началось (dateISO <= now) и ещё не закончилось
  const activeEvents = await prisma.event.findMany({
    where: {
      race: { isChallenge: true },
      dateISO: { lte: now },
      challengeWindowEnd: { gte: now },
      isPublished: true,
    },
    select: {
      id: true,
      dateISO: true,
      challengeWindowEnd: true,
      registrations: {
        where: { status: "PAID" },
        select: {
          id: true,
          user: {
            select: {
              stravaAthleteId: true,
              stravaAccessToken: true,
              stravaRefreshToken: true,
              stravaTokenExpiresAt: true,
              id: true,
            },
          },
        },
      },
    },
  });

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const event of activeEvents) {
    for (const reg of event.registrations) {
      const u = reg.user;
      if (!u.stravaAthleteId || !u.stravaAccessToken || !u.stravaRefreshToken) {
        skipped++;
        continue;
      }

      try {
        let accessToken = u.stravaAccessToken;

        // Рефрешим токен если истёк (с запасом 5 минут)
        if (u.stravaTokenExpiresAt && u.stravaTokenExpiresAt.getTime() < now.getTime() + 5 * 60 * 1000) {
          const refreshed = await refreshStravaToken(u.stravaRefreshToken);
          if (!refreshed) { errors++; continue; }
          accessToken = refreshed.access_token;
          await prisma.user.update({
            where: { id: u.id },
            data: {
              stravaAccessToken: refreshed.access_token,
              stravaRefreshToken: refreshed.refresh_token,
              stravaTokenExpiresAt: new Date(refreshed.expires_at * 1000),
            },
          });
        }

        const activities = await fetchStravaActivities(
          accessToken,
          event.dateISO,
          event.challengeWindowEnd!,
        );

        for (const act of activities) {
          if (act.type !== "Run") continue;
          if (act.distance < MIN_DISTANCE_M) continue;

          const distanceKm = act.distance / 1000;
          const avgPaceSecPerKm = act.average_speed > 0 ? 1000 / act.average_speed : 9999;
          const hasGps = !!(act.map?.summary_polyline);
          const pauseSec = Math.abs(act.elapsed_time - act.moving_time);

          let isValid = true;
          let invalidReason: string | null = null;

          if (!hasGps) {
            isValid = false;
            invalidReason = "no_gps";
          } else if (avgPaceSecPerKm < MIN_PACE_SEC_PER_KM) {
            isValid = false;
            invalidReason = "pace_too_fast";
          } else if (avgPaceSecPerKm > MAX_PACE_SEC_PER_KM) {
            isValid = false;
            invalidReason = "pace_too_slow";
          } else if (pauseSec > MAX_PAUSE_SEC) {
            isValid = false;
            invalidReason = "too_much_pause";
          }

          await prisma.challengeActivity.upsert({
            where: { stravaActivityId: String(act.id) },
            create: {
              registrationId: reg.id,
              stravaActivityId: String(act.id),
              distanceKm,
              movingTimeSec: act.moving_time,
              elapsedTimeSec: act.elapsed_time,
              avgPaceSecPerKm,
              hasGps,
              startedAt: new Date(act.start_date),
              isValid,
              invalidReason,
            },
            update: {
              distanceKm,
              movingTimeSec: act.moving_time,
              elapsedTimeSec: act.elapsed_time,
              avgPaceSecPerKm,
              hasGps,
              isValid,
              invalidReason,
              fetchedAt: now,
            },
          });

          synced++;
        }
      } catch (err) {
        errors++;
        const msg = err instanceof Error ? err.message : String(err);
        errorDetails.push(`reg:${reg.id.slice(-6)} – ${msg}`);
      }
    }
  }

  return NextResponse.json({ activeEvents: activeEvents.length, synced, skipped, errors, errorDetails });
}
