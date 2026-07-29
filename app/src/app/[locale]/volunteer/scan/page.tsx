import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ScannerView } from "./ScannerView";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVolunteer: true, isOperator: true },
  });

  if (!user?.isAdmin && !user?.isVolunteer && !user?.isOperator) {
    return redirect({ href: "/", locale });
  }

  const events = await prisma.event.findMany({
    where: { status: { in: ["OPEN", "CLOSED", "COMPLETED"] } },
    orderBy: { dateISO: "desc" },
    take: 10,
    select: { id: true, year: true, race: { select: { name: true } } },
  });

  const formattedEvents = events.map((e) => ({
    id: e.id,
    label: `${e.race.name} ${e.year}`,
  }));

  return <ScannerView events={formattedEvents} />;
}
