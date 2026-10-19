import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";

const A4 = { width: 595.28, height: 841.89 };
const ember = rgb(226 / 255, 83 / 255, 31 / 255);
const spruce = rgb(41 / 255, 71 / 255, 59 / 255);
const ink = rgb(28 / 255, 35 / 255, 31 / 255);
const inkSoft = rgb(78 / 255, 90 / 255, 79 / 255);
const inkFaint = rgb(138 / 255, 136 / 255, 117 / 255);
const surface = rgb(251 / 255, 248 / 255, 241 / 255);
const border = rgb(222 / 255, 210 / 255, 184 / 255);
const white = rgb(1, 1, 1);

export type TicketPdfField = {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  span2?: boolean;
};

export type TicketPdfInput = {
  eyebrow: string;
  title: string;
  headerColor: "ember" | "spruce";
  qrPayload: string;
  qrHint: string;
  shortCodeLabel: string;
  shortCode: string;
  shortCodeHint?: string;
  fields: TicketPdfField[];
  extraTitle?: string;
  extras?: { name: string; bib?: string }[];
  footer: string;
};

let fontBytes: { regular: Buffer; bold: Buffer } | null = null;

async function loadFontBytes() {
  if (fontBytes) return fontBytes;
  const dir = path.join(process.cwd(), "public", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "NotoSans-Regular.ttf")),
    readFile(path.join(dir, "NotoSans-Bold.ttf")),
  ]);
  fontBytes = { regular, bold };
  return fontBytes;
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\s+/g, " ").trim() ? text.split(/\n/) : [""];
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0]!;
    for (const word of words.slice(1)) {
      const trial = `${current} ${word}`;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) current = trial;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

function drawLines(
  page: PDFPage,
  lines: string[],
  opts: { x: number; y: number; size: number; font: PDFFont; color: RGB; lineHeight?: number },
) {
  const lh = opts.lineHeight ?? opts.size * 1.28;
  let y = opts.y;
  for (const line of lines) {
    if (line) {
      page.drawText(line, { x: opts.x, y, size: opts.size, font: opts.font, color: opts.color });
    }
    y -= lh;
  }
  return y;
}

export async function buildTicketPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const fonts = await loadFontBytes();
  const qrPng = await QRCode.toBuffer(input.qrPayload, {
    type: "png",
    width: 420,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold, qrImage] = await Promise.all([
    pdf.embedFont(fonts.regular, { subset: true }),
    pdf.embedFont(fonts.bold, { subset: true }),
    pdf.embedPng(qrPng),
  ]);

  const page = pdf.addPage([A4.width, A4.height]);
  const margin = 42;
  const cardX = margin;
  const cardW = A4.width - margin * 2;
  const pad = 22;
  const innerW = cardW - pad * 2;
  const headerColor = input.headerColor === "spruce" ? spruce : ember;
  const qrSize = 168;

  const titleLines = wrapLines(input.title, bold, 18, innerW);
  const headerH = 28 + titleLines.length * 22 + 16;
  const extras = input.extras ?? [];
  const fieldRows: TicketPdfField[][] = [];
  for (let i = 0; i < input.fields.length; ) {
    const field = input.fields[i]!;
    const next = input.fields[i + 1];
    if (field.span2 || !next || next.span2) {
      fieldRows.push([field]);
      i += 1;
    } else {
      fieldRows.push([field, next]);
      i += 2;
    }
  }

  let contentH = 36 + qrSize + 52;
  if (input.shortCodeHint) contentH += 12;
  contentH += 18;
  for (const row of fieldRows) {
    let rowH = 0;
    for (const field of row) {
      const colW = field.span2 || row.length === 1 ? innerW : (innerW - 16) / 2;
      const valueLines = wrapLines(field.value, bold, field.accent ? 22 : 11, colW);
      const h = 12 + valueLines.length * (field.accent ? 26 : 14) + (field.hint ? 12 : 0) + 10;
      rowH = Math.max(rowH, h);
    }
    contentH += rowH;
  }
  if (extras.length > 0) {
    contentH += 28 + extras.length * 16;
  }
  contentH += 28;

  const cardH = headerH + contentH;
  const cardY = Math.max(margin, (A4.height - cardH) / 2);

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: surface,
    borderColor: border,
    borderWidth: 1,
  });

  const headerY = cardY + cardH - headerH;
  page.drawRectangle({
    x: cardX,
    y: headerY,
    width: cardW,
    height: headerH,
    color: headerColor,
  });

  page.drawText(input.eyebrow.toUpperCase(), {
    x: cardX + pad,
    y: cardY + cardH - 22,
    size: 8,
    font: bold,
    color: white,
  });
  drawLines(page, titleLines, {
    x: cardX + pad,
    y: cardY + cardH - 44,
    size: 18,
    font: bold,
    color: white,
    lineHeight: 22,
  });

  let y = headerY - 28;
  const qrX = cardX + (cardW - qrSize) / 2;
  page.drawImage(qrImage, {
    x: qrX,
    y: y - qrSize,
    width: qrSize,
    height: qrSize,
  });
  y -= qrSize + 14;

  const hintLines = wrapLines(input.qrHint, regular, 8, innerW);
  y = drawLines(page, hintLines, {
    x: cardX + pad + (innerW - regular.widthOfTextAtSize(hintLines[0] ?? "", 8)) / 2,
    y,
    size: 8,
    font: regular,
    color: inkFaint,
  });
  y -= 8;

  const codeLabelW = bold.widthOfTextAtSize(input.shortCodeLabel.toUpperCase(), 7);
  page.drawText(input.shortCodeLabel.toUpperCase(), {
    x: cardX + pad + (innerW - codeLabelW) / 2,
    y,
    size: 7,
    font: bold,
    color: inkFaint,
  });
  y -= 18;
  const codeW = bold.widthOfTextAtSize(input.shortCode, 18);
  page.drawText(input.shortCode, {
    x: cardX + pad + (innerW - codeW) / 2,
    y,
    size: 18,
    font: bold,
    color: ink,
  });
  y -= 14;
  if (input.shortCodeHint) {
    const hintW = regular.widthOfTextAtSize(input.shortCodeHint, 7);
    page.drawText(input.shortCodeHint, {
      x: cardX + pad + (innerW - hintW) / 2,
      y,
      size: 7,
      font: regular,
      color: inkFaint,
    });
    y -= 12;
  }

  y -= 8;
  page.drawLine({
    start: { x: cardX, y },
    end: { x: cardX + cardW, y },
    thickness: 0.75,
    color: border,
  });
  y -= 22;

  const colGap = 16;
  const colW = (innerW - colGap) / 2;
  for (const row of fieldRows) {
    const left = row[0]!;
    const right = row[1];
    const leftW = right ? colW : innerW;
    const leftValueSize = left.accent ? 22 : 11;
    const leftValues = wrapLines(left.value, bold, leftValueSize, leftW);
    let leftH = 11 + leftValues.length * (left.accent ? 26 : 14) + (left.hint ? 12 : 0);
    let rightH = 0;
    let rightValues: string[] = [];
    if (right) {
      const rightValueSize = right.accent ? 22 : 11;
      rightValues = wrapLines(right.value, bold, rightValueSize, colW);
      rightH = 11 + rightValues.length * (right.accent ? 26 : 14) + (right.hint ? 12 : 0);
    }
    const rowH = Math.max(leftH, rightH);

    page.drawText(left.label, {
      x: cardX + pad,
      y,
      size: 8,
      font: regular,
      color: inkFaint,
    });
    drawLines(page, leftValues, {
      x: cardX + pad,
      y: y - 16,
      size: leftValueSize,
      font: bold,
      color: left.accent ? ember : ink,
      lineHeight: left.accent ? 26 : 14,
    });
    if (left.hint) {
      page.drawText(left.hint, {
        x: cardX + pad,
        y: y - 16 - leftValues.length * (left.accent ? 26 : 14) - 2,
        size: 8,
        font: regular,
        color: inkSoft,
      });
    }

    if (right) {
      const rx = cardX + pad + colW + colGap;
      page.drawText(right.label, {
        x: rx,
        y,
        size: 8,
        font: regular,
        color: inkFaint,
      });
      const rightValueSize = right.accent ? 22 : 11;
      drawLines(page, rightValues, {
        x: rx,
        y: y - 16,
        size: rightValueSize,
        font: bold,
        color: right.accent ? ember : ink,
        lineHeight: right.accent ? 26 : 14,
      });
      if (right.hint) {
        page.drawText(right.hint, {
          x: rx,
          y: y - 16 - rightValues.length * (right.accent ? 26 : 14) - 2,
          size: 8,
          font: regular,
          color: inkSoft,
        });
      }
    }

    y -= rowH + 6;
  }

  if (input.extraTitle && extras.length > 0) {
    y -= 4;
    page.drawLine({
      start: { x: cardX, y: y + 12 },
      end: { x: cardX + cardW, y: y + 12 },
      thickness: 0.75,
      color: border,
    });
    page.drawText(input.extraTitle.toUpperCase(), {
      x: cardX + pad,
      y,
      size: 7,
      font: bold,
      color: inkFaint,
    });
    y -= 16;
    for (const extra of extras) {
      page.drawText(extra.name, {
        x: cardX + pad,
        y,
        size: 10,
        font: bold,
        color: ink,
      });
      if (extra.bib) {
        const bibW = regular.widthOfTextAtSize(extra.bib, 10);
        page.drawText(extra.bib, {
          x: cardX + cardW - pad - bibW,
          y,
          size: 10,
          font: regular,
          color: inkFaint,
        });
      }
      y -= 16;
    }
  }

  page.drawLine({
    start: { x: cardX, y: cardY + 28 },
    end: { x: cardX + cardW, y: cardY + 28 },
    thickness: 0.75,
    color: border,
  });
  const footerW = regular.widthOfTextAtSize(input.footer, 8);
  page.drawText(input.footer, {
    x: cardX + (cardW - footerW) / 2,
    y: cardY + 12,
    size: 8,
    font: regular,
    color: inkFaint,
  });

  return pdf.save();
}

export function ticketPdfHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
