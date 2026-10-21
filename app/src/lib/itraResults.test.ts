import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { parseItraRows, readItraSheet } from "./itraResults";

function workbookBuffer(rows: unknown[][], timeCell?: { row: number; col: number; serial: number; format: string }) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (timeCell) {
    const ref = XLSX.utils.encode_cell({ r: timeCell.row, c: timeCell.col });
    sheet[ref] = { t: "n", v: timeCell.serial, z: timeCell.format };
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Results");
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const header = ["Ranking", "Time", "Family name", "First name", "Gender", "Nationality", "Bib"];

test("imports an ITRA sheet with formatted finish times and stable columns", async () => {
  const serial = (4 * 3600 + 32 * 60 + 11) / 86400;
  const buffer = workbookBuffer(
    [
      header,
      [1, "04:32:11", "Ivanov", "Petr", "M", "KAZ", 101],
      [2, "5:01:02", "Kim", "Anna", "F", "KOR", 102],
      ["", "", "", "", "", "", ""],
      [3, "DNF", "Nursultan", "Ali", "M", "KAZ", "103"],
    ],
    { row: 1, col: 1, serial, format: "h:mm:ss" },
  );

  const parsed = parseItraRows(await readItraSheet(buffer));
  assert.ok(!("error" in parsed));
  if ("error" in parsed) return;
  assert.deepEqual(parsed.rows, [
    { bibNumber: 101, name: "Ivanov Petr", place: 1, time: "4:32:11", category: "M · KAZ" },
    { bibNumber: 102, name: "Kim Anna", place: 2, time: "5:01:02", category: "F · KOR" },
    { bibNumber: 103, name: "Nursultan Ali", place: 3, time: "DNF", category: "M · KAZ" },
  ]);
});

test("accepts a different column order and ignores a row without a bib", async () => {
  const buffer = workbookBuffer([
    ["Bib", "First name", "Family name", "Time", "Ranking"],
    [7, "Sara", "Lee", "1:02:03", 4],
    ["", "No", "Bib", "0:10:00", 5],
  ]);
  const parsed = parseItraRows(await readItraSheet(buffer));
  assert.ok(!("error" in parsed));
  if ("error" in parsed) return;
  assert.deepEqual(parsed.rows, [
    { bibNumber: 7, name: "Lee Sara", place: 4, time: "1:02:03", category: null },
  ]);
});

test("rejects a sheet without the ITRA columns, an empty sheet, and a sheet without result rows", async () => {
  assert.deepEqual(parseItraRows([["Name", "City"], ["Ann", "Ridder"]]), { error: "invalid" });
  assert.deepEqual(parseItraRows([["Ranking", "Bib"]]), { error: "empty_file" });
  assert.deepEqual(parseItraRows([]), { error: "empty_file" });
  assert.deepEqual(parseItraRows([header, ["", "", "", "", "", "", ""]]), { error: "no_rows" });
  await assert.rejects(() => readItraSheet(Buffer.alloc(0)));
  await assert.rejects(() => readItraSheet(Buffer.from("not-an-xlsx")));
});
