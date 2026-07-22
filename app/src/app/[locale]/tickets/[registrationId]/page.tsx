import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ locale: string; registrationId: string }>;
}) {
  const { locale, registrationId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: `/tickets/${registrationId}` } }, locale });
  }

  const [t, reg] = await Promise.all([
    getTranslations("Ticket"),
    prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        userId: true,
        status: true,
        bibNumber: true,
        distance: { select: { name: true, km: true } },
        event: {
          select: {
            year: true,
            dateISO: true,
            location: true,
            race: { select: { name: true } },
          },
        },
        user: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  if (!reg || reg.userId !== session.user.id) notFound();
  if (reg.status !== "PAID") {
    return redirect({ href: `/pay/${registrationId}`, locale });
  }

  const qrData = `RIDDER:${registrationId}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 240, margin: 1 });

  const rawCode = reg.id.slice(-6).toUpperCase();
  const shortCode = `${rawCode.slice(0, 3)}-${rawCode.slice(3)}`;

  const dateStr = new Intl.DateTimeFormat("ru", {
    day: "numeric", month: "long", year: "numeric",
  }).format(reg.event.dateISO);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-16">
      <div className="w-full overflow-hidden rounded-[var(--radius-l)] border border-border bg-surface shadow-sm">
        {/* Header */}
        <div className="bg-ember px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">{t("eyebrow")}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{reg.event.race.name} {reg.event.year}</h1>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-3 border-b border-border px-6 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR-код билета" className="h-48 w-48" />
          <p className="text-xs text-ink-faint">{t("qrHint")}</p>
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <span className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">{t("shortCodeLabel")}</span>
            <span className="font-mono text-2xl font-extrabold tracking-widest text-ink">{shortCode}</span>
            <span className="text-[0.65rem] text-ink-faint">{t("shortCodeHint")}</span>
          </div>
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-6">
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldBib")}</dt>
            <dd className="mt-0.5 font-display text-3xl font-extrabold text-ember">#{reg.bibNumber}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldName")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{reg.user.firstName} {reg.user.lastName}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldDistance")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{reg.distance?.name ?? "Трансфер"}{reg.distance ? ` · ${reg.distance.km} km` : ""}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldDate")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{dateStr}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-ink-faint">{t("fieldLocation")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{reg.event.location}</dd>
          </div>
        </dl>

        <div className="border-t border-border px-6 py-4 text-center text-xs text-ink-faint">
          {t("footer", { id: reg.id.slice(-8).toUpperCase() })}
        </div>
      </div>
    </main>
  );
}
