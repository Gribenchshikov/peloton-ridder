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
    select: { isAdmin: true, isVolunteer: true },
  });

  if (!user?.isAdmin && !user?.isVolunteer) {
    return redirect({ href: "/", locale });
  }

  return <ScannerView />;
}
