/** Активная запись пользователя: оплачено либо незавершённая заявка. */
export function activeRegistrationOrDraftWhere(now = new Date()) {
  return {
    OR: [
      { status: "PAID" as const },
      { status: "RESERVED" as const, reservedUntil: { gt: now } },
      { status: "RESERVED" as const, reservedUntil: null },
    ],
  };
}

/**
 * Кто занимает место в лимите дистанции.
 * Платный забег — только оплаченные. Мероприятие — ещё и бронь без оплаты.
 */
export function capacityTakenWhere(holdsUnpaidReservation: boolean, now = new Date()) {
  if (holdsUnpaidReservation) return activeRegistrationOrDraftWhere(now);
  return { status: "PAID" as const };
}
