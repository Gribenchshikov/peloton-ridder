import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventForAdmin } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { EventEditView } from "./EventEditView";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ wizard?: string }>;
}) {
  const { locale, id } = await params;
  const { wizard } = await searchParams;
  await requireAdminPage(locale, `/admin/events/${id}`);

  const [event, allPartners] = await Promise.all([
    getEventForAdmin(id),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!event) notFound();

  const wizardStep = wizard === "2" ? "2" : wizard === "3" ? "3" : undefined;
  return <EventEditView event={event} allPartners={allPartners} wizard={wizardStep} locale={locale} />;
}
