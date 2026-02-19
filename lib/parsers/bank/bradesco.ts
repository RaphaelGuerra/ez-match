import type { BankRecord } from "@/lib/types";
import { normalizeAmount, normalizeDate, pickByAlias, type RawCsvRow } from "@/lib/parsers/csv";

const mapping = {
  date: ["data", "data lançamento", "data lancamento", "date"],
  amount: ["valor", "crédito", "credito", "amount"],
  description: ["histórico", "historico", "descrição", "descricao", "description"],
};

export function parseBradescoRows(weekId: string, rows: RawCsvRow[]): Omit<BankRecord, "id">[] {
  return rows
    .map((row) => {
      const date = normalizeDate(pickByAlias(row, mapping.date));
      const amount = normalizeAmount(pickByAlias(row, mapping.amount));
      const description = pickByAlias(row, mapping.description);
      return {
        weekId,
        bankSource: "bradesco",
        date,
        amount,
        description,
        rawRow: JSON.stringify(row),
      } satisfies Omit<BankRecord, "id">;
    })
    .filter((row) => row.date && row.amount > 0);
}
