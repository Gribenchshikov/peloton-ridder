import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { countUnreadUserMessages } from "@/lib/userMessages";
import { repairUserStalePaidSlotRefunds, restorePaidSlotAfterTransferRefund } from "@/lib/refundPayout";
import { AccountHeader } from "./AccountHeader";
import { AccountNav } from "./AccountNav";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  await repairUserStalePaidSlotRefunds(session.user.id);
  await restorePaidSlotAfterTransferRefund(undefined, session.user.id);
  const [user, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, avatarUrl: true, isAdmin: true },
    }),
    countUnreadUserMessages(session.user.id),
  ]);
  if (!user) {
    return redirect({ href: "/login", locale });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <AccountHeader
        name={`${user.firstName} ${user.lastName}`}
        isAdmin={user.isAdmin}
        avatarUrl={user.avatarUrl}
      />
      <AccountNav unreadCount={unreadCount} />
      <div className="mt-8">{children}</div>
    </main>
  );
}
