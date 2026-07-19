export type AidStationType = "water" | "food" | "checkpoint";

export type AidStation = {
  name: string;
  km: number;
  type: AidStationType;
  cutoffMinutes?: number;
};
