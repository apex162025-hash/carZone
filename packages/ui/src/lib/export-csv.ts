export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Downloads rows as a UTF-8 CSV. The BOM makes Excel open Arabic text
 * correctly instead of showing mojibake.
 */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((c) => escapeCell(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(",")),
  ];
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
