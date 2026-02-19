import type { Entry } from "@/lib/types";
import {
  normalizeAmount,
  normalizeDate,
  pickByAlias,
  type RawCsvRow,
} from "@/lib/parsers/csv";

const DEFAULT_MAPPING = {
  date: ["date", "data", "data pagamento", "data da reserva"],
  amount: ["amount", "valor", "valor pago", "total"],
  guestName: ["guest_name", "hospede", "hóspede", "cliente", "nome"],
  reservationId: ["reservation_id", "reserva", "id reserva", "reserva #"],
  description: ["description", "descricao", "descrição", "historico", "histórico"],
};

type MappingOverride = {
  date?: string;
  amount?: string;
  guestName?: string;
  reservationId?: string;
  description?: string;
};

export function parsePmsRows(
  weekId: string,
  rows: RawCsvRow[],
  mappingOverride?: MappingOverride,
): Omit<Entry, "id">[] {
  return rows
    .map((row) => {
      const date = mappingOverride?.date
        ? row[mappingOverride.date] ?? ""
        : pickByAlias(row, DEFAULT_MAPPING.date);
      const amount = mappingOverride?.amount
        ? row[mappingOverride.amount] ?? ""
        : pickByAlias(row, DEFAULT_MAPPING.amount);

      const guestName = mappingOverride?.guestName
        ? row[mappingOverride.guestName] ?? ""
        : pickByAlias(row, DEFAULT_MAPPING.guestName);

      const reservationId = mappingOverride?.reservationId
        ? row[mappingOverride.reservationId] ?? ""
        : pickByAlias(row, DEFAULT_MAPPING.reservationId);

      const description = mappingOverride?.description
        ? row[mappingOverride.description] ?? ""
        : pickByAlias(row, DEFAULT_MAPPING.description);

      const normalizedDate = normalizeDate(date);
      const normalizedAmount = normalizeAmount(amount);

      return {
        weekId,
        date: normalizedDate,
        amount: normalizedAmount,
        guestName,
        reservationId,
        description,
        rawRow: JSON.stringify(row),
      } satisfies Omit<Entry, "id">;
    })
    .filter((row) => row.date && row.amount > 0 && !!row.guestName?.trim());
}
