import type { BankRecord } from "@/lib/types";
import { normalizeAmount, normalizeDate, pickByAlias, type RawCsvRow } from "@/lib/parsers/csv";

const mapping = {
  date: ["data", "data pagamento", "data da venda", "date"],
  netAmount: ["valor liquido", "valor líquido", "net", "liquido"],
  grossAmount: ["valor bruto", "bruto", "gross"],
  fee: ["taxa", "fee"],
  description: ["descricao", "descrição", "bandeira", "description"],
};

export function parseCieloRows(weekId: string, rows: RawCsvRow[]): Omit<BankRecord, "id">[] {
  return rows
    .map((row) => {
      const date = normalizeDate(pickByAlias(row, mapping.date));
      const net = normalizeAmount(pickByAlias(row, mapping.netAmount));
      const gross = normalizeAmount(pickByAlias(row, mapping.grossAmount));
      const fee = normalizeAmount(pickByAlias(row, mapping.fee));
      const amount = net || Math.max(gross - fee, 0);

      return {
        weekId,
        bankSource: "cielo",
        date,
        amount,
        description: pickByAlias(row, mapping.description),
        rawRow: JSON.stringify(row),
      } satisfies Omit<BankRecord, "id">;
    })
    .filter((row) => row.date && row.amount > 0);
}
