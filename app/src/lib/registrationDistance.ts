type DistanceRef = { id?: string; name?: string } | null | undefined;

export function resolveRegistrationDistance<D extends { id: string; name: string }>(
  reg: { distance?: DistanceRef; distanceId?: string | null },
  distances: readonly D[],
): D | null {
  if (reg.distance?.name) {
    const nestedId = reg.distance.id;
    if (nestedId) {
      const match = distances.find((d) => d.id === nestedId);
      if (match) return { ...match, ...reg.distance, id: nestedId, name: reg.distance.name } as D;
    }
    return reg.distance as D;
  }
  const id = reg.distanceId ?? reg.distance?.id ?? null;
  if (!id) return null;
  return distances.find((d) => d.id === id) ?? null;
}

export function registrationDistanceLabel(
  reg: { distance?: DistanceRef; distanceId?: string | null },
  distances: readonly { id: string; name: string }[],
): string {
  return resolveRegistrationDistance(reg, distances)?.name ?? "—";
}

export function withResolvedRegistrationDistances<
  T extends {
    distances: readonly { id: string; name: string }[];
    registrations: readonly { distance?: DistanceRef; distanceId?: string | null }[];
  },
>(event: T): T {
  return {
    ...event,
    registrations: event.registrations.map((reg) => ({
      ...reg,
      distance: resolveRegistrationDistance(reg, event.distances),
    })),
  } as T;
}
