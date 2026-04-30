import * as XLSX from "xlsx";
import type { ProcessedResult, SourceRow } from "../types";

/**
 * Excel column letters → zero-based array indices.
 * D=3, E=4, F=5, G=6
 */
const COL = {
  HOLDER: 3, // D
  EMAIL: 4, // E
  PERIOD: 5, // F
  BRAND: 6, // G
} as const;

export interface ParsedWorkbook {
  workbook: XLSX.WorkBook;
  sheetName: string;
  rows: SourceRow[];
  headerRow: (string | number | null)[];
}

export async function readWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const headerRow = matrix[0] ?? [];
  const rows: SourceRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    const holder = String(row[COL.HOLDER] ?? "").trim();
    const brand = String(row[COL.BRAND] ?? "").trim();
    const period = String(row[COL.PERIOD] ?? "").trim();
    const existingEmail = String(row[COL.EMAIL] ?? "").trim();
    if (!holder && !brand) continue;
    rows.push({
      rowNumber: i + 1, // Excel 1-based, header is row 1
      holder,
      brand,
      period,
      existingEmail,
      raw: row,
    });
  }
  return { workbook, sheetName, rows, headerRow };
}

/**
 * Find the first row index (1-based, accounting for header) where column E is empty.
 * Returns the row number to start processing from. Falls back to row 2 if everything is empty.
 */
export function findFirstEmptyEmailRow(rows: SourceRow[]): number {
  for (const row of rows) {
    if (!row.existingEmail) return row.rowNumber;
  }
  // all rows have an email already — start at the row after the last one
  if (rows.length === 0) return 2;
  return rows[rows.length - 1].rowNumber + 1;
}

/**
 * Sanitize a string so it can be used in a filename.
 */
function sanitizeFileName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "vencimientos"
  );
}

export function buildOutputFileName(rows: SourceRow[]): string {
  const periods = Array.from(
    new Set(rows.map((r) => r.period).filter(Boolean))
  );
  const periodPart = periods.length === 1 ? periods[0] : periods.join("-");
  return `correos_${sanitizeFileName(periodPart || "vencimientos")}.xlsx`;
}

/**
 * Build the output workbook with a "Resultados" sheet:
 *   - top section: rows where a valid email was found
 *   - separator row
 *   - bottom section: rows with errors / exclusions / not found
 */
export function buildOutputWorkbook(
  source: ParsedWorkbook,
  results: Record<number, ProcessedResult>
): XLSX.WorkBook {
  const headerRow = source.headerRow.length
    ? source.headerRow
    : ["", "", "", "Titular", "Correo", "Periodo", "Marca"];

  const found: (string | number | null)[][] = [];
  const issues: (string | number | null)[][] = [];

  for (const row of source.rows) {
    const result = results[row.rowNumber];
    const newRow = [...row.raw];
    if (result) {
      newRow[COL.EMAIL] =
        result.status === "found" ? result.email : `(${result.status})`;
    }
    const isValid =
      !!result &&
      result.status === "found" &&
      typeof result.email === "string" &&
      result.email.includes("@") &&
      !result.email.toLowerCase().includes("error");
    if (isValid) found.push(newRow);
    else if (result) issues.push(newRow);
  }

  const separator = ["--- ERRORES / EXCLUSIONES / NO ENCONTRADOS ---"];
  const matrix: (string | number | null)[][] = [
    headerRow,
    ...found,
    [],
    separator,
    [],
    ...issues,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Resultados");
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(wb, fileName);
}
