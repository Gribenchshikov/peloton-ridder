const SEP = ";";

const CP1251_EXTRA: Record<number, number> = {
  0x0401: 0xa8, // Ё
  0x0451: 0xb8, // ё
  0x2116: 0xb9, // №
  0x00a0: 0xa0,
  0x00a7: 0xa7,
  0x00a9: 0xa9,
  0x00ab: 0xab,
  0x00ae: 0xae,
  0x00b0: 0xb0,
  0x00b7: 0xb7,
  0x00bb: 0xbb,
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2026: 0x85, // …
};

const CP1251_REPLACE: Record<number, string> = {
  0x20b8: "тг", // ₸
  0x2713: "+", // ✓
  0x2714: "+",
};

export function toCsv(rows: (string | number)[][]): string {
  const lines = rows.map((row) =>
    row
      .map((cell) => {
        const s = String(cell);
        return s.includes(SEP) || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(SEP),
  );
  return `sep=${SEP}\r\n` + lines.join("\r\n");
}

export function csvWindows1251Bytes(csv: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < csv.length; i++) {
    const code = csv.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
      continue;
    }
    if (code >= 0x0410 && code <= 0x044f) {
      out.push(code - 0x0410 + 0xc0);
      continue;
    }
    const extra = CP1251_EXTRA[code];
    if (extra !== undefined) {
      out.push(extra);
      continue;
    }
    const repl = CP1251_REPLACE[code];
    if (repl) {
      const encoded = csvWindows1251Bytes(repl);
      for (let j = 0; j < encoded.length; j++) out.push(encoded[j]);
      continue;
    }
    out.push(0x3f);
  }
  return Uint8Array.from(out);
}

export function csvDownloadHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=windows-1251",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
