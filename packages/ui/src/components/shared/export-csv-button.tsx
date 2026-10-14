"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { downloadCsv, type CsvColumn } from "../../lib/export-csv";

type ExportCsvButtonProps<T> = {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[] | undefined;
  label?: string;
};

/** Exports the rows currently loaded (respects active filters). */
export function ExportCsvButton<T>({ filename, columns, rows, label = "تصدير CSV" }: ExportCsvButtonProps<T>) {
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={!rows?.length}
      onClick={() => {
        if (!rows?.length) return;
        downloadCsv(filename, columns, rows);
        toast.success(`تم تصدير ${rows.length} صف`);
      }}
    >
      <Download />
      {label}
    </Button>
  );
}
