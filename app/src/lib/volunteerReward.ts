/** Порог из настройки сайта. Ноль и мусор не открывают награду. */
export function volunteerThreshold(raw: string | null | undefined): number {
  const value = Number(raw ?? 3);
  if (!Number.isInteger(value) || value < 1) return 3;
  return value;
}

export function canClaimVolunteerReward(input: {
  isVolunteer: boolean;
  alreadyClaimed: boolean;
  credited: number;
  threshold: number;
}): "ok" | "not_volunteer" | "already_claimed" | "not_reached" {
  if (!input.isVolunteer) return "not_volunteer";
  if (input.alreadyClaimed) return "already_claimed";
  if (input.credited < input.threshold) return "not_reached";
  return "ok";
}
