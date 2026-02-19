import type { BankRecord } from "@/lib/types";
import { normalizeAmount, normalizeDate, type RawCsvRow } from "@/lib/parsers/csv";

type GenericMapping = {
  date: string;
  amount: string;
  description?: string;
};

export function parseGenericRows(
  weekId: string,
  rows: RawCsvRow[],
  mapping: GenericMapping,
): Omit<BankRecord, "id">[] {
  return rows
    .map(
      (row) =>
        ({
          weekId,
          bankSource: "generic",
          date: normalizeDate(row[mapping.date] ?? ""),
          amount: normalizeAmount(row[mapping.amount] ?? ""),
          description: mapping.description ? row[mapping.description] ?? "" : "",
          rawRow: JSON.stringify(row),
        }) satisfies Omit<BankRecord, "id">,
    )
    .filter((row) => row.date && row.amount > 0);
}
