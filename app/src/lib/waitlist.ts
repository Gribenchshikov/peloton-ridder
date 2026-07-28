import { prisma } from "@/lib/prisma";
import { sendWaitlistSlotAvailableEmail } from "@/lib/mailer";
import { buildAppUrl } from "@/lib/url";

export async function notifyWaitlistForDistance(distanceId: string) {
  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
    select: {
      name: true,
      event: {
        select: {
          year: true,
          race: { select: { name: true, slug: true } },
        },
      },
      waitlist: {
        orderBy: { createdAt: "asc" },
        select: {
          user: { select: { email: true, firstName: true } },
        },
      },
    },
  });

  if (!distance || distance.waitlist.length === 0) return;

  const registerUrl = buildAppUrl(`/ru/events/${distance.event.race.slug}/${distance.event.year}/register`);

  await Promise.all(
    distance.waitlist.map((w) =>
      sendWaitlistSlotAvailableEmail(
        w.user.email,
        w.user.firstName,
        distance.event.race.name,
        distance.name,
        registerUrl,
      )
    )
  );
}
