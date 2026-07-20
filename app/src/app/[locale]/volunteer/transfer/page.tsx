import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { Scanner } from "./Scanner";

export default async function VolunteerTransferPage() {
  const userId = await requireUserId();
  const locale = await getLocale();

  if (!userId) {
    redirect({ href: { pathname: "/login", query: { callbackUrl: "/volunteer/transfer" } }, locale });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVolunteer: true, isAdmin: true, firstName: true },
  });

  if (!user?.isVolunteer && !user?.isAdmin) {
    redirect({ href: "/", locale });
    return;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ember">Волонтёр · Трансфер</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">Сканер QR-кодов</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Привет, {user.firstName}. Отсканируйте QR-код участника для отметки посадки на трансфер.
        </p>
      </div>
      <Scanner />
    </main>
  );
}
