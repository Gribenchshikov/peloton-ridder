type AgeBounds = { minAge: number | null; maxAge: number | null };

export function ageLabelKey(distance: AgeBounds): { key: "ageRange" | "ageFrom"; params: Record<string, number> } | null {
  if (distance.minAge && distance.maxAge) {
    return { key: "ageRange", params: { min: distance.minAge, max: distance.maxAge } };
  }
  if (distance.minAge) {
    return { key: "ageFrom", params: { min: distance.minAge } };
  }
  return null;
}

export function groupDistancesByDiscipline<T extends { discipline: string | null }>(distances: T[]) {
  const disciplines = [...new Set(distances.map((d) => d.discipline).filter(Boolean))] as string[];
  const noDiscipline = distances.filter((d) => !d.discipline);
  return { disciplines, noDiscipline };
}
