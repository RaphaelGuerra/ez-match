import type { BankRecord } from "@/lib/types";
import { normalizeAmount, normalizeDate, pickByAlias, type RawCsvRow } from "@/lib/parsers/csv";

const mapping = {
  date: ["data", "horário", "horario", "date"],
  amount: ["valor", "amount"],
  description: ["descricao", "descrição", "origem", "description"],
};

export function parsePixRows(weekId: string, rows: RawCsvRow[]): Omit<BankRecord, "id">[] {
  return rows
    .map(
      (row) =>
        ({
          weekId,
          bankSource: "pix",
          date: normalizeDate(pickByAlias(row, mapping.date)),
          amount: normalizeAmount(pickByAlias(row, mapping.amount)),
          description: pickByAlias(row, mapping.description),
          rawRow: JSON.stringify(row),
        }) satisfies Omit<BankRecord, "id">,
    )
    .filter((row) => row.date && row.amount > 0);
}
