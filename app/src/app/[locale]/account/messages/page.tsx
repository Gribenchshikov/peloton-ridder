import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { listUserMessages, markUserMessagesRead, parseUserMessagePayload } from "@/lib/userMessages";
import { MessagesInbox } from "../MessagesInbox";
import { MessagesPagination } from "../MessagesPagination";

function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export default async function AccountMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  const requestedPage = parsePage(pageParam);
  const { items, total, page, pageCount } = await listUserMessages(session.user.id, requestedPage);
  const unreadIds = items.filter((row) => row.readAt == null).map((row) => row.id);
  if (unreadIds.length > 0) {
    await markUserMessagesRead(session.user.id, unreadIds);
  }
  const readAt = new Date().toISOString();

  const messages = items.map((row) => ({
    id: row.id,
    type: row.type,
    payload: parseUserMessagePayload(row.payload),
    readAt: row.readAt?.toISOString() ?? readAt,
    createdAt: row.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <MessagesInbox messages={messages} />
      <MessagesPagination page={page} pageCount={pageCount} total={total} />
    </div>
  );
}
