export type ItraResultRow = {
  bibNumber: number;
  name: string;
  place: number | null;
  time: string | null;
  category: string | null;
};

export type ItraParseResult =
  | { rows: ItraResultRow[] }
  | { error: "empty_file" | "invalid" | "no_rows" };

type XlsxModule = {
  read: (data: Buffer, opts: { type: "buffer" }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown, opts: { header: 1; raw: false }) => unknown[][];
  };
};

function xlsxModule(loaded: XlsxModule & { default?: XlsxModule }): XlsxModule {
  return typeof loaded.read === "function" ? loaded : loaded.default ?? loaded;
}

// Тот же контракт, что у прежнего вызова XLSX.read + sheet_to_json({ header: 1, raw: false }):
// первая строка — заголовки, значения — уже отформатированный текст ячеек.
function isXlsxZip(buffer: Buffer) {
  // ITRA присылает OOXML (.xlsx) — это ZIP. Не отдаём в парсер HTML, CSV и старый BIFF,
  // формат которых SheetJS умеет угадывать сам.
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export async function readItraSheet(buffer: Buffer): Promise<unknown[][]> {
  if (!isXlsxZip(buffer)) {
    throw new Error("ITRA file is not an xlsx workbook");
  }
  const loaded = (await import("xlsx")) as XlsxModule & { default?: XlsxModule };
  const XLSX = xlsxModule(loaded);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
}

export function parseItraRows(rawRows: unknown[]): ItraParseResult {
  if (rawRows.length < 2) return { error: "empty_file" };

  const headers = (rawRows[0] as string[]).map((h) => String(h ?? "").trim().toLowerCase());
  const col = (name: string) => headers.findIndex((h) => h.includes(name));

  const idxRanking = col("ranking");
  const idxTime = col("time");
  const idxFamily = col("family");
  const idxFirst = col("first");
  const idxGender = col("gender");
  const idxNat = col("nationality");
  const idxBib = col("bib");

  if (idxBib === -1 || idxFamily === -1) return { error: "invalid" };

  const rows: ItraResultRow[] = [];

  for (const raw of rawRows.slice(1) as string[][]) {
    const bib = Number(raw[idxBib]);
    if (!bib || isNaN(bib)) continue;

    const family = String(raw[idxFamily] ?? "").trim();
    const first = String(raw[idxFirst] ?? "").trim();
    const name = [family, first].filter(Boolean).join(" ");

    const place = idxRanking !== -1 ? (Number(raw[idxRanking]) || null) : null;
    const time = idxTime !== -1 ? (String(raw[idxTime] ?? "").trim() || null) : null;

    const gender = idxGender !== -1 ? String(raw[idxGender] ?? "").trim() : "";
    const nat = idxNat !== -1 ? String(raw[idxNat] ?? "").trim() : "";
    const category = [gender, nat].filter(Boolean).join(" · ") || null;

    rows.push({ bibNumber: bib, name, place, time, category });
  }

  if (rows.length === 0) return { error: "no_rows" };
  return { rows };
}
