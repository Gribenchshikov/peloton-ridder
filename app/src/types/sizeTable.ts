export type SizeRow = { size: string; chest: string; waist: string; hip: string };

export const DEFAULT_SIZE_ROWS: SizeRow[] = [
  { size: "XS",  chest: "80–84",   waist: "62–66", hip: "86–90"  },
  { size: "S",   chest: "84–88",   waist: "66–70", hip: "90–94"  },
  { size: "M",   chest: "88–92",   waist: "70–74", hip: "94–98"  },
  { size: "L",   chest: "92–96",   waist: "74–78", hip: "98–102" },
  { size: "XL",  chest: "96–100",  waist: "78–82", hip: "102–106" },
  { size: "XXL", chest: "100–108", waist: "82–90", hip: "106–114" },
];

export function parseSizeTable(raw: string | null | undefined): SizeRow[] {
  if (!raw) return DEFAULT_SIZE_ROWS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as SizeRow[];
  } catch { /* ignore */ }
  return DEFAULT_SIZE_ROWS;
}
