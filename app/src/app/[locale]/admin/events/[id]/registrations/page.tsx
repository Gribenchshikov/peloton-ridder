import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventWithRegistrations } from "@/lib/queries";
import { confirmPendingPaidInvoices, repairPaidInvoiceDates } from "@/lib/apipay";
import {
  repairStalePaidSlotRefunds,
  restorePaidSlotAfterTransferRefund,
  restorePaidTransferAfterSlotRefund,
  retrySkippedRefundPayouts,
} from "@/lib/refundPayout";
import { RegistrationsView } from "./RegistrationsView";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/events/${id}/registrations`);

  await confirmPendingPaidInvoices(id);
  await repairPaidInvoiceDates({ eventId: id });
  await repairStalePaidSlotRefunds(id);
  await restorePaidSlotAfterTransferRefund(id);
  await restorePaidTransferAfterSlotRefund(id);
  await retrySkippedRefundPayouts();
  const event = await getEventWithRegistrations(id);
  if (!event) notFound();

  return <RegistrationsView event={event} />;
}
