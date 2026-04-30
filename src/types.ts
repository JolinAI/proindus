export type Classification = "PERSON" | "COMPANY" | "UNKNOWN";

export type RowStatus =
  | "pending"
  | "processing"
  | "found"
  | "not_found"
  | "excluded"
  | "error";

export interface SourceRow {
  /** 1-based original row number in the Excel sheet (header is row 1). */
  rowNumber: number;
  /** Column D — Holder/company name. */
  holder: string;
  /** Column E — Destination column for the email result. */
  existingEmail: string;
  /** Column F — Date / period (used in output filename). */
  period: string;
  /** Column G — Brand or reference associated with the holder. */
  brand: string;
  /** Full raw row, kept so we can rewrite the workbook later. */
  raw: (string | number | null)[];
}

export interface ProcessedResult {
  rowNumber: number;
  holder: string;
  brand: string;
  period: string;
  classification: Classification;
  email: string;
  status: RowStatus;
  message?: string;
  timestamp: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: "info" | "success" | "warn" | "error";
  message: string;
}

export interface PersistedSession {
  fileName: string | null;
  results: Record<number, ProcessedResult>;
  lastProcessedRow: number;
}
