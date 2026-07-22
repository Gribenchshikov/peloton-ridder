import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { PrintButton } from "./PrintButton";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; resultId: string }>;
}) {
  const { locale, resultId } = await params;
  const t = await getTranslations({ locale, namespace: "Certificate" });
  const format = await getFormatter({ locale });

  const result = await prisma.result.findUnique({
    where: { id: resultId },
    select: {
      id: true,
      name: true,
      place: true,
      time: true,
      category: true,
      bibNumber: true,
      registrationId: true,
      registration: {
        select: {
          userId: true,
          distance: { select: { name: true, km: true } },
        },
      },
      event: {
        select: {
          year: true,
          dateISO: true,
          location: true,
          race: { select: { name: true, color: true } },
        },
      },
    },
  });

  if (!result) notFound();

  // Access: if linked to registration — only that user or admin; otherwise public
  if (result.registrationId) {
    const session = await auth();
    const isOwner = session?.user?.id && result.registration?.userId === session.user.id;
    const isAdmin = session?.user?.isAdmin;
    if (!isOwner && !isAdmin) notFound();
  }

  const raceName = `${result.event.race.name} ${result.event.year}`;
  const distanceName = result.registration?.distance
    ? `${result.registration.distance.name} · ${result.registration.distance.km} км`
    : null;
  const dateStr = format.dateTime(result.event.dateISO, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const accentColor = result.event.race.color ?? "#E2531F";

  const placeLabel = result.place
    ? result.place === 1
      ? "🥇 1"
      : result.place === 2
        ? "🥈 2"
        : result.place === 3
          ? "🥉 3"
          : String(result.place)
    : null;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>

      {/* Nav — hidden on print */}
      <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-6 py-4 print:hidden">
        <Link href="/account" className="text-sm font-semibold text-ink-faint hover:text-ink">
          ← {t("backCta")}
        </Link>
        <PrintButton label={t("printCta")} />
      </div>

      {/* Certificate */}
      <main
        className="mx-auto flex min-h-[200mm] max-w-[280mm] flex-col items-center justify-between px-12 py-10 print:mx-0 print:max-w-none print:px-16 print:py-14"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {/* Top accent bar */}
        <div className="w-full" style={{ height: 6, backgroundColor: accentColor, borderRadius: 3 }} />

        {/* Header */}
        <div className="mt-8 flex w-full items-center justify-between">
          <span
            className="font-sans text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: accentColor }}
          >
            Peloton Ridder
          </span>
          <span className="font-sans text-xs text-ink-faint">{dateStr}</span>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
          <p className="font-sans text-sm font-bold uppercase tracking-[0.25em] text-ink-soft">
            {t("eyebrow")}
          </p>

          <h1
            className="font-display leading-tight text-ink"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800 }}
          >
            {result.name}
          </h1>

          <p className="max-w-sm font-sans text-base text-ink-soft">
            {t("completedText")}{" "}
            <strong className="text-ink">{raceName}</strong>
          </p>

          {distanceName && (
            <p className="font-sans text-sm text-ink-soft">{distanceName}</p>
          )}

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap justify-center gap-10">
            {result.time && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="font-display text-3xl font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  {result.time}
                </span>
                <span className="font-sans text-xs uppercase tracking-widest text-ink-faint">
                  {t("timeLabel")}
                </span>
              </div>
            )}
            {placeLabel && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="font-display text-3xl font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  {placeLabel}
                </span>
                <span className="font-sans text-xs uppercase tracking-widest text-ink-faint">
                  {t("placeLabel")}
                </span>
              </div>
            )}
            {result.bibNumber && (
              <div className="flex flex-col items-center gap-1">
                <span
                  className="font-display text-3xl font-bold tabular-nums"
                  style={{ color: accentColor }}
                >
                  #{result.bibNumber}
                </span>
                <span className="font-sans text-xs uppercase tracking-widest text-ink-faint">
                  {t("bibLabel")}
                </span>
              </div>
            )}
          </div>

          {result.category && (
            <p className="font-sans text-sm text-ink-faint">{t("categoryLabel")}: {result.category}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex w-full items-end justify-between">
          <div>
            {result.event.location && (
              <p className="font-sans text-xs text-ink-faint">{result.event.location}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-sans text-xs text-ink-faint">ridder.run</p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="mt-6 w-full" style={{ height: 3, backgroundColor: accentColor, borderRadius: 2, opacity: 0.4 }} />
      </main>
    </>
  );
}
