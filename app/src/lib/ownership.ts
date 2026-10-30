/** Чужая запись и анонимный запрос не проходят. Отсутствие прав снаружи выглядит как «не найдено». */
export function ownsRegistration(actorId: string | null | undefined, ownerId: string | null | undefined): boolean {
  return typeof actorId === "string" && actorId.length > 0 && actorId === ownerId;
}

export function distanceBelongsToEvent(
  distance: { eventId: string } | null | undefined,
  eventId: string,
): boolean {
  return Boolean(distance) && distance!.eventId === eventId;
}
