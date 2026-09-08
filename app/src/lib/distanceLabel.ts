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

export function heroDistanceStats<T extends { name: string; km: number; discipline: string | null }>(
  distances: T[],
): { label: string; kmLabel: string }[] {
  const map = new Map<string, number[]>();
  for (const d of distances) {
    const key = (d.discipline?.trim() || d.name).trim();
    const kms = map.get(key) ?? [];
    if (d.km > 0 && !kms.includes(d.km)) kms.push(d.km);
    map.set(key, kms);
  }
  return [...map.entries()].map(([label, kms]) => ({
    label,
    kmLabel: kms.length ? `${[...kms].sort((a, b) => a - b).join(" / ")} км` : "—",
  }));
}
