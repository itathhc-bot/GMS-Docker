/**
 * Pure helpers for building Parts Request export rows.
 * Extracted so they can be tested without spinning up jsPDF / XLSX writers.
 */
import type { TFunction } from "i18next";

export interface ExportLine {
  request_number: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  status: string;
  location?: string | null;
}

export interface ExportGroup {
  job_number: string;
  vehicle: string;
  vehicle_make: string;
  lines: ExportLine[];
}

export interface ExportColumns {
  /** Include the inventory shelf/location column. */
  location: boolean;
  /** Include the SKU / part number column. */
  sku: boolean;
  /** Include the request status column. */
  status: boolean;
}

export const DEFAULT_EXPORT_COLUMNS: ExportColumns = {
  location: true,
  sku: true,
  status: true,
};

/**
 * Backwards-compatible options shape. Older callers pass `{ includeLocation }`.
 * Newer callers pass a full `columns` object.
 */
export type BuildRowsOpts =
  | { includeLocation: boolean; columns?: undefined }
  | { columns: ExportColumns; includeLocation?: undefined };

function resolveColumns(opts: BuildRowsOpts): ExportColumns {
  if ("columns" in opts && opts.columns) return opts.columns;
  return {
    ...DEFAULT_EXPORT_COLUMNS,
    location: !!opts.includeLocation,
  };
}

/**
 * Sanitize a cell value against CSV/Excel formula injection (CWE-1236).
 * Any string starting with =, +, -, @, TAB, or CR is prefixed with a single
 * quote so spreadsheet apps treat it as text, not a formula.
 */
export function sanitizeCell<T extends string | number>(value: T): T {
  if (typeof value !== "string") return value;
  return (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value) as T;
}

export function buildPartsExportRows(
  groups: ExportGroup[],
  t: TFunction,
  opts: BuildRowsOpts
): Array<Record<string, string | number>> {
  const cols = resolveColumns(opts);
  const rows: Array<Record<string, string | number>> = [];
  groups.forEach((g) => {
    g.lines.forEach((l) => {
      const row: Record<string, string | number> = {
        [t("parts.store.tableHead.request")]: l.request_number,
        [t("parts.store.tableHead.jobCard")]: g.job_number,
        [t("parts.store.tableHead.vehicle")]: `${g.vehicle_make} (${g.vehicle})`,
        [t("partsExtra.partName")]: l.part_name,
      };
      if (cols.sku) {
        row[t("partsExtra.skuPart")] = l.part_number || "—";
      }
      row[t("partsExtra.quantity")] = l.quantity;
      if (cols.location) {
        row[t("partsExtra.storeLocation")] =
          (l.location && l.location.trim()) || (t("parts.store.noLocation") as string);
      }
      if (cols.status) {
        row[t("parts.store.tableHead.status")] = l.status;
      }
      // Sanitize all string values against CSV/Excel formula injection.
      for (const key of Object.keys(row)) {
        row[key] = sanitizeCell(row[key]);
      }
      rows.push(row);
    });
  });
  return rows;
}
