export type ParticipantRule = {
  label: string;
  minAge: number | null;
  maxAge: number | null;
};

export function parseParticipantRules(raw: unknown): ParticipantRule[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((r) => ({
    label: typeof r.label === "string" ? r.label : "",
    minAge: typeof r.minAge === "number" ? r.minAge : null,
    maxAge: typeof r.maxAge === "number" ? r.maxAge : null,
  }));
}

export function calcAge(birthDate: Date, referenceDate: Date): number {
  return Math.floor((referenceDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
